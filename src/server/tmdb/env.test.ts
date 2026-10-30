// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

import { getTmdbReadAccessToken } from "./env";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
});

test("returns the configured token", () => {
  vi.stubEnv("TMDB_READ_ACCESS_TOKEN", "tok-123");
  expect(getTmdbReadAccessToken()).toBe("tok-123");
});

test("trims surrounding whitespace", () => {
  vi.stubEnv("TMDB_READ_ACCESS_TOKEN", "  tok-123 \n");
  expect(getTmdbReadAccessToken()).toBe("tok-123");
});

test.each([undefined, "", "   "])("returns null when the value is %j", (v) => {
  vi.stubEnv("TMDB_READ_ACCESS_TOKEN", v);
  expect(getTmdbReadAccessToken()).toBeNull();
});
