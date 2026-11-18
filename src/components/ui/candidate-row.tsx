import Link from "next/link";

import { cx } from "./cx";
import { Poster } from "./poster";

export const KIND_LABELS = { movie: "Película", series: "Serie" } as const;

/** Link style shared by the "Abrir ficha" actions. */
export const OPEN_FICHA =
  "inline-flex min-h-11 items-center underline underline-offset-4";

/** What a row needs of a TMDB candidate (structural: no server import). */
export interface CandidateRowItem {
  name: string;
  year: number | null;
  kind: keyof typeof KIND_LABELS;
  posterPath: string | null;
  /** Id of the title already in the list for this candidate, if any. */
  existingId: string | null;
}

/**
 * One TMDB candidate: a tap target that picks it, or, when the list already
 * holds it, a non-selectable row that links to that title. `note` is an
 * optional extra line (the relink panel marks the current ficha with it).
 */
export function CandidateRow({
  candidate,
  busy,
  disabled,
  onChoose,
  note,
  busyLabel = "Añadiendo…",
}: {
  candidate: CandidateRowItem;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
  note?: string;
  busyLabel?: string;
}) {
  const { name, year, kind, posterPath, existingId } = candidate;
  const body = (
    <>
      <Poster path={posterPath} name={name} decorative className="w-12" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-condensed text-title font-bold">{name}</span>
        <span className="text-sm text-ink-muted tabular-nums">
          {year === null ? KIND_LABELS[kind] : `${year} · ${KIND_LABELS[kind]}`}
        </span>
        {note && <span className="text-sm font-semibold">{note}</span>}
      </span>
    </>
  );
  const row = "flex min-h-[4.5rem] w-full items-center gap-3 border-b border-rule py-2";

  if (existingId !== null) {
    return (
      <li className={cx(row, "flex-wrap")}>
        {body}
        <span className="flex flex-col items-end text-sm">
          <span>Ya está en la lista</span>
          <Link href={`/titulo/${existingId}`} className={OPEN_FICHA}>
            Abrir ficha
          </Link>
        </span>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        aria-busy={busy || undefined}
        onClick={onChoose}
        className={cx(
          row,
          "pr-3 text-left transition-colors duration-150 motion-reduce:transition-none",
          "hover:bg-surface disabled:text-ink-muted disabled:hover:bg-paper",
        )}
      >
        {body}
        {busy && <span className="text-sm">{busyLabel}</span>}
      </button>
    </li>
  );
}
