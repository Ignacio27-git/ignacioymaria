import { expect, test } from "vitest";

import { parseWatchDate, UNKNOWN_WATCH_DATE } from "./watch-date";

test("accepts a real known date including a leap day", () => {
  const input = { kind: "known", date: "2024-02-29" };
  expect(parseWatchDate(input)).toEqual({ ok: true, value: input });
});

test("accepts the explicit unknown date", () => {
  expect(parseWatchDate({ kind: "unknown" })).toEqual({
    ok: true,
    value: UNKNOWN_WATCH_DATE,
  });
});

test.each([
  { kind: "known", date: "2023-02-29" },
  { kind: "known", date: "2023-02-30" },
  { kind: "known", date: "2023-13-01" },
  { kind: "known", date: "2023-1-5" },
  { kind: "known", date: 20230105 },
  { kind: "other" },
  null,
  undefined,
  "2023-01-05",
])("rejects %j", (input) => {
  expect(parseWatchDate(input)).toEqual({
    ok: false,
    error: { code: "invalid_date" },
  });
});
