import type { ComponentProps } from "react";

import { cx } from "./cx";

type IconProps = Omit<ComponentProps<"svg">, "children">;

// One authored set: 16px grid, 2px round stroke, drawn in the current ink.
// Decorative by contract: the text next to each icon always carries the meaning.
function Icon({ className, children, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cx("size-4 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function CheckMark(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8.5 6.2 11.7 13 4.8" />
    </Icon>
  );
}

export function PlusMark(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m3 6 5 5 5-5" />
    </Icon>
  );
}
