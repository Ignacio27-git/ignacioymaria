import { averageScore } from "./average";
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

interface TitleBase {
  readonly name: string;
  readonly year: number | null;
  readonly actors: readonly string[];
  readonly observations: string | null;
  readonly watchDate: WatchDate;
  readonly state: WatchState;
  readonly scores: {
    readonly maria: Score | null;
    readonly ignacio: Score | null;
  };
}

export type Movie = TitleBase & { readonly kind: "movie" };
export type Series = TitleBase & {
  readonly kind: "series";
  readonly seasonsWatched: number | null;
};
export type Title = Movie | Series;

/** Advisory shape of the input; `createTitle` accepts `unknown`. */
export type TitleInput = {
  name: string;
  kind: "movie" | "series";
  state?: WatchState;
  year?: number | null;
  seasonsWatched?: number | null;
  actors?: readonly string[];
  observations?: string | null;
  watchDate?: WatchDate;
  scores?: { maria?: unknown; ignacio?: unknown } | null;
};

export type TitleError =
  | { field: "input"; code: "not_an_object" }
  | { field: "name"; code: "not_a_string" | "empty" }
  | { field: "kind"; code: "invalid_kind" }
  | { field: "state"; code: "invalid_state" }
  | { field: "year"; code: "not_integer" }
  | { field: "seasonsWatched"; code: "not_non_negative_integer" }
  | { field: "actors"; code: "not_an_array" }
  | { field: `actors.${number}`; code: "not_a_string" }
  | { field: "observations"; code: "not_a_string" }
  | { field: "watchDate"; code: "invalid_date" }
  | { field: "scores"; code: "not_an_object" }
  | { field: "scores.maria" | "scores.ignacio"; code: ScoreError["code"] };

type Scores = TitleBase["scores"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseScores(raw: unknown, errors: TitleError[]): Scores {
  const scores: { maria: Score | null; ignacio: Score | null } = {
    maria: null,
    ignacio: null,
  };
  if (raw === undefined || raw === null) return scores;
  if (!isPlainObject(raw)) {
    errors.push({ field: "scores", code: "not_an_object" });
    return scores;
  }
  for (const person of ["maria", "ignacio"] as const) {
    const value = raw[person];
    if (value === undefined || value === null) continue;
    const parsed = parseScore(value);
    if (parsed.ok) scores[person] = parsed.value;
    else errors.push({ field: `scores.${person}`, code: parsed.error.code });
  }
  return scores;
}

export function createTitle(
  input: unknown,
): Result<Title, readonly TitleError[]> {
  if (!isPlainObject(input)) {
    return err([{ field: "input", code: "not_an_object" }]);
  }
  const errors: TitleError[] = [];

  const name = input.name;
  if (typeof name !== "string") {
    errors.push({ field: "name", code: "not_a_string" });
  } else if (name.trim() === "") {
    errors.push({ field: "name", code: "empty" });
  }

  const kind = input.kind;
  if (kind !== "movie" && kind !== "series") {
    errors.push({ field: "kind", code: "invalid_kind" });
  }

  let state: WatchState = DEFAULT_WATCH_STATE;
  if (input.state !== undefined) {
    if (isWatchState(input.state)) state = input.state;
    else errors.push({ field: "state", code: "invalid_state" });
  }

  let year: number | null = null;
  if (input.year !== undefined && input.year !== null) {
    if (Number.isInteger(input.year)) year = input.year as number;
    else errors.push({ field: "year", code: "not_integer" });
  }

  let seasonsWatched: number | null = null;
  const seasons = input.seasonsWatched;
  if (kind === "series" && seasons !== undefined && seasons !== null) {
    if (Number.isInteger(seasons) && (seasons as number) >= 0) {
      seasonsWatched = seasons as number;
    } else {
      errors.push({
        field: "seasonsWatched",
        code: "not_non_negative_integer",
      });
    }
  }

  let actors: readonly string[] = [];
  if (input.actors !== undefined) {
    if (!Array.isArray(input.actors)) {
      errors.push({ field: "actors", code: "not_an_array" });
    } else {
      const list: unknown[] = input.actors;
      list.forEach((actor, i) => {
        if (typeof actor !== "string") {
          errors.push({ field: `actors.${i}`, code: "not_a_string" });
        }
      });
      actors = list as string[];
    }
  }

  let observations: string | null = null;
  if (input.observations !== undefined && input.observations !== null) {
    if (typeof input.observations === "string") {
      observations = input.observations;
    } else {
      errors.push({ field: "observations", code: "not_a_string" });
    }
  }

  let watchDate: WatchDate = UNKNOWN_WATCH_DATE;
  if (input.watchDate !== undefined) {
    const parsed = parseWatchDate(input.watchDate);
    if (parsed.ok) watchDate = parsed.value;
    else errors.push({ field: "watchDate", code: "invalid_date" });
  }

  const scores = parseScores(input.scores, errors);

  if (errors.length > 0) return err(errors);

  const base = {
    name: name as string,
    year,
    actors,
    observations,
    watchDate,
    state,
    scores,
  };
  return ok(
    kind === "series"
      ? { ...base, kind: "series", seasonsWatched }
      : { ...base, kind: "movie" },
  );
}

export function titleAverage(title: Title): number | null {
  return averageScore([title.scores.maria, title.scores.ignacio]);
}
