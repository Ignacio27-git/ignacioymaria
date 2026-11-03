import { expect, test } from "vitest";

import { cx } from "./cx";

test("joins class names with a single space", () => {
  expect(cx("a", "b", "c")).toBe("a b c");
});

test("drops false, null, undefined and empty entries", () => {
  expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
});

test("keeps conditional classes that are truthy", () => {
  const active = true;
  const disabled = false;

  expect(cx("base", active && "on", disabled && "off")).toBe("base on");
});

test("returns an empty string when nothing is left", () => {
  expect(cx(false, null, undefined)).toBe("");
});
