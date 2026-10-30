"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "./button";
import { cx } from "./cx";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** The confirmed action is running: both buttons lock. */
  busy?: boolean;
  className?: string;
}

/**
 * A confirmation on the native <dialog>: showModal gives the focus trap, the
 * inert page and Escape for free. It stays controlled: Escape raises
 * onCancel and the parent decides to close. Focus starts on the safe choice
 * and goes back to whatever opened the dialog.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  busy = false,
  className,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      opener.current = document.activeElement;
      if (!dialog.open) dialog.showModal();
      cancelRef.current?.focus();
      return;
    }

    if (dialog.open) dialog.close();
    if (opener.current instanceof HTMLElement) opener.current.focus();
    opener.current = null;
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: keep the dialog open until the parent flips `open`.
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className={cx(
        "m-auto w-[min(26rem,calc(100vw-2rem))] border-2 border-ink bg-paper p-6 text-ink",
        "backdrop:bg-ink/50",
        className,
      )}
    >
      <h2 id={titleId} className="font-condensed text-2xl font-extrabold">
        {title}
      </h2>
      {description && <p className="mt-2 text-ink-muted">{description}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button
          ref={cancelRef}
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button aria-busy={busy || undefined} disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
