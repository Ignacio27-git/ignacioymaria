import "server-only";

import { err, ok, titleAverage, type Person, type Result } from "@/domain";
import { getCurrentPerson } from "@/server/auth/current-person";

import type { TitleFailure, TitleRecord, TitleView } from "./types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Identity first: Server Actions are public endpoints (D-45). */
export async function requirePerson(): Promise<Result<Person, TitleFailure>> {
  const person = await getCurrentPerson();
  return person === null ? err({ kind: "unauthorized" }) : ok(person);
}

/** Record -> DTO with the average resolved on the server (D-53). */
export function toView(record: TitleRecord): TitleView {
  return { ...record, average: titleAverage(record.title) };
}

export const NOT_FOUND = err<TitleFailure>({ kind: "not_found" });
