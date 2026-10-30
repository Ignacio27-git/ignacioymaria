import type { Score } from "@/domain/score";

import { cx } from "./cx";

// 0.125 steps are exact in binary, so halfExpand gives 7,125 -> 7,13.
const scoreFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  roundingMode: "halfExpand",
});

/** Display format shared by scores and averages: 7,25 · 7,5 · 8 · 7,13. */
export function formatScore(value: number): string {
  return scoreFormat.format(value);
}

export function ScoreFigure({
  score,
  label,
  className,
}: {
  score: Score | null;
  /** Person the score belongs to; announced to assistive tech only. */
  label?: string;
  className?: string;
}) {
  return (
    <span className={cx("tabular-nums", className)}>
      {label && <span className="sr-only">{label}: </span>}
      {score === null ? (
        <>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Sin nota</span>
        </>
      ) : (
        formatScore(score)
      )}
    </span>
  );
}
