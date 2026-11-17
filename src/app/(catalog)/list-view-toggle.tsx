"use client";

import { useId, useOptimistic, useTransition } from "react";

import { setListViewAction } from "@/app/_actions/list-view";
import { cx } from "@/components/ui/cx";
import { CheckMark } from "@/components/ui/icons";
import { LIST_VIEWS, type ListView } from "@/lib/list-view/preference";

const OPTION_LABELS: Record<ListView, string> = {
  table: "Tabla",
  grid: "Tarjetas",
};

/**
 * Two native radios (so the arrows move between them) that write the list
 * view cookie through the Server Action. The chosen option shows at once; the
 * route re-renders from the cookie, and a failed write only reverts the
 * selection. It never reads or writes the URL (the view is not list state).
 */
export function ListViewToggle({
  value,
  className,
}: {
  value: ListView;
  className?: string;
}) {
  const name = useId();
  const labelId = useId();
  const [selected, setSelected] = useOptimistic(value);
  const [, startTransition] = useTransition();

  function choose(next: ListView) {
    if (next === selected) return;
    startTransition(async () => {
      setSelected(next);
      try {
        await setListViewAction(next);
      } catch {
        // Nothing to show: the optimistic state ends with the transition and
        // the selection returns to the value the server rendered.
      }
    });
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className={cx("flex flex-wrap items-center gap-2", className)}
    >
      <span id={labelId} className="text-sm text-ink-muted">
        Vista
      </span>
      {LIST_VIEWS.map((view) => (
        <label
          key={view}
          className={cx(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm text-ink",
            "transition-colors duration-150 motion-reduce:transition-none",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
            selected === view
              ? "border-ink bg-surface font-semibold"
              : "border-rule-strong bg-paper hover:bg-surface",
          )}
        >
          <input
            type="radio"
            name={name}
            value={view}
            checked={selected === view}
            onChange={() => choose(view)}
            className="sr-only"
          />
          {selected === view && <CheckMark />}
          {OPTION_LABELS[view]}
        </label>
      ))}
    </div>
  );
}
