import * as aq from 'arquero';
import type { WorkerMessage, WorkerResponse } from '../types';

declare const self: Worker;

let table: aq.ColumnTable | null = null;
let skippedTable: aq.ColumnTable | null = null;
let initDuration = 0;
let ingestDuration = 0;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type } = e.data;

    try {
        if (type === 'LOAD_DATA') {
            const { payload } = e.data as { payload: Blob };

            const startInit = performance.now();
            const text = await payload.text();
            const json = JSON.parse(text);
            const endInit = performance.now();
            initDuration = endInit - startInit;

            const startIngest = performance.now();
            const op = aq.op;

            // Load, parse, sort, and index in one go (Data Warehouse style)
            table = aq.from(json)
                .derive({
                    ts: (d: any) => aq.op.parse_date(d.ts), // Parse ISO string to timestamp number
                    skipped: (d: any) => d.skipped === true // ensure boolean
                })
                .orderby('ts') // Sort once
                .derive({
                    overall_rn: op.row_number() // Pre-calculate row number for the whole dataset
                });

            // Create "Materialized View" for skipped items
            // This reduces working set size significantly for metrics that only care about skipped tracks
            skippedTable = table.filter((d: any) => d.skipped);

            const endIngest = performance.now();
            ingestDuration = endIngest - startIngest;

            const response: WorkerResponse = {
                type: 'LOAD_DONE',
                duration: initDuration + ingestDuration
            };
            self.postMessage(response);

        } else if (type === 'RUN_METRICS') {
            if (!table || !skippedTable) throw new Error("Table not loaded");

            const op = aq.op;

            // BURST METRIC
            // Filter skipped=true -> Look back 10 rows -> If diff <= 60s
            // window size 10 means lag 9.

            const startBurst = performance.now();

            // Use the materialized view 'skippedTable'
            // No need to filter(skipped) or sort(ts) again.

            const burstCount = skippedTable
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
            // 1. Sort by TS (Done in LOAD).
            // 2. Calculate row_number (overall) (Done in LOAD as 'overall_rn').
            // 3. Filter for skipped = true (Done in LOAD as 'skippedTable').
            // 4. Calculate row_number (within this filtered set).
            // 5. Diff = row_number_overall - row_number_filtered. 
            //    Consecutive items will have the SAME Diff.
            // 6. Groupby(Diff) -> count -> filter >= 10.

            const startStreak = performance.now();

            const streakCount = skippedTable
                .derive({
                    subset_rn: op.row_number()
                })
                // overall_rn is already present from load phase
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
                        initTime: initDuration,
                        ingestTime: ingestDuration,
                        loadTime: initDuration + ingestDuration,
                        calcTime: endBurst - startBurst,
                        totalTime: (initDuration + ingestDuration) + (endBurst - startBurst),
                        resultCount: burstCount
                    },
                    streak: {
                        engine: 'arquero',
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
