import "server-only";

import { err, type Result } from "@/domain/result";
import { getCurrentPerson } from "@/server/auth/current-person";

import { createTmdbClient, type TmdbClient } from "./client";
import { getTmdbReadAccessToken } from "./env";
import { resolveTmdbTestDouble } from "./test-double";
import type { TmdbCandidate, TmdbDetails, TmdbFailure } from "./types";

const MAX_QUERY_LENGTH = 100;

// Fail at startup, not on the first request, if the double leaks into production.
resolveTmdbTestDouble();

/**
 * Identity first (the Server Actions are public endpoints), then input, then
 * the token, then upstream (D-45). Resolves to the client, or to the failure
 * to return as is.
 */
async function prepare(
  validate: () => TmdbFailure | null,
): Promise<{ client: TmdbClient } | { failure: TmdbFailure }> {
  if ((await getCurrentPerson()) === null) {
    return { failure: { kind: "unauthorized" } };
  }
  const invalid = validate();
  if (invalid) return { failure: invalid };
  // E2E only (A4): a deterministic stand-in, no token and no network.
  const double = resolveTmdbTestDouble();
  if (double) return { client: double };
  const token = getTmdbReadAccessToken();
  if (token === null) {
    console.error("tmdb lookup failed", "missing_token");
    return { failure: { kind: "unavailable" } };
  }
  return { client: createTmdbClient({ token }) };
}

export async function searchTmdb(
  query: unknown,
): Promise<Result<TmdbCandidate[], TmdbFailure>> {
  const trimmed = typeof query === "string" ? query.trim() : null;
  const prepared = await prepare(() => {
    if (trimmed === null || trimmed.length > MAX_QUERY_LENGTH) {
      return { kind: "invalid_input" };
    }
    // A blank query never reaches TMDB and has nothing to find.
    return trimmed === "" ? { kind: "not_found" } : null;
  });
  if ("failure" in prepared) return err(prepared.failure);
  return prepared.client.search(trimmed as string);
}

export async function getTmdbDetails(
  kind: unknown,
  id: unknown,
): Promise<Result<TmdbDetails, TmdbFailure>> {
  const prepared = await prepare(() => {
    const validKind = kind === "movie" || kind === "series";
    const validId = Number.isInteger(id) && (id as number) >= 1;
    return validKind && validId ? null : { kind: "invalid_input" };
  });
  if ("failure" in prepared) return err(prepared.failure);
  return prepared.client.details(kind as "movie" | "series", id as number);
}
