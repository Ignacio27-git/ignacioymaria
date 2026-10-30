import { type ComponentProps, useId } from "react";

import { cx } from "./cx";

export type TextFieldProps = Omit<ComponentProps<"input">, "className"> & {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  /** Applied to the wrapper; every other native prop goes to the input. */
  className?: string;
};

export function TextField({
  label,
  hideLabel = false,
  hint,
  error,
  className,
  id,
  "aria-describedby": describedBy,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const description =
    [hintId, errorId, describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={inputId}
        className={cx("text-sm font-medium", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <input
        {...inputProps}
        id={inputId}
        aria-describedby={description}
        aria-invalid={error ? true : undefined}
        className={cx(
          "min-h-11 w-full border border-rule-strong bg-paper px-3 text-base text-ink",
          "placeholder:text-ink-muted",
          "aria-invalid:border-2 aria-invalid:border-ink",
        )}
      />
      {hint && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
