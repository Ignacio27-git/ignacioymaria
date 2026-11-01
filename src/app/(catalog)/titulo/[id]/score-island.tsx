import { useId, type ReactNode } from "react";

import { updateTitleFieldAction } from "@/app/_actions/titles";
import { AverageBox } from "@/components/ui/average-box";
import { ScoreFigure } from "@/components/ui/score-figure";
import { ScorePanel } from "@/components/ui/score-panel";
import { PERSON_LABELS, type Person } from "@/domain/person";
import type { TitleView } from "@/server/titles/types";

import { FieldIsland } from "./field-island";
import { useFieldSave } from "./use-field-save";

// Neither critic is privileged: the columns keep this order for both people.
const COLUMNS = ["maria", "ignacio"] as const satisfies readonly Person[];

/**
 * Both critics' scores and the verdict box, with the signed-in person's own
 * column editable. The stamp is the panel's; the average only changes when the
 * server answers (D-53: the UI never computes it).
 */
export function ScoreIsland({
  id,
  me,
  score,
  otherScore,
  average,
  onSaved,
}: {
  id: string;
  me: Person;
  /** My score as the server last confirmed it. */
  score: number | null;
  /** The other person's score: read-only here. */
  otherScore: number | null;
  average: number | null;
  onSaved: (view: TitleView) => void;
}) {
  const headingId = useId();
  const field = useFieldSave<number | null>({
    confirmed: score,
    save: (value) => updateTitleFieldAction(id, { field: "myScore", value }),
    onSaved: (view) => onSaved(view),
  });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <h2 id={headingId} className="font-condensed text-2xl font-extrabold">
        Notas
      </h2>

      <div className="grid grid-cols-3 divide-x divide-rule border-y border-rule">
        {COLUMNS.map((person) => (
          <Cell key={person} label={PERSON_LABELS[person]}>
            <ScoreFigure
              score={person === me ? field.value : otherScore}
              label={PERSON_LABELS[person]}
              className="font-condensed text-masthead font-extrabold"
            />
          </Cell>
        ))}
        <Cell label="Media">
          <div aria-busy={field.busy || undefined}>
            <AverageBox value={average} className="min-h-12 min-w-16 text-3xl" />
          </div>
        </Cell>
      </div>

      <FieldIsland busy={field.busy} failed={field.failed}>
        <ScorePanel
          value={field.value}
          onChange={(next) => {
            if (next !== field.value) field.commit(next);
          }}
          savedCount={field.savedCount}
        />
      </FieldIsland>
    </section>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 px-3 py-3 first:pl-0">
      <span aria-hidden="true" className="font-condensed text-base font-bold">
        {label}
      </span>
      {children}
    </div>
  );
}
