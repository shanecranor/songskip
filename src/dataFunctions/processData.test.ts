import { describe, expect, it } from "vitest";
import { processData } from "./processData";
import type { SpotifyStreamingData } from "../types";

const createEvent = (
  overrides: Partial<SpotifyStreamingData>
): SpotifyStreamingData => ({
  ts: "2024-01-01T00:00:00.000Z",
  username: "user",
  platform: "web_player",
  ms_played: 60_000,
  conn_country: "US",
  ip_addr_decrypted: "0.0.0.0",
  user_agent_decrypted: "agent",
  master_metadata_track_name: "Bad Song",
  master_metadata_album_artist_name: "Bad Artist",
  master_metadata_album_album_name: "Bad Album",
  spotify_track_uri: "spotify:track:bad",
  reason_start: "trackdone",
  reason_end: "trackdone",
  shuffle: false,
  skipped: false,
  offline: false,
  offline_timestamp: null,
  incognito_mode: false,
  ...overrides,
});

const forwardButtonData: SpotifyStreamingData[] = [
  createEvent({
    ts: "2024-01-01T00:00:00.000Z",
    ms_played: 1_000,
    skipped: true,
    reason_end: "fwdbtn",
  }),
  createEvent({
    ts: "2024-01-02T00:00:00.000Z",
    ms_played: 1_200,
    skipped: true,
    reason_end: "fwdbtn",
  }),
  createEvent({
    ts: "2024-01-03T00:00:00.000Z",
    ms_played: 250_000,
    skipped: false,
    reason_end: "trackdone",
  }),
  createEvent({
    ts: "2024-01-04T00:00:00.000Z",
    ms_played: 240_000,
    skipped: false,
    reason_end: "trackdone",
  }),
];

describe("processData forward button aggregation", () => {
  it("counts forward-button presses in overall totals", () => {
    const result = processData(forwardButtonData, { limitToPastYear: false });
    expect(result.totals.fwdbtnCount).toBe(2);
  });

  it("counts forward-button presses per track", () => {
    const result = processData(forwardButtonData, { limitToPastYear: false });
    const track = result.fastSkips[0];
    expect(track?.fwdBtnCount).toBe(2);
  });
});

describe("processData date filtering", () => {
  const referenceDate = new Date("2025-01-01T00:00:00.000Z");

  it("drops events older than one year by default", () => {
    const data: SpotifyStreamingData[] = [
      createEvent({
        ts: "2023-01-01T00:00:00.000Z",
        skipped: true,
        reason_end: "fwdbtn",
      }),
      createEvent({
        ts: "2024-07-01T00:00:00.000Z",
        skipped: false,
      }),
    ];

    const result = processData(data, { referenceDate });

    expect(result.totals.count).toBe(1);
    expect(result.totals.skips).toBe(0);
  });

  it("keeps older events when limitToPastYear is false", () => {
    const data: SpotifyStreamingData[] = [
      createEvent({
        ts: "2023-01-01T00:00:00.000Z",
        skipped: true,
        reason_end: "fwdbtn",
      }),
      createEvent({
        ts: "2024-07-01T00:00:00.000Z",
        skipped: false,
      }),
    ];

    const result = processData(data, {
      limitToPastYear: false,
      referenceDate,
    });

    expect(result.totals.count).toBe(2);
    expect(result.totals.skips).toBe(1);
  });
});
