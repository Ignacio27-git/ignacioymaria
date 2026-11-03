import { expect, test } from "vitest";

import { parseScore } from "./score";

test.each([0, 0.25, 7.25, 7.5, 7.75, 10])("accepts %s", (n) => {
  expect(parseScore(n)).toEqual({ ok: true, value: n });
});

test.each([7.3, 7.1])("rejects off-grid %s without rounding", (n) => {
  expect(parseScore(n)).toEqual({ ok: false, error: { code: "off_grid" } });
});

test.each([-0.25, 10.25, Infinity, -Infinity])(
  "rejects out of range %s",
  (n) => {
    expect(parseScore(n)).toEqual({
      ok: false,
      error: { code: "out_of_range" },
    });
  },
);

test.each([NaN, "7", null, undefined])(
  "rejects non-number %s without throwing",
  (n) => {
    expect(parseScore(n)).toEqual({
      ok: false,
      error: { code: "not_a_number" },
    });
  },
);
