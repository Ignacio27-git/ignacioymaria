import "server-only";

import { err, nextSeasonNumber, ok, type Result } from "@/domain";

import { seasonToInsert } from "./mapper";
import { getTitlesRepository } from "./repository";
import { isUuid, NOT_FOUND, requirePerson, toView } from "./shared";
import type { TitleFailure, TitleView } from "./types";

/**
 * Adds the next season of a series: highest number + 1 (1 when none), pending,
 * with no date and no scores. It never creates season 0 and never syncs TMDB.
 * Resolves to the fresh view so the UI shows the derived state (R5.3).
 */
export async function addSeason(
  id: unknown,
): Promise<Result<TitleView, TitleFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;
  if (!isUuid(id)) return NOT_FOUND;

  const repository = await getTitlesRepository();
  const current = await repository.findById(id);
  if (!current.ok) return current;
  const { title } = current.value;
  if (title.kind !== "series") {
    return err({
      kind: "invalid_input",
      errors: [{ field: "kind", code: "not_a_series" }],
    });
  }

  const inserted = await repository.insertSeason(
    seasonToInsert(id, {
      number: nextSeasonNumber(title.seasons),
      state: "pending",
      watchDate: { kind: "unknown" },
    }),
  );
  if (!inserted.ok) return inserted;

  const fresh = await repository.findById(id);
  return fresh.ok ? ok(toView(fresh.value)) : fresh;
}
