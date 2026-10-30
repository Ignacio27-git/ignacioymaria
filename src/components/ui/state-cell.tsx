import { WATCH_STATE_LABELS, type WatchState } from "@/domain/watch-state";
import { STATE_SWATCHES } from "@/lib/design/tokens";

import { cx } from "./cx";

// Static class names so Tailwind can see them; the values come from the tokens.
const FILL_CLASS: Record<WatchState, string> = {
  urgent: "bg-state-urgent",
  watched: "bg-state-watched",
  watched_rewatch: "bg-state-rewatch",
  watched_no_rewatch: "bg-state-no-rewatch",
  watched_awful: "bg-state-awful",
  pending: "border-2 border-rule-strong",
};

/** The painted square. Decorative: the label text always carries the state. */
export function StateSwatch({
  state,
  className,
}: {
  state: WatchState;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-state={state}
      data-filled={STATE_SWATCHES[state].kind === "fill"}
      className={cx("inline-block size-3.5 shrink-0", FILL_CLASS[state], className)}
    />
  );
}

export function StateCell({
  state,
  className,
}: {
  state: WatchState;
  className?: string;
}) {
  return (
    <span className={cx("inline-flex items-center gap-2 text-sm", className)}>
      <StateSwatch state={state} />
      <span>{WATCH_STATE_LABELS[state]}</span>
    </span>
  );
}
