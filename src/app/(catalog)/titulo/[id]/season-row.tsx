"use client";

import { ScoreFigure } from "@/components/ui/score-figure";
import { ScorePanel } from "@/components/ui/score-panel";
import { StateCell } from "@/components/ui/state-cell";
import type { Result, Season } from "@/domain";
import { PERSON_LABELS, type Person } from "@/domain/person";
import { formatWatchDate } from "@/lib/titles/format-date";
import type { SeasonFieldPatch } from "@/server/titles/update-season";
import type { TitleFailure, TitleView } from "@/server/titles/types";

import { DateIsland } from "./date-island";
import { FieldIsland } from "./field-island";
import { StateIsland } from "./state-island";
import { useFieldSave } from "./use-field-save";

// Neither critic is privileged: the columns keep this order for both people.
const PEOPLE = ["maria", "ignacio"] as const satisfies readonly Person[];

export interface SeasonRowProps {
  season: Season;
  /** Who is signed in: decides which score is editable. */
  me: Person;
  /** Today in Madrid, from the server, for the "Hoy" button. */
  today: string;
  /** Starts expanded; the latest season is, the older ones are folded away. */
  open?: boolean;
  /** One field per call (D-62); the parent binds the series and the season. */
  save: (patch: SeasonFieldPatch) => Promise<Result<TitleView, TitleFailure>>;
  onSaved: (view: TitleView) => void;
}

/**
 * One season: always-visible state, date and both scores on its fold line, and
 * the editors inside. State and date are editable by either person; only the
 * signed-in person's own score is (D-84). Each field saves on its own, like
 * the ficha's, so none overwrites another.
 */
export function SeasonRow({
  season,
  me,
  today,
  open,
  save,
  onSaved,
}: SeasonRowProps) {
  const known = season.watchDate.kind === "known" ? season.watchDate.date : null;

  return (
    <details open={open} className="border-b border-rule">
      <summary className="flex min-h-14 cursor-pointer flex-wrap items-center gap-x-5 gap-y-1 py-2">
        <span className="font-condensed text-title font-bold">
          Temporada {season.number}
        </span>
        <StateCell state={season.state} className="text-ink-muted" />
        <span className="text-sm tabular-nums text-ink-muted">
          {known === null ? "No sé cuándo" : formatWatchDate(known)}
        </span>
        <span className="ml-auto flex gap-4 text-ink">
          {PEOPLE.map((person) => (
            <ScoreFigure
              key={person}
              score={season.scores[person]}
              label={PERSON_LABELS[person]}
              className="font-condensed text-lg font-bold"
            />
          ))}
        </span>
      </summary>

      <div className="flex flex-col gap-8 pb-8 pt-3">
        <StateIsland
          state={season.state}
          save={(value) => save({ field: "state", value })}
          onSaved={onSaved}
        />
        <DateIsland
          watchDate={season.watchDate}
          today={today}
          save={(value) => save({ field: "watchDate", value })}
          onSaved={onSaved}
        />
        <OwnScore
          score={season.scores[me]}
          save={(value) => save({ field: "myScore", value })}
          onSaved={onSaved}
        />
      </div>
    </details>
  );
}

/** My score of this season: the other person's is read on the fold line only. */
function OwnScore({
  score,
  save,
  onSaved,
}: {
  score: number | null;
  save: (value: number | null) => Promise<Result<TitleView, TitleFailure>>;
  onSaved: (view: TitleView) => void;
}) {
  const field = useFieldSave<number | null>({
    confirmed: score,
    save,
    onSaved: (view) => onSaved(view),
  });

  return (
    <FieldIsland busy={field.busy} failed={field.failed}>
      <ScorePanel
        value={field.value}
        onChange={(next) => {
          if (next !== field.value) field.commit(next);
        }}
        savedCount={field.savedCount}
      />
    </FieldIsland>
  );
}
