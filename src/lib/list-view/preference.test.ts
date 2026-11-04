import { expect, test } from "vitest";

import { LIST_VIEW_COOKIE, LIST_VIEWS, parseListView } from "./preference";

test("the cookie name and the allowlist are fixed", () => {
  expect(LIST_VIEW_COOKIE).toBe("list_view");
  expect(LIST_VIEWS).toEqual(["table", "grid"]);
});

test.each(["table", "grid"] as const)("accepts exactly %s", (value) => {
  expect(parseListView(value)).toBe(value);
});

test.each([
  ["undefined", undefined],
  ["an empty string", ""],
  ["the wrong case", "Grid"],
  ["an unknown word", "purple"],
  ["a near miss", "grid2"],
  ["a number", 1],
  ["null", null],
])("%s resolves to the table", (_label, value) => {
  expect(parseListView(value)).toBe("table");
});
