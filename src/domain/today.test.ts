import { expect, test } from "vitest";

import { todayIso } from "./today";

test("formats the Europe/Madrid calendar day as YYYY-MM-DD", () => {
  expect(todayIso(new Date("2026-05-01T12:00:00Z"))).toBe("2026-05-01");
});

test("late evening UTC is already tomorrow in Madrid (summer, UTC+2)", () => {
  expect(todayIso(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
});

test("early morning UTC is still today in Madrid (winter, UTC+1)", () => {
  expect(todayIso(new Date("2026-01-15T00:30:00Z"))).toBe("2026-01-15");
});

test("a Madrid evening is not shifted to the next UTC day", () => {
  expect(todayIso(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
});

test("defaults to the current time", () => {
  expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
