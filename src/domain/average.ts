import type { Score } from "./score";

/** Raw arithmetic mean of the existing scores, or null when there are none. */
export function averageScore(
  scores: readonly (Score | null)[],
): number | null {
  const existing = scores.filter((s): s is Score => s !== null);
  if (existing.length === 0) return null;
  return existing.reduce((sum, s) => sum + s, 0) / existing.length;
}
