import "server-only";

import { err, ok, type Result } from "@/domain";
import { searchTmdb } from "@/server/tmdb/lookup";
import type { TmdbCandidate, TmdbFailure } from "@/server/tmdb/types";

import { getTitlesRepository, tmdbKey } from "./repository";

/** A TMDB candidate, with the id of the title already in the list (if any). */
export type AddCandidate = TmdbCandidate & { existingId: string | null };

/**
 * TMDB search for the add flow, annotated so the UI can warn before the tap.
 * Identity and input validation happen in `searchTmdb`. If the duplicate
 * lookup fails the candidates still show: the unique index is the guarantee.
 * `excludeId` is the title being relinked: it is never reported as its own
 * duplicate.
 */
export async function searchAddCandidates(
  query: unknown,
  options: { excludeId?: string } = {},
): Promise<Result<AddCandidate[], TmdbFailure>> {
  const found = await searchTmdb(query);
  if (!found.ok) return err(found.error);

  const repository = await getTitlesRepository();
  const existing = await repository.findIdsByTmdb(
    found.value.map(({ kind, tmdbId }) => ({ kind, tmdbId })),
  );
  const ids = existing.ok ? existing.value : new Map<string, string>();

  return ok(
    found.value.map((candidate) => ({
      ...candidate,
      existingId: existingIdOf(
        ids.get(tmdbKey(candidate.kind, candidate.tmdbId)),
        options.excludeId,
      ),
    })),
  );
}

function existingIdOf(
  id: string | undefined,
  excludeId: string | undefined,
): string | null {
  return id === undefined || id === excludeId ? null : id;
}
