import { cx } from "./cx";
import { formatScore } from "./score-figure";

/**
 * The only inverted element in the system (R4): an ink box with the figure
 * reversed out. The value is display-only; the average is computed elsewhere.
 */
export function AverageBox({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={value === null ? "Sin media" : `Media ${formatScore(value)}`}
      className={cx(
        "inline-flex min-h-10 min-w-12 items-center justify-center bg-inverse-bg px-1.5",
        "text-xl font-extrabold tabular-nums text-inverse-ink",
        className,
      )}
    >
      <span aria-hidden="true">
        {value === null ? "—" : formatScore(value)}
      </span>
    </span>
  );
}
