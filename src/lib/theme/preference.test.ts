// @vitest-environment node
import { describe, expect, test } from "vitest";

import {
  parseThemePreference,
  THEME_COOKIE,
  THEME_PREFERENCES,
  themeAttribute,
} from "./preference";

describe("parseThemePreference", () => {
  test.each(["system", "light", "dark"] as const)("keeps %s", (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  test.each([
    ["an unknown word", "purple"],
    ["an empty string", ""],
    ["the wrong case", "Dark"],
    ["padded text", " dark"],
    ["undefined", undefined],
    ["null", null],
    ["a number", 1],
    ["an object", { theme: "dark" }],
  ])("falls back to system for %s", (_label, value) => {
    expect(parseThemePreference(value)).toBe("system");
  });
});

describe("themeAttribute", () => {
  test("maps light and dark to the data-theme value", () => {
    expect(themeAttribute("light")).toBe("light");
    expect(themeAttribute("dark")).toBe("dark");
  });

  test("omits the attribute for system", () => {
    expect(themeAttribute("system")).toBeUndefined();
  });
});

test("exposes the three preferences and the cookie name", () => {
  expect(THEME_PREFERENCES).toEqual(["system", "light", "dark"]);
  expect(THEME_COOKIE).toBe("theme");
});
