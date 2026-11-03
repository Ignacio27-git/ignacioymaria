import { parseScore, type Score } from "@/domain";

/** Mints a Score for tests through the domain parser; throws on bad input. */
export function makeScore(value: number): Score {
  const result = parseScore(value);
  if (!result.ok) throw new Error(`Invalid test score ${value}`);
  return result.value;
}
