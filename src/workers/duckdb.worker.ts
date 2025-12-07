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

    // REVERTING TO JSDELIVR (CDN) APPROACH
    // Why? The @duckdb/duckdb-wasm npm package does NOT include the specific Wasm extension files 
    // (like json.duckdb_extension.wasm) required for features like `read_json_auto`.
    // These extensions are hosted on extensions.duckdb.org.
    // By using getJsDelivrBundles(), we allow DuckDB to automatically configure itself to fetch 
    // the correct extensions from the CDN that match the loaded Wasm version.
    // A pure-local setup would require manually downloading and managing these binary extension files,
    // which is fragile and error-prone.

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
        if (type === 'INITIALIZE') {
            const startInit = performance.now();
            await initDuckDB();
            const endInit = performance.now();
            initDuration = endInit - startInit;
            self.postMessage({ type: 'LOAD_DONE', duration: 0 }); // Ack

        } else if (type === 'LOAD_DATA') {
            // Ensure initialized if not already (fallback)
            if (!db) {
                const startInit = performance.now();
                await initDuckDB();
                const endInit = performance.now();
                initDuration = endInit - startInit;
            }

            if (!conn || !db) throw new Error("DuckDB not initialized");

            const { payload } = e.data as { payload: Blob };
            const tableName = 'streaming_history';
            const fileName = 'data.json';

            const startIngest = performance.now();

            // Register the file
            await db.registerFileHandle(fileName, payload, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);

            // Create table from JSON using available extension (CDN)
            await conn.query(`
                CREATE OR REPLACE TABLE ${tableName} AS 
                SELECT * FROM read_json_auto('${fileName}');
            `);

            // Create Materialized View for "Skipped" tracks
            // We pre-calculate row_number() on the full table to perform Gaps-and-Islands later (Streak metric)
            // This mirrors the Arquero "Data Warehouse" optimization.
            // CAREFUL: row_number() must be calculated on the FULL table before filtering, otherwise we lose the gaps!
            // In SQL, Window Functions happen after WHERE. So we need a subquery or CTE.

            // OPTIMIZATION ROUND 3: Pre-calculate Window Functions (Lag, Subset Row Number)
            // We calculate 'subset_rn' (row number within the skipped set) and 'prev_ts' (lag 9) here.
            // This moves ALL computational complexity to Ingest. Calc becomes a simple scan.

            await conn.query(`
                CREATE OR REPLACE TABLE skipped_history AS 
                SELECT 
                    *,
                    row_number() OVER (ORDER BY ts) as subset_rn,
                    lag(ts, 9) OVER (ORDER BY ts) as prev_ts_9
                FROM (
                    SELECT 
                        ts::TIMESTAMP as ts,
                        skipped,
                        row_number() OVER (ORDER BY ts) as overall_rn
                    FROM ${tableName}
                )
                WHERE skipped = true
                ORDER BY ts;
            `);

            const endIngest = performance.now();
            ingestDuration = endIngest - startIngest;

            self.postMessage({ type: 'LOAD_DONE', duration: ingestDuration });

        } else if (type === 'RUN_METRICS') {
            if (!conn || !db) throw new Error("Database not initialized or data not loaded");

            // BURST METRIC
            // Querying the pre-filtered, pre-sorted 'skipped_history' table.

            const startBurst = performance.now();

            const burstResult = await conn.query(`
                SELECT count(*) as count
                FROM skipped_history
                WHERE prev_ts_9 IS NOT NULL 
                  AND (date_diff('ms', prev_ts_9, ts) <= 60000);
            `);

            // Note: date_diff in ms. 
            // We removed ::TIMESTAMP casts because the column is NOW a native TIMESTAMP.

            const burstCount = Number(burstResult.toArray()[0]['count']);
            const endBurst = performance.now();

            // STREAK METRIC
            // Using the pre-calculated overall_rn from Ingest phase.

            const startStreak = performance.now();

            const streakResult = await conn.query(`
                WITH group_counts AS (
                    SELECT count(*) as size
                    FROM skipped_history
                    GROUP BY (overall_rn - subset_rn)
                )
                SELECT count(*) as count
                FROM group_counts
                WHERE size >= 10;
            `);

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
                        loadTime: ingestDuration, // Total Effective Load Time (Init excluded from Benchmark)
                        calcTime: endBurst - startBurst,
                        totalTime: ingestDuration + (endBurst - startBurst),
                        resultCount: burstCount
                    },
                    streak: {
                        engine: 'duckdb',
                        metric: 'streak',
                        initTime: initDuration,
                        ingestTime: ingestDuration,
                        loadTime: ingestDuration,
                        calcTime: endStreak - startStreak,
                        totalTime: ingestDuration + (endStreak - startStreak),
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
