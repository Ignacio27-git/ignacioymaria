import "server-only";

import { ok, titleSummary, type Result, type WatchState } from "@/domain";

import { getTitlesRepository } from "./repository";
import { isUuid, NOT_FOUND, requirePerson } from "./shared";
import type { TitleFailure } from "./types";

/**
 * Deletes a title; either person may delete any title (TC-7). Resolves to the
 * state the title had (derived, for a series with seasons) so the caller can
 * pick the list to return to.
 */
export async function deleteTitle(
  id: unknown,
): Promise<Result<{ state: WatchState }, TitleFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;
  if (!isUuid(id)) return NOT_FOUND;

  const repository = await getTitlesRepository();
  // Read first: the seasons disappear with the title (cascade).
  const found = await repository.findById(id);
  if (!found.ok) return found;
  const removed = await repository.remove(id);
  if (!removed.ok) return removed;
  return ok({ state: titleSummary(found.value.title).state });
}
