import "server-only";

import { createTitle, err, ok, type Result } from "@/domain";
import { getTmdbDetails } from "@/server/tmdb/lookup";

import { getTitlesRepository, tmdbKey } from "./repository";
import type { TitlePatch } from "./row";
import { isUuid, NOT_FOUND, requirePerson, toView } from "./shared";
import type { TitleFailure, TitleView } from "./types";

/**
 * TMDB failures are wrapped so the UI never confuses "TMDB is down or has no
 * such entry" with "the title was deleted" (both would be `not_found`).
 */
export type RelinkFailure = TitleFailure | { kind: "tmdb_unavailable" };

/**
 * The only columns a relink may write: the TMDB-owned ones. Scores, state,
 * date, observations and import_key are never part of it (RL-5).
 */
export type RelinkPatch = Pick<
  TitlePatch,
  | "name"
  | "kind"
  | "year"
  | "actors"
  | "tmdb_id"
  | "poster_path"
  | "seasons_total"
  | "seasons_watched"
>;

const invalid = (field: string, code: string) =>
  err<RelinkFailure>({ kind: "invalid_input", errors: [{ field, code }] });

/**
 * Relinks a title to a TMDB entry. The client sends ids only; the details are
 * fetched again here (RL-9). Cheap database guards run before the network
 * call: identity, input shape, the title, the several-seasons block and the
 * duplicate check. A series with exactly one season row becoming a movie goes
 * through the fold RPC (one transaction); every other case is a plain update
 * of the allow-listed columns.
 */
export async function relinkTitle(
  id: unknown,
  kind: unknown,
  tmdbId: unknown,
): Promise<Result<TitleView, RelinkFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;
  if (!isUuid(id)) return NOT_FOUND;
  if (kind !== "movie" && kind !== "series") {
    return invalid("kind", "invalid_kind");
  }
  if (!Number.isInteger(tmdbId) || (tmdbId as number) < 1) {
    return invalid("tmdbId", "not_positive_integer");
  }
  const wantedId = tmdbId as number;

  const repository = await getTitlesRepository();
  const current = await repository.findById(id);
  if (!current.ok) return current;

  const seasonCount =
    current.value.title.kind === "series"
      ? current.value.title.seasons.length
      : 0;
  const fromSeries = current.value.title.kind === "series";
  if (fromSeries && kind === "movie" && seasonCount >= 2) {
    return invalid("kind", "series_has_seasons");
  }

  // The unique index is the guarantee; a failed lookup just skips the early answer.
  const holders = await repository.findIdsByTmdb([{ kind, tmdbId: wantedId }]);
  if (holders.ok) {
    const holder = holders.value.get(tmdbKey(kind, wantedId));
    if (holder !== undefined && holder !== id) {
      return err({ kind: "duplicate", existingId: holder });
    }
  }

  const details = await getTmdbDetails(kind, wantedId);
  if (!details.ok) {
    return err(
      details.error.kind === "unauthorized"
        ? { kind: "unauthorized" }
        : { kind: "tmdb_unavailable" },
    );
  }
  const { value } = details;

  // Same domain validation as a new title; a TMDB value that is absent is null.
  const created = createTitle({
    name: value.name,
    kind: value.kind,
    year: value.year,
    tmdbId: value.tmdbId,
    posterPath: value.posterPath,
    actors: value.actors,
    ...(value.kind === "series" ? { seasonsTotal: value.seasonsTotal } : {}),
  });
  if (!created.ok) {
    return err({
      kind: "invalid_input",
      errors: created.error.map(({ field, code }) => ({ field, code })),
    });
  }
  const next = created.value;

  if (fromSeries && next.kind === "movie" && seasonCount === 1) {
    const folded = await repository.relinkSeriesToMovie(id, {
      tmdbId: wantedId,
      name: next.name,
      year: next.year,
      actors: next.actors,
      posterPath: next.posterPath,
    });
    if (!folded.ok) return folded;
    const fresh = await repository.findById(id);
    return fresh.ok ? ok(toView(fresh.value)) : fresh;
  }

  const patch: RelinkPatch = {
    name: next.name,
    kind: next.kind,
    year: next.year,
    actors: [...next.actors],
    tmdb_id: wantedId,
    poster_path: next.posterPath,
    seasons_total: next.kind === "series" ? next.seasonsTotal : null,
    // Only a series turned into a movie stops having watched seasons.
    ...(fromSeries && next.kind === "movie" ? { seasons_watched: null } : {}),
  };
  const updated = await repository.update(id, patch);
  return updated.ok ? ok(toView(updated.value)) : updated;
}
