import "server-only";

import type { Result, WatchState } from "@/domain";

import { getTitlesRepository } from "./repository";
import { isUuid, NOT_FOUND, requirePerson } from "./shared";
import type { TitleFailure } from "./types";

/**
 * Deletes a title; either person may delete any title (TC-7). Resolves to the
 * state the title had so the caller can pick the list to return to.
 */
export async function deleteTitle(
  id: unknown,
): Promise<Result<{ state: WatchState }, TitleFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;
  if (!isUuid(id)) return NOT_FOUND;

  return (await getTitlesRepository()).remove(id);
}
