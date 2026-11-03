import { MAX_SCORE, MIN_SCORE } from "../domain/score";
import type { Note } from "./types";

/**
 * Explicit importer step (the domain `parseScore` keeps rejecting off-grid
 * values): nearest 0.25.
 */
export function roundToGrid(value: number): number {
  return Math.round(value * 4) / 4;
}

export type ScoreResult = { value: number | null; note: Note | null };

function describe(column: string, raw: unknown): string {
  return `${column}: ${typeof raw === "string" ? raw : String(raw)}`;
}

/**
 * One score cell to a grid score. `column` is the sheet column letter, used only
 * in the report. Empty stays null; anything unusable becomes null and is
 * reported so nothing is invented.
 */
export function normalizeScore(raw: unknown, column: string): ScoreResult {
  if (raw === null || raw === undefined) return { value: null, note: null };

  let value: number;
  if (typeof raw === "number") {
    value = raw;
  } else if (typeof raw === "string") {
    const text = raw.trim();
    if (text === "") return { value: null, note: null };
    value = Number(text.replace(",", "."));
  } else {
    value = Number.NaN;
  }

  if (!Number.isFinite(value) || value < MIN_SCORE || value > MAX_SCORE) {
    return {
      value: null,
      note: {
        reason: "score",
        original: describe(column, raw),
        decision: "not a valid score, left empty",
      },
    };
  }

  const rounded = roundToGrid(value);
  if (rounded === value) return { value, note: null };
  return {
    value: rounded,
    note: {
      reason: "score",
      original: describe(column, raw),
      decision: `rounded to ${rounded}`,
    },
  };
}
