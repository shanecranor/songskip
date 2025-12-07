Project Spec: Spotify Anti-Wrapped Benchmark (DuckDB vs. Arquero)
1. Project Overview

Build a client-side performance benchmark application using React, TypeScript, and Vite. The goal is to compare two data processing engines—DuckDB-WASM and Arquero—running strictly inside Web Workers.

The application must process Spotify GDPR StreamingHistory data to calculate two complex "Anti-Wrapped" metrics: Skip Bursts and Skip Streaks.
2. Technical Stack

    Build Tool: Vite (React + TypeScript)

    Engine A: @duckdb/duckdb-wasm (latest)

    Engine B: arquero (latest)

    Worker Management: Native Web Workers (no complex wrapper libraries like Comlink, keep it raw for performance clarity).

    Styling: Minimal (plain nested css or css modules, NO TAILWIND).

3. Core Requirements
A. Data Source Modes

The app must support two modes of data ingestion:

    Mock Generation: A button to generate a Blob containing 500,000 rows of JSON data (approx 10-15 years of history) directly in the browser.

    Real Data Upload: An <input type="file" multiple /> to accept actual Spotify Streaming_History_Audio_*.json files.

B. The Benchmark Tests

Both engines must implement the exact same logic.

Metric 1: Burst Skipping

    Definition: Users skipping 10 tracks within a 60-second window.

    Logic: Filter skipped=true → Look back 10 rows → If current_ts - prev_ts < 60s, it’s a burst.

Metric 2: Skip Streaks

    Definition: A consecutive sequence of tracks where skipped=true.

    Logic: Gaps-and-islands problem. Identify groups of consecutive skips, count the size, filter for size ≥ 10.

C. The "Fair" Architecture (Worker vs. Worker)

To ensure a fair comparison, the Main Thread must remain unblocked.

    Arquero Implementation:

        Spawn Worker.

        Pass the File or Blob object to the worker.

        Inside Worker: await file.text() → JSON.parse() → aq.from() → Calculate.

    DuckDB Implementation:

        Spawn Worker.

        Pass the File or Blob object to the worker.

        Inside Worker: Register file with DuckDB-WASM → CREATE TABLE ... FROM read_json_auto → Execute SQL.

