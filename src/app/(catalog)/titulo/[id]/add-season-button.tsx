"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Result } from "@/domain";
import type { TitleFailure, TitleView } from "@/server/titles/types";

const ADD_ERROR = "No se pudo añadir la temporada. Inténtalo de nuevo.";

/**
 * Adds the next season: pending, no date, no scores (D-84). The number is the
 * server's choice; `nextNumber` only names it on the button. While the add is
 * in flight the button is disabled, so a double tap adds one season.
 */
export function AddSeasonButton({
  nextNumber,
  save,
  onAdded,
}: {
  nextNumber: number;
  save: () => Promise<Result<TitleView, TitleFailure>>;
  onAdded: (view: TitleView) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [added, setAdded] = useState<number | null>(null);

  async function add() {
    if (busy) return;
    const number = nextNumber;
    setBusy(true);
    setFailed(false);
    setAdded(null);
    let result: Result<TitleView, TitleFailure> | null;
    try {
      result = await save();
    } catch {
      result = null;
    }
    if (result?.ok) {
      onAdded(result.value);
      setAdded(number);
    } else {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        variant="primary"
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={add}
      >
        Añadir temporada {nextNumber}
      </Button>
      <p role="status" className="text-sm text-ink-muted">
        {added !== null && `Temporada ${added} añadida.`}
      </p>
      {failed && (
        <p role="alert" className="border-2 border-ink p-3 text-sm">
          {ADD_ERROR}
        </p>
      )}
    </div>
  );
}
