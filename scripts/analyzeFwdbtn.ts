#!/usr/bin/env node
import { readFile } from "fs/promises";
import { resolve } from "path";
import { unzipSync, strFromU8 } from "fflate";
import { escape, from, op } from "arquero";
import type { ColumnTable } from "arquero";

type PlaybackEvent = {
  ts?: string;
  reason_end?: string;
  reason_start?: string;
  skipped?: boolean | null;
  spotify_track_uri?: string | null;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  ms_played?: number | null;
  shuffle?: boolean | null;
  offline?: boolean | null;
  incognito_mode?: boolean | null;
};

type PlaybackEventWithFile = PlaybackEvent & {
  __file: string;
};

type PlaybackEventWithDuration = PlaybackEventWithFile & {
  duration_ms?: number | null;
  play_ratio?: number | null;
  skipped_bucket?: string;
};

const SAMPLE_LIMIT = 3;
const formatNumber = new Intl.NumberFormat("en-US");

const zipPath = resolve(process.cwd(), process.argv[2] ?? "spotify_data.zip");

async function loadEventsFromArchive(
  path: string
): Promise<PlaybackEventWithFile[]> {
  const zipBytes = await readFile(path);
  const entries = unzipSync(zipBytes);

  const events: PlaybackEventWithFile[] = [];
  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.toLowerCase().endsWith(".json")) {
      continue;
    }

    const text = strFromU8(bytes);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.warn(`Skipping ${name}; JSON parse failed:`, error);
      continue;
    }

    if (!Array.isArray(payload)) {
      console.warn(`Skipping ${name}; expected an array of events.`);
      continue;
    }

    for (const item of payload) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const event: PlaybackEventWithFile = {
        ...(item as PlaybackEvent),
        __file: name,
      };
      events.push(event);
    }
  }

  return events;
}

