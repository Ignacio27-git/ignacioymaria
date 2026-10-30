import { expect, test } from "vitest";

import { formatAddedDate, formatWatchDate } from "./format-date";

test("formats a watch day as a short Spanish date without shifting the day", () => {
  expect(formatWatchDate("2026-05-01")).toBe("1 may 2026");
  expect(formatWatchDate("2024-03-12")).toBe("12 mar 2024");
  expect(formatWatchDate("2026-01-01")).toBe("1 ene 2026");
});

test("formats the added timestamp on its Madrid calendar day", () => {
  // 23:30 UTC on 30 Oct is already 31 Oct (00:30 CET) in Madrid.
  expect(formatAddedDate("2026-10-30T23:30:00.000Z")).toBe("31 oct 2026");
  expect(formatAddedDate("2026-07-01T10:00:00.000Z")).toBe("1 jul 2026");
});

test("never throws on an unparseable value", () => {
  expect(formatWatchDate("nope")).toBe("—");
  expect(formatAddedDate("nope")).toBe("—");
});
