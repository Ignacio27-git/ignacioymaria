import type { ChangeEvent } from "react";

import { cx } from "./cx";
import { ChevronDown } from "./icons";

export type SortKey = "score" | "date" | "name";
export type SortDirection = "asc" | "desc";
export type SortValue = `${SortKey}:${SortDirection}`;

export interface SortOption {
  key: SortKey;
  direction: SortDirection;
  /** States the direction in words: "Nota, de mayor a menor". */
  label: string;
}

export interface SortControlProps {
  label: string;
  name: string;
  options: readonly SortOption[];
  value?: SortValue;
  defaultValue?: SortValue;
  onChange?: (selection: { key: SortKey; direction: SortDirection }) => void;
  className?: string;
}

export function SortControl({
  label,
  name,
  options,
  value,
  defaultValue,
  onChange,
  className,
}: SortControlProps) {
  const selectId = `sort-${name}`;

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const chosen = options.find(
      (option) => `${option.key}:${option.direction}` === event.target.value,
    );
    if (chosen) onChange?.({ key: chosen.key, direction: chosen.direction });
  }

  return (
    <div className={cx("flex items-center gap-2", className)}>
      <label htmlFor={selectId} className="text-sm text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          // No handler without onChange: a server-rendered select must not carry a function.
          onChange={onChange ? handleChange : undefined}
          className="min-h-11 appearance-none border border-rule-strong bg-paper py-0 pl-3 pr-10 text-sm text-ink"
        >
          {options.map((option) => (
            <option
              key={`${option.key}:${option.direction}`}
              value={`${option.key}:${option.direction}`}
            >
              {option.label}
            </option>
          ))}
        </select>
        {/* Authored chevron instead of the browser's: same ink in both themes. */}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink" />
      </div>
    </div>
  );
}
