import "server-only";

import { err, foldSearch, ok } from "@/domain";

import type { TmdbClient } from "./client";
import type { TmdbDetails } from "./types";

/**
 * Deterministic stand-in for TMDB, used by the E2E suite (A4): no network, no
 * key. Enabled only by TMDB_TEST_DOUBLE=1 and refused in production.
 */
const CATALOG: readonly TmdbDetails[] = [
  {
    tmdbId: 438631,
    kind: "movie",
    name: "Dune",
    year: 2021,
    posterPath: "/dune.jpg",
    actors: ["Timothée Chalamet", "Zendaya"],
  },
  {
    tmdbId: 90228,
    kind: "series",
    name: "Dune: Prophecy",
    year: 2024,
    posterPath: "/dune-prophecy.jpg",
    actors: ["Emily Watson", "Olivia Williams"],
    seasonsTotal: 1,
  },
  {
    // No poster: exercises the placeholder.
    tmdbId: 194,
    kind: "movie",
    name: "Amélie",
    year: 2001,
    posterPath: null,
    actors: ["Audrey Tautou"],
  },
  {
    tmdbId: 70523,
    kind: "series",
    name: "Dark",
    year: 2017,
    posterPath: "/dark.jpg",
    actors: ["Louis Hofmann"],
    seasonsTotal: 3,
  },
  {
    tmdbId: 603,
    kind: "movie",
    name: "Matrix",
    year: 1999,
    posterPath: "/matrix.jpg",
    actors: ["Keanu Reeves"],
  },
];

const FLAG = "TMDB_TEST_DOUBLE";

/**
 * The double when it is enabled, null when it is not. Throws when the flag is
 * set in production: a deployment must never serve fake catalog data.
 */
export function resolveTmdbTestDouble(): TmdbClient | null {
  if (process.env[FLAG] !== "1") return null;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${FLAG} must not be set in production`);
  }
  return testDoubleClient;
}

const testDoubleClient: TmdbClient = {
  async search(query) {
    const needle = foldSearch(query.trim());
    const matches = CATALOG.filter((entry) =>
      foldSearch(entry.name).includes(needle),
    ).map(({ tmdbId, kind, name, year, posterPath }) => ({
      tmdbId,
      kind,
      name,
      year,
      posterPath,
    }));
    return matches.length > 0 ? ok(matches) : err({ kind: "not_found" });
  },

  async details(kind, id) {
    const entry = CATALOG.find((e) => e.kind === kind && e.tmdbId === id);
    return entry ? ok(entry) : err({ kind: "not_found" });
  },
};
