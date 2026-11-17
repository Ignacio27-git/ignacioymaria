import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLEAR_TITLES_SQL,
  SEED_SEASON_SQL,
  SEED_TITLE_SQL,
} from "./local-data";

type Result = { rows: Record<string, unknown>[]; rowCount: number | null };

// A fake database whose gated statements do nothing when no snapshot is pending,
// exactly like the real SQL: zero rows, zero rowCount.
let live = true;
let deleted = 3;
let seasonRows = 1;
const calls: string[] = [];
const client = {
  async query(sql: string | { text: string }): Promise<Result> {
    const text = typeof sql === "string" ? sql : sql.text;
    calls.push(text);
    if (text === CLEAR_TITLES_SQL) return { rows: [], rowCount: live ? deleted : 0 };
    if (text === SEED_TITLE_SQL) {
      return live ? { rows: [{ id: "t1" }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (text === SEED_SEASON_SQL) return { rows: [], rowCount: live ? seasonRows : 0 };
    if (text.includes("as live")) return { rows: [{ live }], rowCount: 1 };
    throw new Error(`unexpected statement: ${text}`);
  },
};

vi.mock("../../tests/e2e/db", () => ({
  withDb: (work: (c: typeof client) => Promise<unknown>) => work(client),
}));

const { clearTitles, seedTitles } = await import("../../tests/e2e/titles-db");

beforeEach(() => {
  live = true;
  deleted = 3;
  seasonRows = 1;
  calls.length = 0;
});

describe("clearTitles", () => {
  it("deletes through the gated statement while a snapshot is pending", async () => {
    await expect(clearTitles()).resolves.toBeUndefined();
    expect(calls).toEqual([CLEAR_TITLES_SQL]);
  });

  it("refuses, loudly, when no snapshot is pending", async () => {
    live = false;
    await expect(clearTitles()).rejects.toThrow(/snapshot/i);
  });

  it("accepts an already empty table while a snapshot is pending", async () => {
    deleted = 0;
    await expect(clearTitles()).resolves.toBeUndefined();
    expect(calls).toHaveLength(2);
  });
});

describe("seedTitles", () => {
  it("inserts titles and seasons through the gated statements", async () => {
    const ids = await seedTitles([
      { name: "Dark", kind: "series", state: "watched", seasons: [{ number: 1, state: "watched" }] },
    ]);
    expect(ids).toEqual({ Dark: "t1" });
    expect(calls).toEqual([SEED_TITLE_SQL, SEED_SEASON_SQL]);
  });

  it("throws when the title insert is refused", async () => {
    live = false;
    await expect(seedTitles([{ name: "Heat", state: "watched" }])).rejects.toThrow(/snapshot/i);
  });

  it("throws when a season insert is refused", async () => {
    seasonRows = 0;
    await expect(
      seedTitles([{ name: "Dark", kind: "series", state: "watched", seasons: [{ number: 1, state: "watched" }] }]),
    ).rejects.toThrow(/snapshot/i);
  });
});
