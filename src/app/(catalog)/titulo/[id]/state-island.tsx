import { updateTitleFieldAction } from "@/app/_actions/titles";
import { StatePicker } from "@/components/ui/state-picker";
import type { WatchState } from "@/domain/watch-state";
import type { TitleView } from "@/server/titles/types";

import { FieldIsland } from "./field-island";
import { useFieldSave } from "./use-field-save";

/** The six legend states; saving one may also set the date on the server (A2). */
export function StateIsland({
  id,
  state,
  onSaved,
}: {
  id: string;
  state: WatchState;
  onSaved: (view: TitleView) => void;
}) {
  const field = useFieldSave<WatchState>({
    confirmed: state,
    save: (value) => updateTitleFieldAction(id, { field: "state", value }),
    onSaved: (view) => onSaved(view),
  });

  return (
    <FieldIsland busy={field.busy} failed={field.failed}>
      <StatePicker value={field.value} onChange={field.commit} />
    </FieldIsland>
  );
}
