import { useId } from "react";

import { updateTitleFieldAction } from "@/app/_actions/titles";
import { Button } from "@/components/ui/button";
import type { WatchDate } from "@/domain/watch-date";
import { formatWatchDate } from "@/lib/titles/format-date";
import type { TitleView } from "@/server/titles/types";

import { FieldIsland } from "./field-island";
import { useFieldSave } from "./use-field-save";

const UNKNOWN: WatchDate = { kind: "unknown" };

function sameDate(a: WatchDate, b: WatchDate): boolean {
  return a.kind === "unknown"
    ? b.kind === "unknown"
    : b.kind === "known" && a.date === b.date;
}

/**
 * The watch date: a native picker that saves on change, "Hoy" to fill in today
 * with one tap and "No sé cuándo" for an unknown date (stored as null). `today`
 * comes from the server so the client never reads its own clock.
 */
export function DateIsland({
  id,
  watchDate,
  today,
  onSaved,
}: {
  id: string;
  watchDate: WatchDate;
  today: string;
  onSaved: (view: TitleView) => void;
}) {
  const inputId = useId();
  const field = useFieldSave<WatchDate>({
    confirmed: watchDate,
    save: (value) => updateTitleFieldAction(id, { field: "watchDate", value }),
    onSaved: (view) => onSaved(view),
  });

  function choose(next: WatchDate) {
    if (!sameDate(next, field.value)) field.commit(next);
  }

  const current = field.value;

  return (
    <FieldIsland busy={field.busy} failed={field.failed}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          Fecha de visionado
        </label>
        <input
          id={inputId}
          type="date"
          value={current.kind === "known" ? current.date : ""}
          onChange={(event) =>
            choose(
              event.target.value === ""
                ? UNKNOWN
                : { kind: "known", date: event.target.value },
            )
          }
          className="min-h-11 w-full border border-rule-strong bg-paper px-3 text-base tabular-nums text-ink sm:w-60"
        />
        <p className="text-sm tabular-nums text-ink-muted">
          {current.kind === "known" ? formatWatchDate(current.date) : "No sé cuándo"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={current.kind === "known" && current.date === today}
          onClick={() => choose({ kind: "known", date: today })}
        >
          Hoy
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={current.kind === "unknown"}
          onClick={() => choose(UNKNOWN)}
        >
          No sé cuándo
        </Button>
      </div>
    </FieldIsland>
  );
}
