import "server-only";

import {
  ok,
  sortTitles,
  titleSummary,
  type Result,
  type TitleList,
} from "@/domain";
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
 * Name search and the state of movies are filtered in SQL; a series is
 * filtered here by its derived state (the highest season's, R5.7) and ordering
 * is the domain's because the average is not stored (D-19).
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

  const inStates = found.value.filter((record) =>
    states.includes(titleSummary(record.title).state),
  );
  return ok(sortTitles(inStates, order, list).map(toView));
}
