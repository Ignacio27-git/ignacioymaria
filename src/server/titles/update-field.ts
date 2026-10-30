import "server-only";

import {
  err,
  isWatchState,
  ok,
  parseScore,
  parseWatchDate,
  todayIso,
  type Result,
  type WatchState,
} from "@/domain";
import { LIST_STATES } from "@/lib/titles/list-params";
import { scoreColumnFor } from "@/server/auth/current-person";

import { getTitlesRepository } from "./repository";
import type { TitlePatch } from "./row";
import { isUuid, NOT_FOUND, requirePerson, toView } from "./shared";
import type { TitleFailure, TitleView } from "./types";

/** One field per call; `myScore` always targets the caller's own column. */
export type FieldPatch =
  | { field: "state"; value: WatchState }
  | {
      field: "watchDate";
      value: { kind: "known"; date: string } | { kind: "unknown" };
    }
  | { field: "observations"; value: string | null }
  | { field: "myScore"; value: number | null };

const invalid = (field: string, code: string) =>
  err<TitleFailure>({ kind: "invalid_input", errors: [{ field, code }] });

const isWatched = (state: WatchState) =>
  (LIST_STATES.vistas as readonly WatchState[]).includes(state);

/**
 * Updates exactly one field of a title (TC-6). The patch comes from the
 * client and is validated with the domain; the score column is derived from
 * the session, never from the payload.
 */
export async function updateTitleField(
  id: unknown,
  patch: unknown,
): Promise<Result<TitleView, TitleFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;
  if (!isUuid(id)) return NOT_FOUND;

  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return invalid("patch", "not_an_object");
  }
  const { field, value } = patch as { field?: unknown; value?: unknown };
  const repository = await getTitlesRepository();

  let columns: TitlePatch;
  switch (field) {
    case "state": {
      if (!isWatchState(value)) return invalid("state", "invalid_state");
      columns = { state: value };
      if (isWatched(value)) {
        // A2: a watched title with an unknown date gets today in the same write.
        const current = await repository.findById(id);
        if (!current.ok) return current;
        if (current.value.title.watchDate.kind === "unknown") {
          columns.watch_date = todayIso();
        }
      }
      break;
    }
    case "watchDate": {
      const parsed = parseWatchDate(value);
      if (!parsed.ok) return invalid("watchDate", parsed.error.code);
      columns = {
        watch_date: parsed.value.kind === "known" ? parsed.value.date : null,
      };
      break;
    }
    case "observations": {
      if (value !== null && typeof value !== "string") {
        return invalid("observations", "not_a_string");
      }
      columns = {
        observations: value === null || value.trim() === "" ? null : value,
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

  const updated = await repository.update(id, columns);
  return updated.ok ? ok(toView(updated.value)) : updated;
}
