import { useId, type ReactNode } from "react";

import { AverageBox } from "@/components/ui/average-box";
import { ScoreFigure } from "@/components/ui/score-figure";
import { StateCell } from "@/components/ui/state-cell";
import type { TitleSummary } from "@/domain";
import { PERSON_LABELS, type Person } from "@/domain/person";
import { formatWatchDate } from "@/lib/titles/format-date";

// Neither critic is privileged: the columns keep this order for both people.
const COLUMNS = ["maria", "ignacio"] as const satisfies readonly Person[];

/**
 * What the series is as a whole, read-only: the state and date of its latest
 * season and each person's mean score (D-82). It is derived on the server, so
 * nothing here can be edited; the season rows below are where changes happen.
 */
export function SeriesSummary({ summary }: { summary: TitleSummary }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <h2 id={headingId} className="font-condensed text-2xl font-extrabold">
        Resumen
      </h2>

      <div className="grid grid-cols-3 divide-x divide-rule border-y border-rule">
        {COLUMNS.map((person) => (
          <Cell key={person} label={PERSON_LABELS[person]}>
            <ScoreFigure
              score={summary.scores[person]}
              label={PERSON_LABELS[person]}
              className="font-condensed text-masthead font-extrabold"
            />
          </Cell>
        ))}
        <Cell label="Media">
          <AverageBox value={summary.average} className="min-h-12 min-w-16 text-3xl" />
        </Cell>
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-6 gap-y-2">
        <dt className="text-sm text-ink-muted">Estado</dt>
        <dd>
          <StateCell state={summary.state} />
        </dd>
        <dt className="text-sm text-ink-muted">Fecha de visionado</dt>
        <dd className="text-sm tabular-nums">
          {summary.watchDate.kind === "known"
            ? formatWatchDate(summary.watchDate.date)
            : "No sé cuándo"}
        </dd>
      </dl>
      <p className="max-w-prose text-sm text-ink-muted">
        Se calcula con las temporadas: el estado y la fecha son los de la última, y
        cada nota es la media de las notas de sus temporadas.
      </p>
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
