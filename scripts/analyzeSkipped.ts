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

function summarizeSkips(tableData: ColumnTable) {
  const skippedTrue = tableData.filter(
    (d: PlaybackEventWithFile) => d.skipped === true
  );
  const skippedFalse = tableData.filter(
    (d: PlaybackEventWithFile) => d.skipped !== true
  );

  console.log("--- skip analysis ---");
  console.log(`Archive: ${zipPath}`);
  console.log(
    `Total playback records: ${formatNumber.format(tableData.numRows())}`
  );
  console.log(
    `skipped === true: ${formatNumber.format(skippedTrue.numRows())}`
  );
  console.log(
    `skipped !== true: ${formatNumber.format(skippedFalse.numRows())}`
  );

  const skipRate =
    tableData.numRows() > 0
      ? (skippedTrue.numRows() / tableData.numRows()) * 100
      : 0;
  console.log(`Overall skip rate: ${skipRate.toFixed(1)}%`);

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
  });

  const shuffleSummary = tableWithFlags
    .groupby("shuffle_bucket")
    .rollup({
      total_events: op.count(),
      skipped_events: op.sum("skipped_numeric"),
      skip_rate: op.mean("skipped_numeric"),
    })
    .orderby("shuffle_bucket");

  console.log("\nShuffle vs skip summary:");
  (
    shuffleSummary.objects() as Array<{
      shuffle_bucket: string | null;
      total_events: number;
      skipped_events: number;
      skip_rate: number | null;
    }>
  ).forEach((row) => {
    const bucketLabel =
      row.shuffle_bucket === "shuffle_on"
        ? "shuffle === true"
        : row.shuffle_bucket === "shuffle_off"
          ? "shuffle === false"
          : "shuffle === null";
    const skipRateBucket =
      row.skip_rate != null && Number.isFinite(row.skip_rate)
        ? `${(row.skip_rate * 100).toFixed(1)}%`
        : "n/a";
    console.log(
      `  ${bucketLabel}: total=${formatNumber.format(row.total_events)} skipped=${formatNumber.format(row.skipped_events)} skip_rate=${skipRateBucket}`
    );
  });

  const offlineSummary = tableWithFlags
    .groupby("offline_bucket")
    .rollup({
      total_events: op.count(),
      skipped_events: op.sum("skipped_numeric"),
      skip_rate: op.mean("skipped_numeric"),
    })
    .orderby("offline_bucket");

  console.log("\nOffline vs skip summary:");
  (
    offlineSummary.objects() as Array<{
      offline_bucket: string | null;
      total_events: number;
      skipped_events: number;
      skip_rate: number | null;
    }>
  ).forEach((row) => {
    const bucketLabel =
      row.offline_bucket === "offline_true"
        ? "offline === true"
        : row.offline_bucket === "offline_false"
          ? "offline === false"
          : "offline === null";
    const skipRateBucket =
      row.skip_rate != null && Number.isFinite(row.skip_rate)
        ? `${(row.skip_rate * 100).toFixed(1)}%`
        : "n/a";
    console.log(
      `  ${bucketLabel}: total=${formatNumber.format(row.total_events)} skipped=${formatNumber.format(row.skipped_events)} skip_rate=${skipRateBucket}`
    );
  });

  const skippedSamples = skippedTrue.objects({
    limit: SAMPLE_LIMIT,
  }) as PlaybackEventWithFile[];
  if (skippedSamples.length > 0) {
    console.log(`\nSample skipped records (up to ${SAMPLE_LIMIT}):`);
    skippedSamples.forEach((sample, index) => {
      const title = sample.master_metadata_track_name ?? "Unknown track";
      const artist =
        sample.master_metadata_album_artist_name ?? "Unknown artist";
      console.log(
        `  ${index + 1}. ${sample.ts ?? "Unknown time"} | ${title} — ${artist}`
      );
      console.log(
        `     ms_played=${sample.ms_played ?? "n/a"} shuffle=${sample.shuffle ?? "n/a"} offline=${sample.offline ?? "n/a"} file=${sample.__file}`
      );
    });
  }
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
    summarizeSkips(eventTable);
  } catch (error) {
    console.error("Failed to analyze archive:", error);
    process.exitCode = 1;
  }
}

void main();
