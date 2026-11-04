import Link from "next/link";
import type { ReactNode } from "react";

import { PERSON_LABELS } from "@/domain/person";
import type { WatchState } from "@/domain/watch-state";

import { AverageBox } from "./average-box";
import { cx } from "./cx";
import { Poster } from "./poster";
import { ScoreFigure } from "./score-figure";
import { StateCell } from "./state-cell";

/**
 * The card view of one title: the same data as a CriticsTableRow, with the
 * cover on top. Flat and square like the table; the average box stays the one
 * inverted element (R4). The title link is stretched over the whole card, so
 * the card is one tab stop and one accessible name.
 */
export function TitleCard({
  href,
  name,
  year,
  posterPath,
  state,
  maria,
  ignacio,
  average,
  watchedOn,
  className,
}: {
  href: string;
  name: string;
  year: number | null;
  /** Stored TMDB poster path, or null for the typographic cover. */
  posterPath: string | null;
  state: WatchState;
  /** A domain Score, or a derived series mean (which can leave the 0.25 grid). */
  maria: number | null;
  ignacio: number | null;
  average: number | null;
  /** Preformatted date, or a dash when unknown. */
  watchedOn: string;
  className?: string;
}) {
  const personLabel = "font-condensed text-sm font-bold";

  return (
    <li
      className={cx(
        "relative flex flex-col gap-2 border-b border-rule p-1 pb-3",
        "transition-colors duration-150 motion-reduce:transition-none",
        "hover:bg-surface active:bg-surface has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-focus",
        className,
      )}
    >
      <Poster path={posterPath} name={name} decorative fallback="title" className="w-full" />

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
        <Link
          href={href}
          className="line-clamp-2 min-h-[2lh] font-condensed text-title font-bold [overflow-wrap:anywhere] after:absolute after:inset-0 focus-visible:outline-none"
        >
          {name}
        </Link>
        {year !== null && (
          <span className="text-sm tabular-nums text-ink-muted">{year}</span>
        )}
      </div>

      <StateCell state={state} className="text-ink-muted" />

      <div className="mt-auto grid grid-cols-[1fr_1fr_3rem] gap-x-2 gap-y-1 text-center">
        <span aria-hidden="true" className={personLabel}>
          {PERSON_LABELS.maria}
        </span>
        <span aria-hidden="true" className={personLabel}>
          {PERSON_LABELS.ignacio}
        </span>
        <span aria-hidden="true" className="text-sm text-ink-muted">
          Media
        </span>
        <ScoreFigure score={maria} label={PERSON_LABELS.maria} className="self-center" />
        <ScoreFigure score={ignacio} label={PERSON_LABELS.ignacio} className="self-center" />
        <AverageBox value={average} />
      </div>

      <p className="text-sm tabular-nums text-ink-muted">
        <span className="sr-only">Fecha: </span>
        <span>{watchedOn}</span>
      </p>
    </li>
  );
}

/** The ruled list the cards sit in; a 2px ink rule opens it like the table head. */
export function TitleCardGrid({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      role="list"
      aria-label={label}
      className={cx(
        "grid grid-cols-2 gap-x-3 gap-y-5 border-t-2 border-ink pt-3 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4",
        className,
      )}
    >
      {children}
    </ul>
  );
}
