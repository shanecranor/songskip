import * as duckdb from '@duckdb/duckdb-wasm';
import type { WorkerMessage, WorkerResponse } from '../types';

// Declare self for the worker context
declare const self: Worker;

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;
let initDuration = 0;
let ingestDuration = 0;

const initDuckDB = async () => {
    if (db) return;

    // Use specific bundles manually to avoid dynamic import issues in some Vite setups,
    // though for simplicity we can try the manual bundle selection if needed.
    // Ideally we use the jsdelivr CDN approach or serve files locally.
    // For this environment, we'll try the standard selectBundle.
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker = await duckdb.createWorker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    conn = await db.connect();
};

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type } = e.data;

    try {
        if (type === 'LOAD_DATA') {
            // Init time is essentially 0 for subsequent loads if we don't re-init, 
            // but effectively we might consider 'init' as 'loading the file content' vs 'ingesting into DB'.
            // Actually, for DuckDB, 'init' was the WASM load which happens once.
            // Let's track WASM init time separate likely? 
            // The current code calls initDuckDB() inside LOAD_DATA.

            const startInit = performance.now();
            await initDuckDB();
            const endInit = performance.now();
            initDuration = (initDuration === 0) ? (endInit - startInit) : 0; // Only count first init? Or just report 0 if already done.

            if (!conn || !db) throw new Error("DuckDB not initialized");

            const { payload } = e.data as { payload: Blob };
            const tableName = 'streaming_history';
            const fileName = 'data.json';

            const startIngest = performance.now();

            // Register the file
            await db.registerFileHandle(fileName, payload, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);

            // Create table from JSON
            await conn.query(`
                CREATE OR REPLACE TABLE ${tableName} AS 
                SELECT * FROM read_json_auto('${fileName}');
            `);

            // Check/Cast TS if needed (skipped for now as per previous logic)

            const endIngest = performance.now();
            ingestDuration = endIngest - startIngest;

            const response: WorkerResponse = {
                type: 'LOAD_DONE',
                duration: initDuration + ingestDuration
            };
            self.postMessage(response);

        } else if (type === 'RUN_METRICS') {
            if (!conn) throw new Error("Database not connected");

            // BURST METRIC
            // Definition: Users skipping 10 tracks within a 60-second window.
            // Logic: Filter skipped=true -> Look back 10 rows (including current) -> If diff < 60s, it's a burst.
            // Actually, "10 tracks within 60s" usually means current track N and track N-9 have a time diff <= 60s.

            const startBurst = performance.now();

            // We need to parse 'ts' if it's string.
            // Let's assume it is TIMESTAMP or cast it.
            // "skipping 10 tracks" -> window size 10. 
            // We want to count HOW MANY such events occur or just flag them?
            // "Metric 1: Burst Skipping... Calculate..." pattern usually implies counting them or finding them.
            // Let's count the number of rows that satisfy the condition (marking the END of a burst).

            const burstQuery = `
                WITH skips AS (
                    SELECT 
                        ts::TIMESTAMP as ts,
                        skipped
                    FROM streaming_history
                    WHERE skipped = true
                ),
                lagged AS (
                    SELECT 
                        ts,
                        LAG(ts, 9) OVER (ORDER BY ts) as prev_ts
                    FROM skips
                )
                SELECT count(*) as count
                FROM lagged
                WHERE prev_ts IS NOT NULL 
                  AND date_diff('second', prev_ts, ts) <= 60;
            `;

            const burstResult = await conn.query(burstQuery);
            const burstCount = Number(burstResult.toArray()[0]['count']);
            const endBurst = performance.now();

            // STREAK METRIC
            // Definition: A consecutive sequence of tracks where skipped=true. Size >= 10.

            const startStreak = performance.now();

            // Gaps and Islands for streaks
            // We care about consecutive rows in the original table order (assuming table is ordered by TS or original insertion?)
            // The table from JSON should preserve order. To be safe, we should order by TS.

            const streakQuery = `
                WITH marked AS (
                    SELECT 
                        skipped,
                        row_number() OVER (ORDER BY ts::TIMESTAMP) - 
                        row_number() OVER (PARTITION BY skipped ORDER BY ts::TIMESTAMP) as grp
                    FROM streaming_history
                ),
                groups AS (
                    SELECT count(*) as size
                    FROM marked
                    WHERE skipped = true
                    GROUP BY grp
                )
                SELECT count(*) as count
                FROM groups
                WHERE size >= 10;
            `;

            const streakResult = await conn.query(streakQuery);
            const streakCount = Number(streakResult.toArray()[0]['count']);
            const endStreak = performance.now();

            // Since we ran them sequentially for the benchmark, we sum the calc times?
            // Or we treat them as separate results.
            // The Result interface expects a distinction.
            // Let's return them.

            const response: WorkerResponse = {
                type: 'METRICS_DONE',
                metrics: {
                    burst: {
                        engine: 'duckdb',
                        metric: 'burst',
                        initTime: initDuration,
                        ingestTime: ingestDuration,
                        loadTime: initDuration + ingestDuration,
                        calcTime: endBurst - startBurst,
                        totalTime: (initDuration + ingestDuration) + (endBurst - startBurst),
                        resultCount: burstCount
                    },
                    streak: {
                        engine: 'duckdb',
                        metric: 'streak',
                        initTime: initDuration,
                        ingestTime: ingestDuration,
                        loadTime: initDuration + ingestDuration,
                        calcTime: endStreak - startStreak,
                        totalTime: (initDuration + ingestDuration) + (endStreak - startStreak),
                        resultCount: streakCount
                    }
                }
            };
            self.postMessage(response);
        }
    } catch (err: any) {
        self.postMessage({ type: 'ERROR', error: err.message });
    }
};
