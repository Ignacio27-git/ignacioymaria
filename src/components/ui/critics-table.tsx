import Link from "next/link";
import type { ReactNode } from "react";

import { PERSON_LABELS } from "@/domain/person";
import type { Score } from "@/domain/score";
import type { WatchState } from "@/domain/watch-state";

import { AverageBox } from "./average-box";
import { cx } from "./cx";
import { ScoreFigure } from "./score-figure";
import { StateCell } from "./state-cell";

// Rows are div grids with ARIA table roles (D-54): the grid keeps the columns
// aligned and the roles keep the table semantics that display:grid can drop.
const COLUMNS = "grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_3rem]";
const COLUMNS_WITH_DATE =
  "grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_3rem] md:grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_3.5rem_6rem]";
const ROW_BASE = "grid items-center gap-x-2 border-b px-1";

export function CriticsTable({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="table" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export function CriticsTableHeader({
  guideWords,
  showDate = false,
  sticky = true,
}: {
  /** Range in view ("Alien – Zodiac"); orientation for sighted users only. */
  guideWords?: string;
  showDate?: boolean;
  sticky?: boolean;
}) {
  return (
    <div
      role="row"
      className={cx(
        ROW_BASE,
        "min-h-10 border-rule-strong bg-paper text-sm font-medium text-ink-muted",
        showDate ? COLUMNS_WITH_DATE : COLUMNS,
        sticky && "sticky top-0 z-10",
      )}
    >
      <div role="columnheader" className="min-w-0">
        Título
        {guideWords && (
          <span aria-hidden="true" className="ml-2 font-normal">
            {guideWords}
          </span>
        )}
      </div>
      <div role="columnheader" className="text-center">
        {PERSON_LABELS.maria}
      </div>
      <div role="columnheader" className="text-center">
        {PERSON_LABELS.ignacio}
      </div>
      <div role="columnheader" className="text-center">
        Media
      </div>
      {showDate && (
        <div role="columnheader" className="hidden md:block">
          Fecha
        </div>
      )}
    </div>
  );
}

export function CriticsTableRow({
  href,
  name,
  year,
  state,
  maria,
  ignacio,
  average,
  watchedOn,
  className,
}: {
  href?: string;
  name: string;
  year: number | null;
  state: WatchState;
  maria: Score | null;
  ignacio: Score | null;
  average: number | null;
  /** Preformatted date; its presence adds the desktop date column. */
  watchedOn?: string | null;
  className?: string;
}) {
  const hasDate = watchedOn !== undefined;
  const titleClass = "block truncate font-condensed text-title font-bold";

  return (
    <div
      role="row"
      className={cx(
        ROW_BASE,
        "relative h-15 border-rule",
        hasDate ? COLUMNS_WITH_DATE : COLUMNS,
        href &&
          "transition-colors duration-150 hover:bg-surface has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-focus",
        className,
      )}
    >
      <div role="cell" className="min-w-0">
        {href ? (
          <Link
            href={href}
            className={cx(
              titleClass,
              "after:absolute after:inset-0 focus-visible:outline-none",
            )}
          >
            {name}
          </Link>
        ) : (
          <span className={titleClass}>{name}</span>
        )}
        <div className="flex items-center gap-2 text-ink-muted">
          {year !== null && <span className="text-sm tabular-nums">{year}</span>}
          <StateCell state={state} />
        </div>
      </div>
      <div role="cell" className="text-center">
        <ScoreFigure score={maria} />
      </div>
      <div role="cell" className="text-center">
        <ScoreFigure score={ignacio} />
      </div>
      <div role="cell" className="flex justify-center">
        <AverageBox value={average} />
      </div>
      {hasDate && (
        <div role="cell" className="hidden text-sm tabular-nums md:block">
          {watchedOn}
        </div>
      )}
    </div>
  );
}
