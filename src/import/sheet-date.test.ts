// @vitest-environment node
import { describe, expect, test } from "vitest";

import { parseSheetDate } from "./sheet-date";

const known = (date: string) => ({ kind: "known", date });
const unknown = { kind: "unknown" };

describe("parseSheetDate", () => {
  test("a Date cell yields its UTC calendar date without a note", () => {
    const result = parseSheetDate(new Date(Date.UTC(2025, 2, 14)), "dd/mm/yyyy");
    expect(result).toEqual({ watchDate: known("2025-03-14"), note: null });
  });

  test("a Date cell without a number format is a full date", () => {
    expect(parseSheetDate(new Date(Date.UTC(2025, 2, 14)), null).watchDate).toEqual(
      known("2025-03-14"),
    );
  });

  test("a mm/yyyy Date cell yields day 1 and a month-only note", () => {
    const result = parseSheetDate(new Date(Date.UTC(2025, 2, 1)), "mm/yyyy");
    expect(result.watchDate).toEqual(known("2025-03-01"));
    expect(result.note).toMatchObject({ reason: "date" });
    expect(result.note?.decision).toMatch(/month/i);
  });

  test("a Date cell whose format has no day and is not month/year is unknown", () => {
    const result = parseSheetDate(new Date(Date.UTC(2024, 0, 1)), "yyyy");
    expect(result.watchDate).toEqual(unknown);
    expect(result.note).toMatchObject({ reason: "date", decision: "unknown" });
  });

  test("quoted literals in the format do not count as a day", () => {
    const result = parseSheetDate(new Date(Date.UTC(2025, 2, 1)), 'mm/yyyy "day"');
    expect(result.watchDate).toEqual(known("2025-03-01"));
    expect(result.note).not.toBeNull();
  });

  test("the dd/mm + yyyy typo is interpreted and reported", () => {
    const result = parseSheetDate("09/072026", null);
    expect(result.watchDate).toEqual(known("2026-07-09"));
    expect(result.note).toEqual({
      reason: "date",
      original: "09/072026",
      decision: "interpreted as 2026-07-09",
    });
  });

  test("the typo form with an impossible date is unknown", () => {
    expect(parseSheetDate("31/022026", null).watchDate).toEqual(unknown);
  });

  test.each(["jiji", "No se acuerda y yo tampoco (mejor)", "2023-2024", "9/7/2026"])(
    "text %j is unknown and reported with its original value",
    (text) => {
      const result = parseSheetDate(text, null);
      expect(result.watchDate).toEqual(unknown);
      expect(result.note).toEqual({ reason: "date", original: text, decision: "unknown" });
    },
  );

  test("a bare year number is unknown and reported", () => {
    const result = parseSheetDate(2024, null);
    expect(result.watchDate).toEqual(unknown);
    expect(result.note).toEqual({ reason: "date", original: "2024", decision: "unknown" });
  });

  test.each([null, "", "   "])("empty value %j is unknown and silent", (value) => {
    expect(parseSheetDate(value, null)).toEqual({ watchDate: unknown, note: null });
  });

  test("an invalid Date is unknown and reported", () => {
    const result = parseSheetDate(new Date(Number.NaN), "dd/mm/yyyy");
    expect(result.watchDate).toEqual(unknown);
    expect(result.note?.reason).toBe("date");
  });
});
