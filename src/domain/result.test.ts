import { expect, test } from "vitest";

import { err, ok } from "./result";

test("ok wraps a value", () => {
  expect(ok(5)).toEqual({ ok: true, value: 5 });
});

test("err wraps an error", () => {
  expect(err("boom")).toEqual({ ok: false, error: "boom" });
});
