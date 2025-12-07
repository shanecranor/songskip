export interface SpotifyHistoryObject {
    ts: string;
    platform: string;
    ms_played: number;
    conn_country: string;
    ip_addr: string;
    master_metadata_track_name: string | null;
    master_metadata_album_artist_name: string | null;
    master_metadata_album_album_name: string | null;
    spotify_track_uri: string | null;
    episode_name: string | null;
    episode_show_name: string | null;
    spotify_episode_uri: string | null;
    audiobook_title: string | null;
    audiobook_uri: string | null;
    audiobook_chapter_uri: string | null;
    audiobook_chapter_title: string | null;
    reason_start: string;
    reason_end: string;
    shuffle: boolean;
    skipped: boolean | null;
    offline: boolean;
    offline_timestamp: number;
    incognito_mode: boolean;
}

export type EngineType = 'duckdb' | 'arquero';

export interface BenchmarkResult {
    engine: EngineType;
    metric: 'burst' | 'streak';
    loadTime: number; // ms
    calcTime: number; // ms
    totalTime: number; // ms
    resultCount: number; // found N bursts/streaks
}

export type WorkerMessage =
    | { type: 'LOAD_DATA'; payload: Blob }
    | { type: 'RUN_METRICS' };

export type WorkerResponse =
    | { type: 'LOAD_DONE'; duration: number }
    | { type: 'METRICS_DONE'; metrics: { burst: BenchmarkResult; streak: BenchmarkResult } }
    | { type: 'ERROR'; error: string };
