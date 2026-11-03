import "server-only";

import {
  err,
  isWatchState,
  ok,
  parseScore,
  parseWatchDate,
  todayIso,
  type Result,
} from "@/domain";
import { LIST_STATES } from "@/lib/titles/list-params";
import { scoreColumnFor } from "@/server/auth/current-person";

import { getTitlesRepository } from "./repository";
import type { SeasonPatch } from "./row";
import { isUuid, NOT_FOUND, requirePerson, toView } from "./shared";
import type { TitleFailure, TitleView } from "./types";

/** One field per call; `myScore` always targets the caller's own column. */
export type SeasonFieldPatch =
  | { field: "state"; value: string }
  | {
      field: "watchDate";
      value: { kind: "known"; date: string } | { kind: "unknown" };
    }
  | { field: "myScore"; value: number | null };

const invalid = (field: string, code: string) =>
  err<TitleFailure>({ kind: "invalid_input", errors: [{ field, code }] });

const isWatched = (state: string) =>
  (LIST_STATES.vistas as readonly string[]).includes(state);

/**
 * Updates exactly one field of one season (D-62). The patch comes from the
 * client and is validated with the domain; the score column is derived from
 * the session, never from the payload. A season moved to a watched state with
 * an unknown date gets today in the same write (D-68). Resolves to the fresh
 * title view so the UI shows the re-derived summary.
 */
export async function updateSeasonField(
  id: unknown,
  seasonNumber: unknown,
  patch: unknown,
): Promise<Result<TitleView, TitleFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;
  if (!isUuid(id)) return NOT_FOUND;
  if (!Number.isInteger(seasonNumber) || (seasonNumber as number) < 1) {
    return invalid("season", "not_positive_integer");
  }
  const number = seasonNumber as number;

  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return invalid("patch", "not_an_object");
  }
  const { field, value } = patch as { field?: unknown; value?: unknown };

  let columns: SeasonPatch;
  switch (field) {
    case "state":
      if (!isWatchState(value)) return invalid("state", "invalid_state");
      columns = { state: value };
      break;
    case "watchDate": {
      const parsed = parseWatchDate(value);
      if (!parsed.ok) return invalid("watchDate", parsed.error.code);
      columns = {
        watch_date: parsed.value.kind === "known" ? parsed.value.date : null,
      };
      break;
    }
    case "myScore": {
      let score: number | null = null;
      if (value !== null) {
        const parsed = parseScore(value);
        if (!parsed.ok) return invalid("myScore", parsed.error.code);
        score = parsed.value;
      }
      columns = { [scoreColumnFor(person.value)]: score };
      break;
    }
    default:
      return invalid("field", "unknown_field");
  }

  const repository = await getTitlesRepository();
  const current = await repository.findById(id);
  if (!current.ok) return current;
  const { title } = current.value;
  const season =
    title.kind === "series"
      ? title.seasons.find((s) => s.number === number)
      : undefined;
  if (season === undefined) return NOT_FOUND;

  if (
    field === "state" &&
    isWatched(value as string) &&
    season.watchDate.kind === "unknown"
  ) {
    columns.watch_date = todayIso();
  }

  const updated = await repository.updateSeason(id, number, columns);
  if (!updated.ok) return updated;

  const fresh = await repository.findById(id);
  return fresh.ok ? ok(toView(fresh.value)) : fresh;
}
