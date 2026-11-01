import { useId, useState } from "react";

import { updateTitleFieldAction } from "@/app/_actions/titles";
import type { TitleView } from "@/server/titles/types";

import { FieldIsland } from "./field-island";
import { useFieldSave } from "./use-field-save";

/**
 * Free notes. Typing is local; the text is saved once, on blur, with line
 * breaks intact. Blank text is stored as null.
 */
export function ObservationsIsland({
  id,
  observations,
  onSaved,
}: {
  id: string;
  observations: string | null;
  onSaved: (view: TitleView) => void;
}) {
  const inputId = useId();
  // The text being typed; null while the saved (or pending) value is shown.
  const [typing, setTyping] = useState<string | null>(null);
  const field = useFieldSave<string | null>({
    confirmed: observations,
    save: (value) => updateTitleFieldAction(id, { field: "observations", value }),
    onSaved: (view) => onSaved(view),
  });

  function save() {
    if (typing === null) return;
    const next = typing.trim() === "" ? null : typing;
    setTyping(null);
    if (next !== field.value) field.commit(next);
  }

  return (
    <FieldIsland busy={field.busy} failed={field.failed}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          Observaciones
        </label>
        <textarea
          id={inputId}
          rows={4}
          value={typing ?? field.value ?? ""}
          onChange={(event) => setTyping(event.target.value)}
          onBlur={save}
          className="min-h-28 w-full border border-rule-strong bg-paper p-3 text-base text-ink"
        />
      </div>
    </FieldIsland>
  );
}
