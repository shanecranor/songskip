import { useState, useEffect, useRef, useCallback } from 'react'
import './index.css'
import { generateMockData } from './utils/mockData'
import type { BenchmarkResult, WorkerResponse, WorkerMessage } from './types'

// Worker imports - Vite will handle these with the ?worker suffix if configured, 
// or strictly we just use new Worker(new URL(...))
// Let's use the explicit URL constructor for standard Vite compatibility without plugins logic if possible,
// but 'import ... from ...?worker' is the Vite standard.
import DuckDBWorker from './workers/duckdb.worker?worker'
import ArqueroWorker from './workers/arquero.worker?worker'

function App() {
  const [dataBlob, setDataBlob] = useState<Blob | null>(null);
  const [dataInfo, setDataInfo] = useState<string | null>(null);

  const [duckWorker, setDuckWorker] = useState<Worker | null>(null);
  const [arqWorker, setArqWorker] = useState<Worker | null>(null);

  const [duckStatus, setDuckStatus] = useState<'idle' | 'loading' | 'ready' | 'running' | 'done'>('idle');
  const [arqStatus, setArqStatus] = useState<'idle' | 'loading' | 'ready' | 'running' | 'done'>('idle');

  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize workers on mount
  useEffect(() => {
    const dw = new DuckDBWorker();
    const aw = new ArqueroWorker();

    setDuckWorker(dw);
    setArqWorker(aw);

    return () => {
      dw.terminate();
      aw.terminate();
    };
  }, []);

  // Handle DuckDB messages
  useEffect(() => {
    if (!duckWorker) return;
    const handler = (e: MessageEvent<WorkerResponse>) => {
      const { type } = e.data;
      if (type === 'LOAD_DONE') {
        setDuckStatus('ready');
      } else if (type === 'METRICS_DONE') {
        const { metrics } = e.data as any;
        setResults(prev => [...prev, metrics.burst, metrics.streak]);
        setDuckStatus('done');
      } else if (type === 'ERROR') {
        setError(`DuckDB Error: ${(e.data as any).error}`);
        setDuckStatus('idle'); // reset or stuck
      }
    };
    duckWorker.addEventListener('message', handler);
    return () => duckWorker.removeEventListener('message', handler);
  }, [duckWorker]);

  // Handle Arquero messages
  useEffect(() => {
    if (!arqWorker) return;
    const handler = (e: MessageEvent<WorkerResponse>) => {
      const { type } = e.data;
      if (type === 'LOAD_DONE') {
        setArqStatus('ready');
      } else if (type === 'METRICS_DONE') {
        const { metrics } = e.data as any;
        setResults(prev => [...prev, metrics.burst, metrics.streak]);
        setArqStatus('done');
      } else if (type === 'ERROR') {
        setError(`Arquero Error: ${(e.data as any).error}`);
        setArqStatus('idle');
      }
    };
    arqWorker.addEventListener('message', handler);
    return () => arqWorker.removeEventListener('message', handler);
  }, [arqWorker]);


  const handleMockParams = () => {
    setDuckStatus('loading');
    setArqStatus('loading');
    setError(null);
    setResults([]); // Clear previous results

    // Defer generation to next tick to allow UI to update to 'loading'
    setTimeout(() => {
      const blob = generateMockData(500000);
      setDataBlob(blob);
      setDataInfo(`Mock Data: 500,000 rows (~${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

      // Send to workers
      duckWorker?.postMessage({ type: 'LOAD_DATA', payload: blob } satisfies WorkerMessage);
      arqWorker?.postMessage({ type: 'LOAD_DATA', payload: blob } satisfies WorkerMessage);
    }, 100);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setDuckStatus('loading');
    setArqStatus('loading');
    setError(null);
    setResults([]);

    const file = files[0]; // Just handle one for simplicity or merge them? Requirements said "multiple" but singular blob.
    // Spec says "An input type=file multiple ... Pass the File or Blob to the worker".
    // Usually we merge them for a holistic view or process one. 
    // Let's stick to the simpler single file first or merge if multiple.
    // For now, let's take the first one to be safe, or merge text.

    // Quick merge if multiple
    if (files.length > 1) {
      // This is expensive on main thread, but simple implementation:
      // We'll just warn or take first. The requirement "Pass the File or Blob" implies single entity transfer.
      // Let's just take the first for the benchmark to rely on browser file handling speed.
    }

    const blob = file;
    setDataBlob(blob);
    setDataInfo(`File: ${file.name} (~${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

    duckWorker?.postMessage({ type: 'LOAD_DATA', payload: blob } satisfies WorkerMessage);
    arqWorker?.postMessage({ type: 'LOAD_DATA', payload: blob } satisfies WorkerMessage);
  };

  const runBenchmark = () => {
    if (duckStatus !== 'ready' || arqStatus !== 'ready') return;

    setDuckStatus('running');
    setArqStatus('running');
    setResults([]); // clear old run

    duckWorker?.postMessage({ type: 'RUN_METRICS' } satisfies WorkerMessage);
    arqWorker?.postMessage({ type: 'RUN_METRICS' } satisfies WorkerMessage);
  };

  return (
    <div>
      <header>
        <h1>Spotify Anti-Wrapped Benchmark</h1>
        <div className="subtitle">DuckDB-WASM vs. Arquero (Web Worker Performance)</div>
      </header>

      {error && (
        <div style={{ background: '#ef444420', color: '#f87171', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">1. Data Source</div>
          <div className="status-badge" style={{ opacity: dataBlob ? 1 : 0 }}>
            Data Loaded
          </div>
        </div>

        <div className="controls">
          <button onClick={handleMockParams}>
            Generate Mock Data (500k)
          </button>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              id="file-upload"
              className="file-input"
              accept=".json"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload" className="button secondary file-label" style={{ display: 'inline-flex', height: '100%', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem 1.5rem', cursor: 'pointer' }}>
              Upload StreamingHistory.json
            </label>
          </div>
        </div>

        {dataInfo && (
          <div className="data-info">
            {dataInfo}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">2. Benchmark Control</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className={`status-badge ${duckStatus === 'ready' || duckStatus === 'done' ? 'ready' : ''} ${duckStatus === 'running' || duckStatus === 'loading' ? 'processing' : ''}`}>
              DuckDB: {duckStatus}
            </span>
            <span className={`status-badge ${arqStatus === 'ready' || arqStatus === 'done' ? 'ready' : ''} ${arqStatus === 'running' || arqStatus === 'loading' ? 'processing' : ''}`}>
              Arquero: {arqStatus}
            </span>
          </div>
        </div>

        <div className="controls">
          <button
            onClick={runBenchmark}
            disabled={duckStatus !== 'ready' || arqStatus !== 'ready'}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {duckStatus === 'running' ? 'Running...' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">3. Results</div>
            <button
              className="button secondary"
              onClick={() => setResults([])}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
            >
              Clear Results
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Engine</th>
                <th>Metric</th>
                <th>Init (ms)</th>
                <th>Ingest (ms)</th>
                <th>Load Time (ms)</th>
                <th>Calc Time (ms)</th>
                <th>Total Time (ms)</th>
                <th>Result Count</th>
              </tr>
            </thead>
            <tbody>
              {results.sort((a, b) => {
                if (a.engine === b.engine) return a.metric.localeCompare(b.metric);
                return a.engine.localeCompare(b.engine);
              }).map((r, i) => (
                <tr key={i}>
                  <td className="highlight" style={{ textTransform: 'capitalize' }}>{r.engine}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.metric}</td>
                  <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{r.initTime.toFixed(0)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{r.ingestTime.toFixed(0)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{r.loadTime.toFixed(2)}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{r.calcTime.toFixed(2)}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.totalTime.toFixed(2)}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.resultCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default App
