import { err, ok, type Result } from "./result";
import { parseScore, type Score, type ScoreError } from "./score";
import {
  parseWatchDate,
  UNKNOWN_WATCH_DATE,
  type WatchDate,
} from "./watch-date";
import {
  DEFAULT_WATCH_STATE,
  isWatchState,
  type WatchState,
} from "./watch-state";

/** One season of a series: its own state, watch date and one score per person. */
export interface Season {
  readonly number: number;
  readonly state: WatchState;
  readonly watchDate: WatchDate;
  readonly scores: {
    readonly maria: Score | null;
    readonly ignacio: Score | null;
  };
}

export type SeasonError =
  | { field: "input"; code: "not_an_object" }
  | { field: "number"; code: "not_positive_integer" }
  | { field: "state"; code: "invalid_state" }
  | { field: "watchDate"; code: "invalid_date" }
  | { field: "scores"; code: "not_an_object" }
  | { field: "scores.maria" | "scores.ignacio"; code: ScoreError["code"] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates a season from untrusted input; season 0 never exists. */
export function createSeason(
  input: unknown,
): Result<Season, readonly SeasonError[]> {
  if (!isPlainObject(input)) {
    return err([{ field: "input", code: "not_an_object" }]);
  }
  const errors: SeasonError[] = [];

  const number = input.number;
  if (!Number.isInteger(number) || (number as number) < 1) {
    errors.push({ field: "number", code: "not_positive_integer" });
  }

  let state: WatchState = DEFAULT_WATCH_STATE;
  if (input.state !== undefined) {
    if (isWatchState(input.state)) state = input.state;
    else errors.push({ field: "state", code: "invalid_state" });
  }

  let watchDate: WatchDate = UNKNOWN_WATCH_DATE;
  if (input.watchDate !== undefined) {
    const parsed = parseWatchDate(input.watchDate);
    if (parsed.ok) watchDate = parsed.value;
    else errors.push({ field: "watchDate", code: "invalid_date" });
  }

  const scores: { maria: Score | null; ignacio: Score | null } = {
    maria: null,
    ignacio: null,
  };
  const rawScores = input.scores;
  if (rawScores !== undefined && rawScores !== null) {
    if (!isPlainObject(rawScores)) {
      errors.push({ field: "scores", code: "not_an_object" });
    } else {
      for (const person of ["maria", "ignacio"] as const) {
        const value = rawScores[person];
        if (value === undefined || value === null) continue;
        const parsed = parseScore(value);
        if (parsed.ok) scores[person] = parsed.value;
        else errors.push({ field: `scores.${person}`, code: parsed.error.code });
      }
    }
  }

  if (errors.length > 0) return err(errors);
  return ok({ number: number as number, state, watchDate, scores });
}

/** Number for the next season to add: highest + 1, or 1 when there are none. */
export function nextSeasonNumber(
  seasons: readonly { readonly number: number }[],
): number {
  return seasons.reduce((max, s) => Math.max(max, s.number), 0) + 1;
}
