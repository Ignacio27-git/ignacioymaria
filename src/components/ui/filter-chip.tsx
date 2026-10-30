import type { ComponentProps, ReactNode } from "react";

import type { WatchState } from "@/domain/watch-state";

import { cx } from "./cx";
import { CheckMark } from "./icons";
import { StateSwatch } from "./state-cell";

export type FilterChipProps = Omit<
  ComponentProps<"button">,
  "onClick" | "children"
> & {
  pressed: boolean;
  onToggle?: (pressed: boolean) => void;
  /** Adds the state's painted square before the label. */
  state?: WatchState;
  children: ReactNode;
};

export function FilterChip({
  pressed,
  onToggle,
  state,
  children,
  className,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      {...props}
      aria-pressed={pressed}
      // No handler without onToggle: a server-rendered chip must not carry a function.
      onClick={onToggle ? () => onToggle(!pressed) : undefined}
      className={cx(
        "inline-flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap",
        "border px-3 text-sm text-ink",
        "transition-[transform,background-color] duration-150 ease-out",
        "active:scale-[0.98] motion-reduce:transition-none",
        // Selected = tinted ground, ink hairline and a check; never the primary look.
        pressed
          ? "border-ink bg-surface font-semibold"
          : "border-rule-strong bg-paper hover:bg-surface",
        className,
      )}
    >
      {pressed && <CheckMark />}
      {state && <StateSwatch state={state} />}
      {children}
    </button>
  );
}

/** Labelled group that owns the horizontal scroll of the chips (not the page). */
export function FilterChipRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(
        // -mx-1/px-1: room for the focus ring without pushing chips off the text margin;
        // scroll-px-1 stops the snap from nudging the first chip into that padding.
        // Phones scroll sideways; from md the chips wrap so all of them show.
        "-mx-1 flex snap-x scroll-px-1 gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:thin]",
        "md:snap-none md:flex-wrap md:overflow-visible",
        className,
      )}
    >
      {children}
    </div>
  );
}
