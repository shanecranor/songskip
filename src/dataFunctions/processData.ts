import { SpotifyStreamingData } from "@/types";
import { desc, from, op, range } from "arquero";
export interface ProcessedData {
  totals: { skips: number; fwdbtnCount: number; count: number };
  skipability: (SpotifyStreamingData & ComputedCol)[];
  fastSkips: (SpotifyStreamingData & ComputedCol)[];
}
interface ComputedCol {
  skipability: number;
  skips: number;
  fwdBtnCount: number;
  suffered: number;
  timeToSkip: number;
  totalPlays: number;
}
export function processData(
  spotifyData: SpotifyStreamingData[]
): ProcessedData {
  const dt = from(spotifyData);
  const totals = dt
    .rollup({
      skips: op.sum("skipped"),
      fwdbtnCount: (d) =>
        op.sum(d.reason_end === "fwdbtn" && !d.skipped ? 1 : 0),
      count: op.count(),
    })
    .objects()[0];
  //loading screen
  //unzipping
  //loading into arquero
  //processing data
  //you skipped 18% of the songs you listened to this year
  //find out which songs you hated the most
  //which songs did you skip (on average) the fastest
  const badSongs = dt
    .groupby("master_metadata_track_name", "master_metadata_album_artist_name")
    .rollup({
      totalPlays: op.count(),
      skips: op.sum("skipped"),
      fwdbtnCount: (d) =>
        op.sum(d.reason_end === "fwdbtn" && !d.skipped ? 1 : 0),
      suffered: (d) => op.sum(d.ms_played || 0) * 0.001,
      timeToSkip: (d) => op.mean(d.ms_played || 0) * 0.001,
    })
    .filter((d) => d.totalPlays > 3)
    .derive({ skipability: (d) => d.skips / d.totalPlays })
    .filter((d) => d.skipability > 0.48);

  console.log("BAD SONGS", badSongs.objects());

  const skipability = badSongs
    .orderby(desc("skipability"), desc("totalPlays"))
    .objects()
    .slice(0, 5);

  console.log("SKIPABILITY", skipability);

  const fastSkips = badSongs.orderby("timeToSkip").objects().slice(0, 5);

  console.log("FAST SKIPS", fastSkips);

  return { totals, skipability, fastSkips };
}
