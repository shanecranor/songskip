import { musicData$ } from "@/state";
export const Page1 = () => {
  const skips = musicData$.totals.skips.get() || 0;
  const totalSongs = musicData$.totals.count.get() || 0;
  if (totalSongs === 0 || skips === 0) {
    return;
  }
  return (
    <div>
      <h1>Your least favorite songs:</h1>
      {musicData$.skipability.get()?.map((d) => (
        <div key={d.master_metadata_track_name}>
          <h3>{d.master_metadata_track_name}</h3>
          <p>
            You skipped this song {(d.skipability * 100).toFixed(1)}% of the{" "}
            {d.totalPlays} times you listened to it.
          </p>
        </div>
      ))}
    </div>
  );
};
