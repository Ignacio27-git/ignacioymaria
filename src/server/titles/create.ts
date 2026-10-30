import "server-only";

import { createTitle, err, ok, type Result } from "@/domain";

import { titleToInsert } from "./mapper";
import { getTitlesRepository } from "./repository";
import { requirePerson, toView } from "./shared";
import type { TitleFailure, TitleView } from "./types";

/** Fields a client may set on a new title; scores and observations come later. */
const CREATE_FIELDS = [
  "name",
  "kind",
  "state",
  "watchDate",
  "year",
  "tmdbId",
  "posterPath",
  "actors",
  "seasonsTotal",
] as const;

function pickCreateFields(input: unknown): unknown {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return input;
  }
  const source = input as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const field of CREATE_FIELDS) {
    if (source[field] !== undefined) picked[field] = source[field];
  }
  if (typeof picked.name === "string") picked.name = picked.name.trim();
  return picked;
}

/**
 * Creates a title. The input comes from the client, so it is whitelisted and
 * validated with the domain before anything is written (TC-4). The initial
 * state is `pending` unless a valid state/date is given (A1).
 */
export async function addTitle(
  input: unknown,
): Promise<Result<TitleView, TitleFailure>> {
  const person = await requirePerson();
  if (!person.ok) return person;

  const created = createTitle(pickCreateFields(input));
  if (!created.ok) {
    return err({
      kind: "invalid_input",
      errors: created.error.map(({ field, code }) => ({ field, code })),
    });
  }

  const inserted = await (
    await getTitlesRepository()
  ).insert(titleToInsert(created.value));
  return inserted.ok ? ok(toView(inserted.value)) : inserted;
}
