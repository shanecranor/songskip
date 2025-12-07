import * as aq from 'arquero';
import type { WorkerMessage, WorkerResponse } from '../types';

declare const self: Worker;

let table: aq.ColumnTable | null = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type } = e.data;

    try {
        if (type === 'LOAD_DATA') {
            const { payload } = e.data as { payload: Blob };

            const startLoad = performance.now();
            const text = await payload.text();
            const json = JSON.parse(text);

            // Arquero from() handles array of objects
            // We should ensure timestamps are parsed or parse them now
            // For fairness with DuckDB (which might auto-detect), we'll do explicit parsing
            // or let Arquero infer. Arquero infers usually.
            // But for math operations on dates, we usually need Date objects or numbers.
            // Let's preprocess the JSON to convert TS string to Date/Number or use a derive.
            // Using derive is more "engine-like".

            table = aq.from(json);

            // Convert 'ts' to Date objects (number) for calculations
            // and ensure 'skipped' is boolean
            table = table.derive({
                ts: (d: any) => aq.op.parse_date(d.ts), // Parse ISO string to timestamp number
                skipped: (d: any) => d.skipped === true // ensure boolean
            })
                .orderby('ts'); // Sort once during load

            const endLoad = performance.now();

            const response: WorkerResponse = {
                type: 'LOAD_DONE',
                duration: endLoad - startLoad
            };
            self.postMessage(response);

        } else if (type === 'RUN_METRICS') {
            if (!table) throw new Error("Table not loaded");

            const op = aq.op;

            // BURST METRIC
            // Filter skipped=true -> Look back 10 rows -> If diff <= 60s
            // window size 10 means lag 9.

            const startBurst = performance.now();

            // We need to sort by TS to be safe, though input is usually sorted.
            // DuckDB query included ORDER BY.

            const burstCount = table
                // .orderby('ts') // Already sorted in LOAD_DATA
                .filter((d: any) => d.skipped)
                .derive({
                    prev_ts: op.lag('ts', 9)
                })
                .filter((d: any) => d.prev_ts != null && (d.ts - d.prev_ts) <= 60000)
                .numRows();

            const endBurst = performance.now();

            // STREAK METRIC
            // Consecutive skipped=true >= 10.
            // Gaps and Islands approach using window functions:
            // grp = row_number() - rank() (partitioned by skipped? arquero has groupby)

            // Logic:
            // 1. Sort by TS.
            // 2. Calculate row_number (overall).
            // 3. Filter for skipped = true.
            // 4. Calculate row_number (within this filtered set).
            // 5. Diff = row_number_overall - row_number_filtered. 
            //    Consecutive items will have the SAME Diff.
            // 6. Groupby(Diff) -> count -> filter >= 10.

            const startStreak = performance.now();

            const streakCount = table
                // .orderby('ts') // Already sorted in LOAD_DATA
                .derive({
                    overall_rn: op.row_number()
                })
                .filter((d: any) => d.skipped)
                .derive({
                    subset_rn: op.row_number()
                })
                .derive({
                    diff: (d: any) => d.overall_rn - d.subset_rn
                })
                .groupby('diff')
                .count()
                .filter((d: any) => d.count >= 10)
                .numRows();

            const endStreak = performance.now();

            const response: WorkerResponse = {
                type: 'METRICS_DONE',
                metrics: {
                    burst: {
                        engine: 'arquero',
                        metric: 'burst',
                        loadTime: 0,
                        calcTime: endBurst - startBurst,
                        totalTime: endBurst - startBurst,
                        resultCount: burstCount
                    },
                    streak: {
                        engine: 'arquero',
                        metric: 'streak',
                        loadTime: 0,
                        calcTime: endStreak - startStreak,
                        totalTime: endStreak - startStreak,
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
