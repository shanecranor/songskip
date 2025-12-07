# Benchmark Findings: DuckDB-WASM vs. Arquero

## Executive Summary
For client-side analytics on mid-sized datasets (~500k - 1M rows), **Arquero** offers superior out-of-the-box performance and simpler setup. **DuckDB-WASM** can achieve competitive query speeds but requires significant optimization (materialized views, pre-calculation) and a more complex deployment environment (WASM bundles, security headers).

## Performance Comparison (Mock Data - 500k Rows)

| Metric | Arquero (Web Worker) | DuckDB-WASM (Web Worker) |
| :--- | :--- | :--- |
| **Init Time** | ~100ms (JSON Parse) | ~20ms (WASM Init - *eager*) |
| **Ingest Time** | ~250ms | ~400ms |
| **Calc Time (Burst)** | ~15ms | ~30ms |
| **Calc Time (Streak)**| ~15ms | ~45ms |
| **Peak Memory (Worker)** | ~220 MB | ~70 MB (67MB Runtime + 2MB Heap) |
| **Implementation** | Pure JS/Typescript | SQL + WASM Glue |

### Key Observations
1.  **Ingestion vs. Calculation**: Arquero creates the table structure very quickly from JSON. DuckDB requires "loading" data into the WASM virtual filesystem and then running `INSERT` or `CREATE TABLE AS`, which adds overhead.
2.  **Query Speed**: Once data is loaded and optimized (indexed/sorted), both engines are extremely fast (sub-50ms frames). DuckDB matches Arquero's speed after moving window function calculations to the Ingest phase using a Materialized View.
3.  **Memory Efficiency**:
    -   **Small Data (e.g., 12MB file)**: **Arquero wins**. It only uses ~12MB, whereas DuckDB has a fixed ~67MB WASM runtime overhead regardless of data size.
    -   **Medium/Large Data (e.g., 500k rows)**: **DuckDB wins**. It scales better, using only ~70MB total (compact columnar) while Arquero balloons to ~220MB due to JS object overhead.
    -   *Conclusion*: DuckDB has a higher "floor", but can scale further.

## Technical Insights

### DuckDB-WASM Optimizations
To make DuckDB competitive, we applied three optimizations:
1.  **Ingest-Phase "Data Warehouse"**: Instead of calculation `lag()` and `row_number()` at query time (Calc), we pre-calculated these into a `skipped_history` table during ingestion.
2.  **Pre-Casting Timestamps**: Converting ISO strings (`2023-01-01T...`) to native `TIMESTAMP` types during ingestion saved massive amounts of CPU time during queries.
3.  **COOP/COEP Headers**: Enabling `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` was essential to unlock `SharedArrayBuffer`, allowing DuckDB to use threads.

### The "Extension" Challenge
A minor annoyance is that extensions (like `json` and `parquet`) are not bundled in the NPM package so they must be loaded from a CDN instead of imported from an NPM package.


## Conclusion

### Choose **Arquero** if:
-   You are building a lightweight React/JS application.
-   Your dataset fits comfortably in memory.
-   You want simplicity
-   You prefer a functional, method-chaining API (`.filter().groupby().rollup()`).
-   You can live without full type safety.

### Choose **DuckDB-WASM** if:
-   You need to query data larger than available RAM (DuckDB supports out-of-core processing with buffering).
-   You need **Complex SQL**: Recursive CTEs, complex joins, or window functions that are tedious to express in JS.
-   You are processing **Parquet** files (DuckDB's native strength).