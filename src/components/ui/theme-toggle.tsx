"use client";

import { useId, useOptimistic, useTransition } from "react";

import { setThemeAction } from "@/app/_actions/theme";
import {
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/lib/theme/preference";

import { cx } from "./cx";

const OPTION_LABELS: Record<ThemePreference, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

/**
 * Three native radios (so the arrows move between them) that write the theme
 * cookie through the Server Action. The chosen option shows at once; the
 * server stays the source of truth once the action settles.
 */
export function ThemeToggle({
  value,
  className,
}: {
  value: ThemePreference;
  className?: string;
}) {
  const name = useId();
  const [selected, setSelected] = useOptimistic(value);
  const [, startTransition] = useTransition();

  function choose(next: ThemePreference) {
    startTransition(async () => {
      setSelected(next);
      await setThemeAction(next);
    });
  }

  return (
    <fieldset className={cx("flex flex-wrap items-center gap-2", className)}>
      <legend className="mb-2 text-sm text-ink-muted">Tema</legend>
      {THEME_PREFERENCES.map((preference) => (
        <label
          key={preference}
          className={cx(
            "inline-flex min-h-11 cursor-pointer items-center border bg-paper px-4 text-sm text-ink",
            "transition-colors duration-150 hover:bg-surface motion-reduce:transition-none",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
            selected === preference
              ? "border-2 border-ink font-semibold"
              : "border-rule-strong",
          )}
        >
          <input
            type="radio"
            name={name}
            value={preference}
            checked={selected === preference}
            onChange={() => choose(preference)}
            className="sr-only"
          />
          {OPTION_LABELS[preference]}
        </label>
      ))}
    </fieldset>
  );
}
