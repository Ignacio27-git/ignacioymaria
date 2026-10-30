import type { ComponentProps } from "react";

import { cx } from "./cx";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

// No variant inverts the ground: the average box is the only inverted element.
const VARIANTS: Record<ButtonVariant, string> = {
  // A heavier bottom rule marks the action; selection and error look different.
  primary: "border-2 border-b-4 border-ink font-semibold",
  secondary: "border border-rule-strong",
  ghost: "border border-transparent underline underline-offset-4",
};

// Both sizes keep the 44px touch target; "sm" only tightens type and padding.
const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-base",
  sm: "min-h-11 px-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center bg-paper text-ink",
        "transition-[transform,background-color] duration-150 ease-out",
        "hover:bg-surface active:scale-[0.98] motion-reduce:transition-none",
        "disabled:border-rule disabled:text-ink-muted disabled:hover:bg-paper disabled:active:scale-100",
        "aria-busy:cursor-progress",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
