import { cx } from "./cx";
import { CheckMark } from "./icons";
import { formatScore } from "./score-figure";

const WHOLE_SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const FINE_STEP = 0.25;
const MIN = 0;
const MAX = 10;

export interface ScorePanelProps {
  /** The signed-in person's own score; null when never set. */
  value: number | null;
  /** Receives the next value, or null for "Quitar nota". The server validates it. */
  onChange: (next: number | null) => void;
  /**
   * How many saves the server has confirmed. Each increase plays the stamp once
   * and announces "Nota guardada"; a failed save leaves it unchanged.
   */
  savedCount?: number;
  disabled?: boolean;
  className?: string;
}

const BUTTON =
  "inline-flex min-h-11 items-center justify-center border px-3 text-base tabular-nums text-ink " +
  "transition-[transform,background-color] duration-150 ease-out " +
  "hover:bg-surface active:scale-[0.98] motion-reduce:transition-none " +
  "disabled:border-rule disabled:text-ink-muted disabled:hover:bg-paper disabled:active:scale-100";

/**
 * The ficha's own-score control: whole-number buttons plus a quarter-point
 * stepper, instead of a slider (precise on a phone, one tap for the common
 * case). Presentational: the island that owns the save decides what is
 * confirmed. The stamp is a short press-in on the figure; reduced motion keeps
 * a static check and the status text instead.
 */
export function ScorePanel({
  value,
  onChange,
  savedCount = 0,
  disabled = false,
  className,
}: ScorePanelProps) {
  const spoken = value === null ? "Sin nota" : formatScore(value);
  const stepUp = Math.min(MAX, (value ?? MIN) + FINE_STEP);
  const stepDown = Math.max(MIN, (value ?? MIN) - FINE_STEP);

  return (
    <div
      role="group"
      aria-label="Tu nota"
      className={cx("flex flex-col gap-4", className)}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Bajar un cuarto de punto"
          disabled={disabled || value === null || value <= MIN}
          onClick={() => onChange(stepDown)}
          className={cx(BUTTON, "min-w-11 border-rule-strong bg-paper")}
        >
          −
        </button>
        <span
          key={savedCount}
          className={cx(
            "inline-flex min-w-20 items-center justify-center gap-2 font-condensed text-masthead font-extrabold tabular-nums",
            savedCount > 0 && "animate-stamp motion-reduce:animate-none",
          )}
        >
          <span className="sr-only">Tu nota: {spoken}</span>
          <span aria-hidden="true">{value === null ? "—" : formatScore(value)}</span>
          {savedCount > 0 && (
            <span data-saved-mark>
              <CheckMark className="size-5" />
            </span>
          )}
        </span>
        <button
          type="button"
          aria-label="Subir un cuarto de punto"
          disabled={disabled || (value !== null && value >= MAX)}
          onClick={() => onChange(stepUp)}
          className={cx(BUTTON, "min-w-11 border-rule-strong bg-paper")}
        >
          +
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {WHOLE_SCORES.map((whole) => (
          <button
            key={whole}
            type="button"
            aria-pressed={value === whole}
            disabled={disabled}
            onClick={() => onChange(whole)}
            className={cx(
              BUTTON,
              value === whole
                ? "border-ink bg-surface font-semibold"
                : "border-rule-strong bg-paper",
            )}
          >
            {whole}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={disabled || value === null}
          onClick={() => onChange(null)}
          className={cx(BUTTON, "border-transparent bg-paper text-sm underline underline-offset-4")}
        >
          Quitar nota
        </button>
        <p role="status" className="text-sm text-ink-muted">
          {savedCount > 0 && value !== null && `Nota guardada: ${formatScore(value)}`}
        </p>
      </div>
    </div>
  );
}
