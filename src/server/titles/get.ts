import "server-only";

import { ok, type Result } from "@/domain";

import { getTitlesRepository } from "./repository";
import { isUuid, NOT_FOUND, requirePerson, toView } from "./shared";
import type { TitleFailure, TitleView } from "./types";

/** One title by id. A non-uuid id is not_found without touching the database. */
export async function getTitle(
  id: unknown,
): Promise<Result<TitleView, TitleFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;
  if (!isUuid(id)) return NOT_FOUND;

  const found = await (await getTitlesRepository()).findById(id);
  return found.ok ? ok(toView(found.value)) : found;
}
