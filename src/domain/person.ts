export const PEOPLE = ["ignacio", "maria"] as const;

export type Person = (typeof PEOPLE)[number];

export function isPerson(value: unknown): value is Person {
  return typeof value === "string" && (PEOPLE as readonly string[]).includes(value);
}
