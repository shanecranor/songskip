import type { SpotifyHistoryObject } from '../types';

export const generateMockData = (rowCount: number = 500000): Blob => {
    const data: SpotifyHistoryObject[] = [];
    const baseTime = new Date('2023-01-01T00:00:00Z').getTime();

    // Pre-allocate some reusable strings to avoid massive GC churn during generation (though V8 is good at this)
    const tracks = ['Song A', 'Song B', 'Song C', 'Song D', 'Song E'];
    const artists = ['Artist 1', 'Artist 2', 'Artist 3'];

    for (let i = 0; i < rowCount; i++) {
        // Increment time slightly for each row (approx 3 mins per track on average)
        const currentTime = new Date(baseTime + i * 3 * 60 * 1000); // 3 minutes gap

        // Inject logical patterns for testing metrics

        // Pattern 1: Burst (10+ skips in < 60s)
        // Let's inject a burst every 10,000 rows
        const isBurstMode = i % 10000 < 12; // first 12 of the block

        // Pattern 2: Streak (10+ consecutive skips)
        // Let's inject a streak every 25,000 rows, overlapping or distinct
        const isStreakMode = i % 25000 < 15; // 15 consecutive skips

        // Logic to determine 'skipped' and timestamp
        let skipped = Math.random() > 0.8; // default 20% skip rate
        let timestamp = currentTime.toISOString();

        if (isBurstMode) {
            skipped = true;
            // Burst needs tight timestamps. 
            // If i % 10000 is 0, it's the start.
            // We want i=0 to i=11 to be within 60s. 
            // So we override the loop's large time increment for these specific rows.
            const burstOffset = (i % 10000) * 1000; // 1 second apart
            timestamp = new Date(baseTime + (i - i % 10000) * 3 * 60 * 1000 + burstOffset).toISOString();
        } else if (isStreakMode) {
            skipped = true;
        }

        const row: SpotifyHistoryObject = {
            ts: timestamp,
            platform: "web",
            ms_played: skipped ? 1000 : 180000,
            conn_country: "US",
            ip_addr: "127.0.0.1",
            master_metadata_track_name: tracks[i % tracks.length],
            master_metadata_album_artist_name: artists[i % artists.length],
            master_metadata_album_album_name: "Mock Album",
            spotify_track_uri: `spotify:track:mock${i}`,
            episode_name: null,
            episode_show_name: null,
            spotify_episode_uri: null,
            audiobook_title: null,
            audiobook_uri: null,
            audiobook_chapter_uri: null,
            audiobook_chapter_title: null,
            reason_start: "clickrow",
            reason_end: skipped ? "fwdbtn" : "trackdone",
            shuffle: false,
            skipped: skipped,
            offline: false,
            offline_timestamp: 0,
            incognito_mode: false
        };

        data.push(row);
    }

    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
};
