"use client";

import { useState } from "react";

import {
  addSeasonAction,
  updateSeasonFieldAction,
  updateTitleFieldAction,
} from "@/app/_actions/titles";
import type { Season, TitleSummary } from "@/domain";
import { nextSeasonNumber } from "@/domain/season";
import type { Person } from "@/domain/person";
import type { TitleView } from "@/server/titles/types";

import { AddSeasonButton } from "./add-season-button";
import { DateIsland } from "./date-island";
import { DeleteIsland } from "./delete-island";
import type { FichaFields } from "./ficha-fields";
import { ObservationsIsland } from "./observations-island";
import { ScoreIsland } from "./score-island";
import { SeasonRow } from "./season-row";
import { SeriesSummary } from "./series-summary";
import { StateIsland } from "./state-island";

/** What a series adds to the ficha: its seasons and the summary derived from them. */
export interface SeriesFields {
  seasons: readonly Season[];
  summary: TitleSummary;
}

export interface FichaEditorProps {
  id: string;
  name: string;
  /** Who is signed in: decides which score column is editable. */
  me: Person;
  /** Today in Madrid, from the server, for the "Hoy" button. */
  today: string;
  initial: FichaFields;
  /** The other person's score: shown, never editable. */
  otherScore: number | null;
  /** Present only for a series; a movie has no season section. */
  series?: SeriesFields;
}

/**
 * The editable half of the ficha. Each field is its own island with its own
 * optimistic save (TD-2); they share only what the server last confirmed, so
 * one answer can update a neighbour (state to date, score to average).
 *
 * A series with seasons shows the derived summary and one row per season in
 * place of the title-level state, date and score editors (D-84); a series
 * without seasons keeps those editors until its first season is added.
 */
export function FichaEditor({
  id,
  name,
  me,
  today,
  initial,
  otherScore,
  series: initialSeries,
}: FichaEditorProps) {
  const [fields, setFields] = useState(initial);
  const [series, setSeries] = useState(initialSeries);
  const merge = (partial: Partial<FichaFields>) =>
    setFields((current) => ({ ...current, ...partial }));

  /** Every season answer carries the fresh title: adopt its seasons and summary. */
  function adoptSeries(view: TitleView) {
    if (view.title.kind !== "series") return;
    setSeries({ seasons: view.title.seasons, summary: view.summary });
  }

  const seasons = series
    ? [...series.seasons].sort((a, b) => a.number - b.number)
    : [];
  const latest = seasons.at(-1)?.number;

  return (
    <div className="flex flex-col gap-10">
      {series && seasons.length > 0 ? (
        <>
          <SeriesSummary summary={series.summary} />
          <section
            aria-label="Temporadas"
            className="flex flex-col border-t-2 border-ink"
          >
            {seasons.map((season) => (
              <SeasonRow
                key={season.number}
                season={season}
                me={me}
                today={today}
                open={season.number === latest}
                save={(patch) => updateSeasonFieldAction(id, season.number, patch)}
                onSaved={adoptSeries}
              />
            ))}
          </section>
        </>
      ) : (
        <>
          <ScoreIsland
            me={me}
            score={fields.myScore}
            otherScore={otherScore}
            average={fields.average}
            save={(value) => updateTitleFieldAction(id, { field: "myScore", value })}
            onSaved={(view) =>
              merge({ myScore: view.title.scores[me], average: view.average })
            }
          />
          <StateIsland
            state={fields.state}
            save={(value) => updateTitleFieldAction(id, { field: "state", value })}
            onSaved={(view) =>
              merge({ state: view.title.state, watchDate: view.title.watchDate })
            }
          />
          <DateIsland
            watchDate={fields.watchDate}
            today={today}
            save={(value) => updateTitleFieldAction(id, { field: "watchDate", value })}
            onSaved={(view) => merge({ watchDate: view.title.watchDate })}
          />
        </>
      )}
      {series && (
        <AddSeasonButton
          nextNumber={nextSeasonNumber(seasons)}
          save={() => addSeasonAction(id)}
          onAdded={adoptSeries}
        />
      )}
      <ObservationsIsland
        id={id}
        observations={fields.observations}
        onSaved={(view) => merge({ observations: view.title.observations })}
      />
      <DeleteIsland id={id} name={name} />
    </div>
  );
}
