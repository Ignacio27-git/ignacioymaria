import { describe, expect, test, vi } from "vitest";

import { averageScore, WATCH_STATES } from "@/domain";

import { SAMPLE_FIGURES, SAMPLE_ROWS, SAMPLE_SORT_OPTIONS } from "./sample";

vi.mock("server-only", () => ({}));

describe("SAMPLE_ROWS", () => {
  test("covers all six watch states", () => {
    const states = new Set(SAMPLE_ROWS.map((row) => row.state));

    for (const state of WATCH_STATES) {
      expect(states.has(state)).toBe(true);
    }
  });

  test("every average is the domain average of the row's own scores", () => {
    expect(SAMPLE_ROWS.length).toBeGreaterThan(5);

    for (const row of SAMPLE_ROWS) {
      expect(row.average).toBe(averageScore([row.maria, row.ignacio]));
    }
  });

  test("includes a row with both scores, one score and none", () => {
    const both = SAMPLE_ROWS.filter((r) => r.maria !== null && r.ignacio !== null);
    const one = SAMPLE_ROWS.filter((r) => (r.maria === null) !== (r.ignacio === null));
    const none = SAMPLE_ROWS.filter((r) => r.maria === null && r.ignacio === null);

    expect(both.length).toBeGreaterThan(0);
    expect(one.length).toBeGreaterThan(0);
    expect(none.length).toBeGreaterThan(0);
    // A row with no scores has no average; a one-score row averages itself.
    expect(none.every((row) => row.average === null)).toBe(true);
    expect(one.every((row) => row.average === (row.maria ?? row.ignacio))).toBe(
      true,
    );
  });

  test("has a title long enough to need truncation and unique names", () => {
    expect(Math.max(...SAMPLE_ROWS.map((row) => row.name.length))).toBeGreaterThan(40);
    expect(new Set(SAMPLE_ROWS.map((row) => row.name)).size).toBe(
      SAMPLE_ROWS.length,
    );
  });

  test("every row carries a preformatted date or null", () => {
    expect(SAMPLE_ROWS.some((row) => typeof row.watchedOn === "string")).toBe(true);
    expect(SAMPLE_ROWS.some((row) => row.watchedOn === null)).toBe(true);
  });
});

describe("SAMPLE_SORT_OPTIONS", () => {
  test("states the direction in words and has distinct key and direction pairs", () => {
    const pairs = SAMPLE_SORT_OPTIONS.map((o) => `${o.key}:${o.direction}`);

    expect(new Set(pairs).size).toBe(SAMPLE_SORT_OPTIONS.length);
    expect(SAMPLE_SORT_OPTIONS.map((o) => o.label)).toContain(
      "Nota, de mayor a menor",
    );
  });
});

describe("SAMPLE_FIGURES", () => {
  test("the average is the domain average of the two sample scores", () => {
    expect(SAMPLE_FIGURES.maria).toBe(7.25);
    expect(SAMPLE_FIGURES.ignacio).toBe(7);
    expect(SAMPLE_FIGURES.average).toBe(7.125);
    expect(SAMPLE_FIGURES.average).toBe(
      averageScore([SAMPLE_FIGURES.maria, SAMPLE_FIGURES.ignacio]),
    );
  });
});
