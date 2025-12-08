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
DuckDB optimizations
1.  **Ingest-Phase "Data Warehouse"**: Instead of calculation `lag()` and `row_number()` at query time (Calc), we pre-calculated these into a `skipped_history` table during ingestion.
2.  **Pre-Casting Timestamps**: Converting ISO strings (`2023-01-01T...`) to native `TIMESTAMP` types during ingestion saved massive amounts of CPU time during queries.
~~3. **COI multi-threading**:~~ This may or may not yield performance benefits, but because of the DuckDB-Wasm bug, it was not worth it to implement. Once this issue is fixed, it should be considered, although the github issue has been open for over a year now.  

### Issues using COI
There is a DuckDB-Wasm bug for the wasm_threads target. The threaded COI engine and the json extension module don't agree on whether the imported WebAssembly memory is shared, so extension loading fails. See: https://github.com/duckdb/duckdb-wasm/issues/1916

## Conclusion

### Pros of  **Arquero**:
-   Simple and lightweight
-   Fast for smaller datasets that fit comfortably in memory.
-   Fast ingest of data from JSON.
### Cons of **Arquero**:
-   No real typescript support
-   Memory intensive for larger datasets (data must be stored in JS objects in memory)
-   Slower for larger datasets after initial ingest.

### Pros of **DuckDB-WASM**:
-   Can query data larger than available RAM (DuckDB supports out-of-core processing with buffering)
-   Supports complex SQL: Recursive CTEs, complex joins, or window functions that are tedious to express in JS.
-   Parquet support.
-   Pretty fast for larger datasets after initial ingest.
### Cons of **DuckDB-WASM**:
-   More complex setup.
-   COI threading is buggy at time of writing.
-   Heavy WASM runtime overhead - not worth it for smaller datasets
