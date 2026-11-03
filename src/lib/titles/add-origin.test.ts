import { expect, test } from "vitest";

import { parseAddOrigin } from "./add-origin";

test("vistas is kept so the new title starts as watched (A1)", () => {
  expect(parseAddOrigin("vistas")).toBe("vistas");
});

test("pendientes, absent and unknown values all start as pending", () => {
  expect(parseAddOrigin("pendientes")).toBe("pendientes");
  expect(parseAddOrigin(undefined)).toBe("pendientes");
  expect(parseAddOrigin("otra")).toBe("pendientes");
});

test("only the first value of a repeated parameter counts", () => {
  expect(parseAddOrigin(["vistas", "pendientes"])).toBe("vistas");
  expect(parseAddOrigin(["otra", "vistas"])).toBe("pendientes");
});
