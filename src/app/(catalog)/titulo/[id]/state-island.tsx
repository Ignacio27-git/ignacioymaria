import { StatePicker } from "@/components/ui/state-picker";
import type { Result } from "@/domain";
import type { WatchState } from "@/domain/watch-state";
import type { TitleFailure, TitleView } from "@/server/titles/types";

import { FieldIsland } from "./field-island";
import { useFieldSave } from "./use-field-save";

/** The six legend states; saving one may also set the date on the server (A2). */
export function StateIsland({
  state,
  save,
  onSaved,
}: {
  state: WatchState;
  /** The write behind the picker: the title's or one season's. */
  save: (value: WatchState) => Promise<Result<TitleView, TitleFailure>>;
  onSaved: (view: TitleView) => void;
}) {
  const field = useFieldSave<WatchState>({
    confirmed: state,
    save,
    onSaved: (view) => onSaved(view),
  });

  return (
    <FieldIsland busy={field.busy} failed={field.failed}>
      <StatePicker value={field.value} onChange={field.commit} />
    </FieldIsland>
  );
}
