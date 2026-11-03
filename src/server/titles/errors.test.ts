// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { mapPostgrestError } from "./errors";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("23505 maps to duplicate (existing id is filled in by the repository)", () => {
  expect(mapPostgrestError({ code: "23505", message: "x" })).toEqual({
    kind: "duplicate",
    existingId: null,
  });
});

test("42501 maps to forbidden", () => {
  expect(mapPostgrestError({ code: "42501", message: "x" })).toEqual({
    kind: "forbidden",
  });
});

test("PGRST116 maps to not_found", () => {
  expect(mapPostgrestError({ code: "PGRST116", message: "x" })).toEqual({
    kind: "not_found",
  });
});

test("anything else is unavailable and logs the code only", () => {
  const secret = "relation titles leaked details";

  const failure = mapPostgrestError({ code: "XX000", message: secret });

  expect(failure).toEqual({ kind: "unavailable" });
  expect(console.error).toHaveBeenCalledWith("titles query failed", "XX000");
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
    secret,
  );
});

test("a missing code is logged as unknown", () => {
  mapPostgrestError({ message: "boom" });

  expect(console.error).toHaveBeenCalledWith("titles query failed", "unknown");
});
