import { SpotifyStreamingData } from "./types";
import { desc, from, op } from "arquero";
import data from "./2024.json";
export function processData(spotifyData: SpotifyStreamingData[]) {
  console.log("Processing data...");
  // console.log(spotifyData);
  // const dt = from(spotifyData);
  const dt = from(data as SpotifyStreamingData[]);
  dt.print(2);
  dt.rollup({ skips: op.sum("skipped"), count: op.count() }).print();
  //loading screen
  //unzipping
  //loading into arquero
  //processing data
  //you skipped 18% of the songs you listened to this year
  //find out which songs you hated the most
  //which songs did you skip (on average) the fastest
  dt.groupby("master_metadata_track_name")
    .rollup({
      total_plays: op.count(),
      skips: op.sum("skipped"),
      // fwdbtnCount: (d) => op.sum(d.reason_end === "fwdbtn" ? 1 : 0),
      // endplayCount: (d) => op.sum(d.reason_end === "endplay" ? 1 : 0),
      // trackdoneCount: (d) => op.sum(d.reason_end === "trackdone" ? 1 : 0),
      suffered: (d) => op.sum(d.ms_played * 0.001),
      time_to_skip: (d) => op.mean(d.ms_played) * 0.001,
    })
    .filter((d) => d.total_plays > 3)
    .derive({ skipability: (d) => d.skips / d.total_plays })
    .filter((d) => d.skipability > 0.48)
    // .orderby(desc("skipability"), desc("count"))
    .orderby("time_to_skip")
    .print(20);
}
