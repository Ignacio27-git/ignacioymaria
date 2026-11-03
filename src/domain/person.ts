export const PEOPLE = ["ignacio", "maria"] as const;

export type Person = (typeof PEOPLE)[number];

/** Display names for the two people. */
export const PERSON_LABELS: Readonly<Record<Person, string>> = {
  ignacio: "Ignacio",
  maria: "María",
};

export function isPerson(value: unknown): value is Person {
  return typeof value === "string" && (PEOPLE as readonly string[]).includes(value);
}
