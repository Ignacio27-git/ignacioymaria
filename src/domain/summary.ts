import { averageScore } from "./average";
import type { Season } from "./season";
import type { Title } from "./title";
import type { WatchDate } from "./watch-date";
import type { WatchState } from "./watch-state";

/**
 * What lists, sorting and the ficha show for a title. Per-person scores are
 * plain numbers: the mean of season scores can leave the 0.25 grid.
 */
export interface TitleSummary {
  readonly state: WatchState;
  readonly watchDate: WatchDate;
  readonly scores: {
    readonly maria: number | null;
    readonly ignacio: number | null;
  };
  readonly average: number | null;
}

function highestSeason(seasons: readonly Season[]): Season | undefined {
  return seasons.reduce<Season | undefined>(
    (top, s) => (top === undefined || s.number > top.number ? s : top),
    undefined,
  );
}

/**
 * Resolves the values of any title. A series with seasons is derived from
 * them (highest season's state and date, mean of each person's scores); a
 * movie, or a series without seasons, keeps its title-level values. Total:
 * it never throws (rule 8).
 */
export function titleSummary(title: Title): TitleSummary {
  const top = title.kind === "series" ? highestSeason(title.seasons) : undefined;
  if (title.kind !== "series" || top === undefined) {
    const scores = { maria: title.scores.maria, ignacio: title.scores.ignacio };
    return {
      state: title.state,
      watchDate: title.watchDate,
      scores,
      average: averageScore([scores.maria, scores.ignacio]),
    };
  }
  const scores = {
    maria: averageScore(title.seasons.map((s) => s.scores.maria)),
    ignacio: averageScore(title.seasons.map((s) => s.scores.ignacio)),
  };
  return {
    state: top.state,
    watchDate: top.watchDate,
    scores,
    average: averageScore([scores.maria, scores.ignacio]),
  };
}
