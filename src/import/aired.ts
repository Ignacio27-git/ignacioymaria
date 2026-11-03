import type { PlannedTitle } from "./group";
import type { MatchKind, Note, SeasonDraft } from "./types";

/** A TMDB season; same shape as the app one, but import code stays out of server modules. */
type TmdbSeason = { number: number; airDate: string | null };

/**
 * Season numbers that have already aired: season_number >= 1 (never the
 * specials season 0) and an air date up to `today` (YYYY-MM-DD). A missing or
 * future air date means not aired yet.
 */
export function airedSeasons(seasons: readonly TmdbSeason[], today: string): number[] {
  return [
    ...new Set(
      seasons
        .filter((s) => s.number >= 1 && s.airDate !== null && s.airDate <= today)
        .map((s) => s.number),
    ),
  ].sort((a, b) => a - b);
}

export type SeasonContext = {
  kind: MatchKind;
  /** TMDB details when linked; only the seasons are used. */
  details: { seasons: readonly TmdbSeason[] } | null;
  today: string;
};

/**
 * The seasons to write for one title. Marked rows name their own; an unmarked
 * series counts as watched complete: its aired TMDB seasons, or season 1 only
 * (with a note) when it is not linked or nothing has aired. Movies have none.
 */
export function planSeasons(
  title: PlannedTitle,
  context: SeasonContext,
): { seasons: SeasonDraft[]; notes: Note[] } {
  if (context.kind !== "series") return { seasons: [], notes: [] };

  const draft = (number: number, row: PlannedTitle["prepared"]): SeasonDraft => ({
    number,
    state: row.state,
    watchDate: row.watchDate,
    scores: { ...row.scores },
  });

  const { plan, prepared } = title;
  if (plan.kind === "explicit") {
    return { seasons: plan.seasons.map((s) => draft(s.number, s.row)), notes: [] };
  }

  const aired =
    context.details === null ? [] : airedSeasons(context.details.seasons, context.today);
  if (aired.length > 0) {
    return { seasons: aired.map((number) => draft(number, prepared)), notes: [] };
  }
  const why = context.details === null ? "not linked to TMDB" : "no season has aired on TMDB";
  return {
    seasons: [draft(1, prepared)],
    notes: [
      {
        reason: "season",
        original: prepared.displayName,
        decision: `no season marker and ${why}, imported as season 1 only`,
      },
    ],
  };
}
