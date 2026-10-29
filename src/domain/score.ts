import { err, ok, type Result } from "./result";

declare const scoreBrand: unique symbol;

/** A score in [0, 10] on a 0.25 grid. Only `parseScore` can mint one. */
export type Score = number & { readonly [scoreBrand]: true };

export type ScoreError =
  | { code: "not_a_number" }
  | { code: "out_of_range" }
  | { code: "off_grid" };

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;

export function parseScore(input: unknown): Result<Score, ScoreError> {
  if (typeof input !== "number" || Number.isNaN(input)) {
    return err({ code: "not_a_number" });
  }
  if (input < MIN_SCORE || input > MAX_SCORE) {
    return err({ code: "out_of_range" });
  }
  if (!Number.isInteger(input * 4)) {
    return err({ code: "off_grid" });
  }
  return ok(input as Score);
}
