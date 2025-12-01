import { musicData$ } from "@/state";
export const Page2 = () => {
  const skips = musicData$.totals.skips.get() || 0;
  const totalSongs = musicData$.totals.count.get() || 0;
  if (totalSongs === 0 || skips === 0) {
    return;
  }
  return (
    <div>
      <h1>
        You <i>instantly</i> skipped these songs.
      </h1>
      <div className="song-list">
        {musicData$.fastSkips.get()?.map((d, i) => (
          <div key={d.master_metadata_track_name} className="song-list-item">
            <div className="song-details">
              <div className="song-name">{d.master_metadata_track_name}</div>
              <div className="artist-name">
                {d.master_metadata_album_artist_name}
              </div>
            </div>
            <div className="skip-time">{d.timeToSkip.toFixed(1)} secs</div>
          </div>
        ))}
      </div>
    </div>
  );
};