function summarizeFwdbtn(tableData: ColumnTable) {
  const fwdbtn = tableData.filter(
    (d: PlaybackEventWithFile) => d.reason_end === "fwdbtn"
  );
  const fwdbtnAndSkipped = fwdbtn.filter(
    (d: PlaybackEventWithFile) => d.skipped === true
  );
  const fwdbtnMismatch = fwdbtn.filter(
    (d: PlaybackEventWithFile) => d.skipped !== true
  );

  const skippedTrue = tableData.filter(
    (d: PlaybackEventWithFile) => d.skipped === true
  );
  const skippedTrueNotFwdbtn = skippedTrue.filter(
    (d: PlaybackEventWithFile) => d.reason_end !== "fwdbtn"
  );

  console.log("--- fwdbtn skip analysis ---");
  console.log(`Archive: ${zipPath}`);
  console.log(
    `Total playback records: ${formatNumber.format(tableData.numRows())}`
  );
  console.log(
    `reason_end === "fwdbtn": ${formatNumber.format(fwdbtn.numRows())}`
  );
  console.log(
    `  with skipped === true: ${formatNumber.format(fwdbtnAndSkipped.numRows())}`
  );
  console.log(
    `  with skipped !== true: ${formatNumber.format(fwdbtnMismatch.numRows())}`
  );

  console.log(
    `\nTotal skipped === true events (all reasons): ${formatNumber.format(skippedTrue.numRows())}`
  );
  console.log(
    `  of those with reason_end !== 'fwdbtn': ${formatNumber.format(skippedTrueNotFwdbtn.numRows())}`
  );

  const skippedReasonBreakdown = skippedTrue.groupby("reason_end").count();
  console.log("\nreason_end breakdown for skipped === true events:");
  (
    skippedReasonBreakdown.objects() as Array<{
      reason_end: string | null;
      count: number;
    }>
  ).forEach((row) => {
    const label = row.reason_end ?? "null";
    console.log(`  ${label}: ${formatNumber.format(row.count)}`);
  });

  const tableWithFlags = tableData.derive({
    shuffle_bucket: escape((d: PlaybackEventWithFile) => {
      if (d.shuffle === true) {
        return "shuffle_on";
      }
      if (d.shuffle === false) {
        return "shuffle_off";
      }
      return "shuffle_unknown";
    }),
    offline_bucket: escape((d: PlaybackEventWithFile) => {
      if (d.offline === true) {
        return "offline_true";
      }
      if (d.offline === false) {
        return "offline_false";
      }
      return "offline_unknown";
    }),
    skipped_numeric: escape((d: PlaybackEventWithFile) =>
      d.skipped === true ? 1 : 0
    ),
    fwdbtn_numeric: escape((d: PlaybackEventWithFile) =>
      d.reason_end === "fwdbtn" ? 1 : 0
    ),
    skipped_fwdbtn_numeric: escape((d: PlaybackEventWithFile) =>
      d.skipped === true && d.reason_end === "fwdbtn" ? 1 : 0
    ),
  });

  const shuffleSummary = tableWithFlags
    .groupby("shuffle_bucket")
    .rollup({
      total_events: op.count(),
      skipped_events: op.sum("skipped_numeric"),
      fwdbtn_events: op.sum("fwdbtn_numeric"),
      skipped_fwdbtn_events: op.sum("skipped_fwdbtn_numeric"),
      skip_rate: op.mean("skipped_numeric"),
    })
    .orderby("shuffle_bucket");

  console.log("\nShuffle vs skip summary:");
  (
    shuffleSummary.objects() as Array<{
      shuffle_bucket: string | null;
      total_events: number;
      skipped_events: number;
      fwdbtn_events: number;
      skipped_fwdbtn_events: number;
      skip_rate: number | null;
    }>
  ).forEach((row) => {
    const bucketLabel =
      row.shuffle_bucket === "shuffle_on"
        ? "shuffle === true"
        : row.shuffle_bucket === "shuffle_off"
          ? "shuffle === false"
          : "shuffle === null";
    const skipRate =
      row.skip_rate != null && Number.isFinite(row.skip_rate)
        ? `${(row.skip_rate * 100).toFixed(1)}%`
        : "n/a";
    console.log(
      `  ${bucketLabel}: total=${formatNumber.format(row.total_events)} skipped=${formatNumber.format(row.skipped_events)} skip_rate=${skipRate} skipped+fwdbtn=${formatNumber.format(
        row.skipped_fwdbtn_events
      )} fwdbtn_total=${formatNumber.format(row.fwdbtn_events)}`
    );
  });

  const offlineSummary = tableWithFlags
    .groupby("offline_bucket")
    .rollup({
      total_events: op.count(),
      skipped_events: op.sum("skipped_numeric"),
      fwdbtn_events: op.sum("fwdbtn_numeric"),
      skipped_fwdbtn_events: op.sum("skipped_fwdbtn_numeric"),
      skip_rate: op.mean("skipped_numeric"),
    })
    .orderby("offline_bucket");

  console.log("\nOffline vs skip summary:");
  (
    offlineSummary.objects() as Array<{
      offline_bucket: string | null;
      total_events: number;
      skipped_events: number;
      fwdbtn_events: number;
      skipped_fwdbtn_events: number;
      skip_rate: number | null;
    }>
  ).forEach((row) => {
    const bucketLabel =
      row.offline_bucket === "offline_true"
        ? "offline === true"
        : row.offline_bucket === "offline_false"
          ? "offline === false"
          : "offline === null";
    const skipRate =
      row.skip_rate != null && Number.isFinite(row.skip_rate)
        ? `${(row.skip_rate * 100).toFixed(1)}%`
        : "n/a";
    console.log(
      `  ${bucketLabel}: total=${formatNumber.format(row.total_events)} skipped=${formatNumber.format(row.skipped_events)} skip_rate=${skipRate} skipped+fwdbtn=${formatNumber.format(
        row.skipped_fwdbtn_events
      )} fwdbtn_total=${formatNumber.format(row.fwdbtn_events)}`
    );
  });

  if (fwdbtnMismatch.numRows() === 0) {
    console.log("\nNo fwdbtn events were found with skipped !== true.");
    return;
  }

  const breakdown = fwdbtnMismatch
    .derive({
      skipped_label: escape((d: PlaybackEventWithFile) =>
        d.skipped === undefined ? "undefined" : String(d.skipped)
      ),
    })
    .groupby("skipped_label")
    .count();

  console.log("\nBreakdown of skipped values for fwdbtn mismatches:");
  (
    breakdown.objects() as Array<{ skipped_label: string; count: number }>
  ).forEach((row) => {
    console.log(
      `  skipped === ${row.skipped_label}: ${formatNumber.format(row.count)}`
    );
  });

  const durationByTrack = tableData
    .filter(
      escape(
        (d: PlaybackEventWithFile) =>
          d.spotify_track_uri != null &&
          d.reason_end === "trackdone" &&
          typeof d.ms_played === "number"
      )
    )
    .groupby("spotify_track_uri")
    .rollup({
      duration_ms: op.max("ms_played"),
    });

  // Use observed max ms_played per track as a stand-in for the track duration.
  const fwdbtnWithDuration = fwdbtn
    .lookup(durationByTrack, "spotify_track_uri", "duration_ms")
    .derive({
      play_ratio: escape((d: PlaybackEventWithDuration) => {
        const duration =
          typeof d.duration_ms === "number" && d.duration_ms > 0
            ? d.duration_ms
            : null;
        const played =
          typeof d.ms_played === "number" && d.ms_played >= 0
            ? d.ms_played
            : null;
        if (!duration || played == null) {
          return null;
        }
        return Math.min(1, played / duration);
      }),
      skipped_bucket: escape((d: PlaybackEventWithFile) =>
        d.skipped === true ? "skipped_true" : "skipped_not_true"
      ),
    });

  const ratioSummary = fwdbtnWithDuration
    .filter(escape((d: PlaybackEventWithDuration) => d.play_ratio != null))
    .groupby("skipped_bucket")
    .rollup({
      avg_ratio: op.mean("play_ratio"),
      samples: op.count(),
    });

  if (ratioSummary.numRows() === 0) {
    console.log(
      "\nNo duration estimates available to compute average percent played."
    );
  } else {
    console.log(
      "\nAverage percent of track played (using observed max ms_played as duration proxy):"
    );
    (
      ratioSummary.objects() as Array<{
        skipped_bucket: string;
        avg_ratio: number;
        samples: number;
      }>
    ).forEach((row) => {
      const bucketLabel =
        row.skipped_bucket === "skipped_true"
          ? "skipped === true"
          : "skipped !== true";
      const pct = Number.isFinite(row.avg_ratio) ? row.avg_ratio * 100 : NaN;
      const pctDisplay = Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "n/a";
      console.log(
        `  ${bucketLabel}: ${pctDisplay} (n=${formatNumber.format(row.samples)})`
      );
    });
  }

  const samples = fwdbtnMismatch.objects({
    limit: SAMPLE_LIMIT,
  }) as PlaybackEventWithFile[];
  console.log(`\nSample records (up to ${SAMPLE_LIMIT}):`);
  samples.forEach((sample: PlaybackEventWithFile, index: number) => {
    const title = sample.master_metadata_track_name ?? "Unknown track";
    const artist = sample.master_metadata_album_artist_name ?? "Unknown artist";
    console.log(
      `  ${index + 1}. ${sample.ts ?? "Unknown time"} | ${title} — ${artist}`
    );
    console.log(
      `     ms_played=${sample.ms_played ?? "n/a"} skipped=${sample.skipped ?? "n/a"} reason_start=${sample.reason_start ?? "n/a"} file=${sample.__file}`
    );
  });
}

async function main() {
  try {
    const events = await loadEventsFromArchive(zipPath);

    if (!events.length) {
      console.error("No playable events found in the archive.");
      process.exitCode = 1;
      return;
    }

    const eventTable = from(events) as ColumnTable;
    summarizeFwdbtn(eventTable);
  } catch (error) {
    console.error("Failed to analyze archive:", error);
    process.exitCode = 1;
  }
}

void main();
