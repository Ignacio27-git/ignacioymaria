import type { ChangeEvent } from "react";

import { cx } from "./cx";

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
      <select
        id={selectId}
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={handleChange}
        className="min-h-11 border border-rule-strong bg-paper px-3 text-sm text-ink"
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
    </div>
  );
}
