import { expect, test } from "vitest";

import { averageScore } from "./average";
import { parseScore, type Score } from "./score";

function score(n: number): Score {
  const result = parseScore(n);
  if (!result.ok) throw new Error(`invalid test score ${n}`);
  return result.value;
}

test.each([[[]], [[null, null]]])("returns null when no scores exist: %j", (s) => {
  expect(averageScore(s)).toBeNull();
});

test("a single score from either person is that score", () => {
  expect(averageScore([score(6.5), null])).toBe(6.5);
  expect(averageScore([null, score(6.5)])).toBe(6.5);
});

test("returns the raw mean without rounding", () => {
  expect(averageScore([score(7.25), score(8)])).toBe(7.625);
});

test("zero counts as an existing score", () => {
  expect(averageScore([score(0), score(10)])).toBe(5);
  expect(averageScore([score(0)])).toBe(0);
  expect(averageScore([score(0), null])).toBe(0);
});
