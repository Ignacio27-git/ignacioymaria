import { useId } from "react";

import { WATCH_STATE_LABELS, WATCH_STATES, type WatchState } from "@/domain/watch-state";

import { cx } from "./cx";
import { CheckMark } from "./icons";
import { StateSwatch } from "./state-cell";

export interface StatePickerProps {
  value: WatchState;
  onChange: (next: WatchState) => void;
  disabled?: boolean;
  /** A save is in flight: exposed as aria-busy on the group. */
  busy?: boolean;
  className?: string;
}

/**
 * The six legend states as native radios (so the arrows move between them),
 * each with its painted square. Same look as the theme toggle; nothing outside
 * the Excel legend can be chosen.
 */
export function StatePicker({
  value,
  onChange,
  disabled = false,
  busy = false,
  className,
}: StatePickerProps) {
  const name = useId();

  return (
    <fieldset
      aria-busy={busy || undefined}
      disabled={disabled}
      className={cx("min-w-0", className)}
    >
      <legend className="mb-2 text-sm text-ink-muted">Estado</legend>
      <div role="presentation" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {WATCH_STATES.map((state) => (
          <label
            key={state}
            className={cx(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm text-ink",
              "transition-colors duration-150 motion-reduce:transition-none",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
              "has-[:disabled]:cursor-not-allowed has-[:disabled]:text-ink-muted",
              value === state
                ? "border-ink bg-surface font-semibold"
                : "border-rule-strong bg-paper hover:bg-surface",
            )}
          >
            <input
              type="radio"
              name={name}
              value={state}
              checked={value === state}
              onChange={() => onChange(state)}
              className="sr-only"
            />
            {value === state && <CheckMark />}
            <StateSwatch state={state} />
            {WATCH_STATE_LABELS[state]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
