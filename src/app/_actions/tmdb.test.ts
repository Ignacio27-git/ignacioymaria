// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { getTmdbDetails, searchTmdb } from "@/server/tmdb/lookup";

import { getTmdbDetailsAction, searchTmdbAction } from "./tmdb";

vi.mock("server-only", () => ({}));
vi.mock("@/server/tmdb/lookup", () => ({
  searchTmdb: vi.fn(),
  getTmdbDetails: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(searchTmdb).mockResolvedValue({
    ok: false,
    error: { kind: "not_found" },
  });
  vi.mocked(getTmdbDetails).mockResolvedValue({
    ok: false,
    error: { kind: "unauthorized" },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

test("searchTmdbAction forwards the query untouched and returns the result", async () => {
  const result = await searchTmdbAction("  dune ");

  expect(searchTmdb).toHaveBeenCalledWith("  dune ");
  expect(result).toEqual({ ok: false, error: { kind: "not_found" } });
});

test("searchTmdbAction forwards non-string input so the use case can reject it", async () => {
  await searchTmdbAction(42 as never);

  expect(searchTmdb).toHaveBeenCalledWith(42);
});

test("getTmdbDetailsAction forwards kind and id and returns the result", async () => {
  const result = await getTmdbDetailsAction("series", 1399);

  expect(getTmdbDetails).toHaveBeenCalledWith("series", 1399);
  expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
});
