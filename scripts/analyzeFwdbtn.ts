#!/usr/bin/env node
import { readFile } from "fs/promises";
import { resolve } from "path";
import { unzipSync, strFromU8 } from "fflate";
import { escape, from } from "arquero";
import type { ColumnTable } from "arquero";

type PlaybackEvent = {
  ts?: string;
  reason_end?: string;
  reason_start?: string;
  skipped?: boolean | null;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  ms_played?: number | null;
};

type PlaybackEventWithFile = PlaybackEvent & {
  __file: string;
};

const SAMPLE_LIMIT = 2;
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
        ...item,
        __file: name,
      } as PlaybackEventWithFile;
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
