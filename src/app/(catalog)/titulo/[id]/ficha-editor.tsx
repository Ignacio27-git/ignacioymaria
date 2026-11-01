"use client";

import { useState } from "react";

import type { Person } from "@/domain/person";

import { DateIsland } from "./date-island";
import { DeleteIsland } from "./delete-island";
import type { FichaFields } from "./ficha-fields";
import { ObservationsIsland } from "./observations-island";
import { ScoreIsland } from "./score-island";
import { StateIsland } from "./state-island";

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
}

/**
 * The editable half of the ficha. Each field is its own island with its own
 * optimistic save (TD-2); they share only what the server last confirmed, so
 * one answer can update a neighbour (state to date, score to average).
 */
export function FichaEditor({
  id,
  name,
  me,
  today,
  initial,
  otherScore,
}: FichaEditorProps) {
  const [fields, setFields] = useState(initial);
  const merge = (partial: Partial<FichaFields>) =>
    setFields((current) => ({ ...current, ...partial }));

  return (
    <div className="flex flex-col gap-10">
      <ScoreIsland
        id={id}
        me={me}
        score={fields.myScore}
        otherScore={otherScore}
        average={fields.average}
        onSaved={(view) =>
          merge({ myScore: view.title.scores[me], average: view.average })
        }
      />
      <StateIsland
        id={id}
        state={fields.state}
        onSaved={(view) =>
          merge({ state: view.title.state, watchDate: view.title.watchDate })
        }
      />
      <DateIsland
        id={id}
        watchDate={fields.watchDate}
        today={today}
        onSaved={(view) => merge({ watchDate: view.title.watchDate })}
      />
      <ObservationsIsland
        id={id}
        observations={fields.observations}
        onSaved={(view) => merge({ observations: view.title.observations })}
      />
      <DeleteIsland id={id} name={name} />
    </div>
  );
}
