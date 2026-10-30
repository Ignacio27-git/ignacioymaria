import "server-only";

import { ok, sortTitles, type Result, type TitleList } from "@/domain";
import {
  parseListParams,
  type RawSearchParams,
} from "@/lib/titles/list-params";

import { getTitlesRepository } from "./repository";
import { requirePerson, toView } from "./shared";
import type { TitleFailure, TitleView } from "./types";

/**
 * The full filtered list, sorted (TC-8, TC-9). The URL state is parsed here
 * too, so invalid values fall back to defaults and never reach the database.
 * Filtering is in SQL; ordering is the domain's because the average is not
 * stored (D-19).
 */
export async function listTitles(
  list: TitleList,
  searchParams: RawSearchParams,
): Promise<Result<TitleView[], TitleFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;

  const { q, states, order } = parseListParams(list, searchParams);
  const found = await (await getTitlesRepository()).list({ states, q });
  if (!found.ok) return found;

  return ok(sortTitles(found.value, order, list).map(toView));
}
