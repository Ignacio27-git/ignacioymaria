"use server";

import type { Result } from "@/domain/result";
import { getTmdbDetails, searchTmdb } from "@/server/tmdb/lookup";
import type {
  TmdbCandidate,
  TmdbDetails,
  TmdbFailure,
  TmdbKind,
} from "@/server/tmdb/types";

/**
 * UI entries for the TMDB lookup; the logic (identity, validation, token,
 * upstream) lives in src/server/tmdb. Arguments come from the client, so the
 * use case validates them.
 */
export async function searchTmdbAction(
  query: string,
): Promise<Result<TmdbCandidate[], TmdbFailure>> {
  return searchTmdb(query);
}

export async function getTmdbDetailsAction(
  kind: TmdbKind,
  id: number,
): Promise<Result<TmdbDetails, TmdbFailure>> {
  return getTmdbDetails(kind, id);
}
