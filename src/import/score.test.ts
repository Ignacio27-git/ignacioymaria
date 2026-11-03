// @vitest-environment node
import { describe, expect, test } from "vitest";

import { parseScore } from "../domain/score";
import { normalizeScore, roundToGrid } from "./score";

describe("roundToGrid", () => {
  test.each([
    [9.9, 10],
    [7.3, 7.25],
    [8.5, 8.5],
    [7.75, 7.75],
    [0, 0],
  ])("%d -> %d", (input, expected) => {
    expect(roundToGrid(input)).toBe(expected);
  });
});

describe("normalizeScore", () => {
  test("keeps an on-grid score without a note", () => {
    expect(normalizeScore(8.5, "C")).toEqual({ value: 8.5, note: null });
  });

  test("rounds an off-grid score and reports original and adjusted", () => {
    const result = normalizeScore(9.9, "C");
    expect(result.value).toBe(10);
    expect(result.note).toMatchObject({ reason: "score", original: "C: 9.9" });
    expect(result.note?.decision).toContain("10");
  });

  test.each([null, undefined, "", "  "])("empty %j stays null and silent", (v) => {
    expect(normalizeScore(v, "B")).toEqual({ value: null, note: null });
  });

  test("a non-numeric value becomes null and is reported", () => {
    const result = normalizeScore("#DIV/0!", "B");
    expect(result.value).toBeNull();
    expect(result.note).toMatchObject({ reason: "score", original: "B: #DIV/0!" });
  });

  test("an out-of-range value becomes null and is reported", () => {
    const result = normalizeScore(11, "B");
    expect(result.value).toBeNull();
    expect(result.note?.reason).toBe("score");
  });
});

test("the domain still rejects an off-grid score", () => {
  expect(parseScore(9.9).ok).toBe(false);
});
