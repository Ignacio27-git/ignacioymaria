import { expect, test } from "vitest";

import { isPerson, PEOPLE, PERSON_LABELS } from "./person";

test("defines exactly the two people", () => {
  expect(PEOPLE).toEqual(["ignacio", "maria"]);
});

test("accepts both people", () => {
  expect(isPerson("ignacio")).toBe(true);
  expect(isPerson("maria")).toBe(true);
});

test("rejects anything else", () => {
  expect(isPerson("bob")).toBe(false);
  expect(isPerson("Ignacio")).toBe(false);
  expect(isPerson("")).toBe(false);
  expect(isPerson(null)).toBe(false);
  expect(isPerson(undefined)).toBe(false);
  expect(isPerson(1)).toBe(false);
});

test("maps each person to a display label", () => {
  expect(PERSON_LABELS).toEqual({ ignacio: "Ignacio", maria: "María" });
});
