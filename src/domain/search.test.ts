import { describe, expect, test } from "vitest";

import { escapeLike, foldSearch } from "./search";

// Keep in sync with supabase/tests/database/title_search_unique.test.sql.
const FOLD_FIXTURES: readonly (readonly [string, string])[] = [
  ["Amélie", "amelie"],
  ["LÉON", "leon"],
  ["Ñandú", "nandu"],
  ["Plain", "plain"],
  ["", ""],
];

describe("foldSearch", () => {
  test.each(FOLD_FIXTURES)("folds %j to %j", (input, expected) => {
    expect(foldSearch(input)).toBe(expected);
  });

  test("folds a precomposed and a decomposed accent to the same value", () => {
    expect(foldSearch("é")).toBe(foldSearch("é"));
  });

  test("keeps non-latin letters", () => {
    expect(foldSearch("千と千尋")).toBe("千と千尋");
  });
});

describe("escapeLike", () => {
  test("escapes percent, underscore and backslash", () => {
    expect(escapeLike("100%_\\")).toBe("100\\%\\_\\\\");
  });

  test("leaves ordinary text untouched", () => {
    expect(escapeLike("amelie")).toBe("amelie");
  });
});
