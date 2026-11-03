import type { ComponentProps } from "react";

import { cx } from "@/components/ui/cx";

export const SAVE_ERROR = "No se pudo guardar. Inténtalo de nuevo.";

/**
 * The shell of one editable field of the ficha: marks the field busy while a
 * save is in flight and shows the inline failure next to it (TD-2).
 */
export function FieldIsland({
  busy,
  failed,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { busy: boolean; failed: boolean }) {
  return (
    <div
      {...props}
      aria-busy={busy || undefined}
      className={cx("flex flex-col gap-3", className)}
    >
      {children}
      {failed && (
        <p role="alert" className="border-2 border-ink p-3 text-sm">
          {SAVE_ERROR}
        </p>
      )}
    </div>
  );
}
