import { useEffect, useRef, useState } from "react";

import type { Result } from "@/domain";
import type { TitleFailure, TitleView } from "@/server/titles/types";

export interface FieldSaveOptions<T> {
  /** The last value the server confirmed, owned by the parent. */
  confirmed: T;
  save: (value: T) => Promise<Result<TitleView, TitleFailure>>;
  /** Called with the server's answer so the parent can adopt what it needs. */
  onSaved: (view: TitleView, saved: T) => void;
}

export interface FieldSave<T> {
  /** What to show: the pending change, else the confirmed value. */
  value: T;
  /** A save is in flight. */
  busy: boolean;
  /** The last save failed and the value was rolled back. */
  failed: boolean;
  /** Confirmed saves so far; each increase plays the score stamp once. */
  savedCount: number;
  commit: (next: T) => void;
}

/**
 * Optimistic save of one field (D-62). The new value shows at once; saves of
 * the same field run one at a time and, while one is in flight, only the
 * latest newer value is kept. A failure rolls back to the last confirmed
 * value and drops what was queued. Other fields have their own instance, so
 * none overwrites another.
 */
export function useFieldSave<T>({
  confirmed,
  save,
  onSaved,
}: FieldSaveOptions<T>): FieldSave<T> {
  const [draft, setDraft] = useState<{ value: T } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const inFlight = useRef(false);
  const queued = useRef<{ value: T } | null>(null);
  const callbacks = useRef({ save, onSaved });
  useEffect(() => {
    callbacks.current = { save, onSaved };
  });

  async function drain(first: { value: T }) {
    inFlight.current = true;
    setBusy(true);

    let item: { value: T } | null = first;
    let rolledBack = false;
    while (item) {
      const { save: run, onSaved: adopt } = callbacks.current;
      let result: Result<TitleView, TitleFailure> | null;
      try {
        result = await run(item.value);
      } catch {
        result = null;
      }

      if (result?.ok) {
        adopt(result.value, item.value);
        setSavedCount((count) => count + 1);
        item = queued.current;
        queued.current = null;
      } else {
        rolledBack = true;
        queued.current = null;
        item = null;
      }
    }

    if (rolledBack) setFailed(true);
    setDraft(null);
    inFlight.current = false;
    setBusy(false);
  }

  function commit(next: T) {
    setFailed(false);
    setDraft({ value: next });
    if (inFlight.current) {
      queued.current = { value: next };
      return;
    }
    void drain({ value: next });
  }

  return {
    value: draft ? draft.value : confirmed,
    busy,
    failed,
    savedCount,
    commit,
  };
}
