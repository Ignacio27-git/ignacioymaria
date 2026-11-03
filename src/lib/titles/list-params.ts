import type { TitleList, TitleOrder, WatchState } from "@/domain";

/** The watch states each list shows; a title is never in both. */
export const LIST_STATES = {
  vistas: [
    "watched",
    "watched_rewatch",
    "watched_no_rewatch",
    "watched_awful",
  ],
  pendientes: ["urgent", "pending"],
} as const satisfies Record<TitleList, readonly WatchState[]>;

/** Allowed orders per list; the first one is the default. */
export const LIST_ORDERS = {
  vistas: ["fecha", "nota"],
  pendientes: ["priority", "nota", "fecha"],
} as const satisfies Record<TitleList, readonly TitleOrder[]>;

export const MAX_QUERY_LENGTH = 100;

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface ListParams {
  /** Trimmed search text, at most MAX_QUERY_LENGTH characters. */
  readonly q: string;
  /** States pressed in the URL; empty means none pressed. */
  readonly selectedStates: readonly WatchState[];
  /** States to query: the selection, or every state of the list. */
  readonly states: readonly WatchState[];
  readonly order: TitleOrder;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Parses the list URL state. Never throws: invalid values fall back to
 * defaults (TL-3).
 */
export function parseListParams(
  list: TitleList,
  searchParams: RawSearchParams,
): ListParams {
  const q = first(searchParams.q).trim().slice(0, MAX_QUERY_LENGTH).trim();

  const requested = new Set(first(searchParams.estado).split(","));
  const listStates: readonly WatchState[] = LIST_STATES[list];
  const selectedStates = listStates.filter((s) => requested.has(s));

  const orders: readonly TitleOrder[] = LIST_ORDERS[list];
  const requestedOrder = first(searchParams.orden);
  const order =
    orders.find((o) => o === requestedOrder) ?? LIST_ORDERS[list][0];

  return {
    q,
    selectedStates,
    states: selectedStates.length > 0 ? selectedStates : listStates,
    order,
  };
}
