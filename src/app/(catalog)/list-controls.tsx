"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";

import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import {
  SortControl,
  type SortKey,
  type SortOption,
} from "@/components/ui/sort-control";
import { TextField } from "@/components/ui/text-field";
import type { TitleList, TitleOrder } from "@/domain/title-order";
import {
  WATCH_STATE_LABELS,
  type WatchState,
} from "@/domain/watch-state";
import { LIST_ORDERS, LIST_STATES } from "@/lib/titles/list-params";

export const SEARCH_DEBOUNCE_MS = 250;

export interface ListControlsProps {
  list: TitleList;
  /** Search text as parsed from the URL. */
  q: string;
  /** States pressed in the URL; empty means all. */
  selectedStates: readonly WatchState[];
  order: TitleOrder;
}

const ORDER_OPTIONS: Record<TitleOrder, SortOption> = {
  fecha: { key: "date", direction: "desc", label: "Fecha, la más reciente primero" },
  nota: { key: "score", direction: "desc", label: "Nota, de mayor a menor" },
  priority: {
    key: "priority",
    direction: "desc",
    label: "Urgente primero, recientes",
  },
};

const ORDER_FOR_KEY: Record<SortKey, TitleOrder | undefined> = {
  date: "fecha",
  score: "nota",
  priority: "priority",
  name: undefined,
};

function orderValue(order: TitleOrder) {
  return `${ORDER_OPTIONS[order].key}:desc` as const;
}

/**
 * The URL is the single source of state (TL-3): every control builds the next
 * URL and replaces it, so back/forward and shared links keep working. The
 * server re-renders the list from it.
 */
export function ListControls({
  list,
  q,
  selectedStates,
  order,
}: ListControlsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [states, setStates] = useOptimistic(selectedStates);
  const [currentOrder, setCurrentOrder] = useOptimistic(order);

  // The typed text lives here so typing never waits for the server. `requested`
  // is the last text this island put in the URL: an echo of it is ignored, any
  // other change (back/forward, a cleared filter link) replaces the text.
  const [query, setQuery] = useState(q);
  const [requested, setRequested] = useState(q);
  const [seenUrlText, setSeenUrlText] = useState(q);
  if (q !== seenUrlText) {
    setSeenUrlText(q);
    if (q !== requested) {
      setQuery(q);
      setRequested(q);
    }
  }

  const latest = useRef({ states, order: currentOrder });
  useEffect(() => {
    latest.current = { states, order: currentOrder };
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const defaultOrder = LIST_ORDERS[list][0];
  const listStates: readonly WatchState[] = LIST_STATES[list];
  const orders: readonly TitleOrder[] = LIST_ORDERS[list];

  function urlFor(text: string, nextStates: readonly WatchState[], nextOrder: TitleOrder) {
    const params = new URLSearchParams();
    if (text) params.set("q", text);
    if (nextStates.length > 0) params.set("estado", nextStates.join(","));
    if (nextOrder !== defaultOrder) params.set("orden", nextOrder);
    const search = params.toString();
    return search ? `/${list}?${search}` : `/${list}`;
  }

  function go(text: string, nextStates: readonly WatchState[], nextOrder: TitleOrder) {
    setRequested(text);
    startTransition(() => {
      setStates(nextStates);
      setCurrentOrder(nextOrder);
      router.replace(urlFor(text, nextStates, nextOrder), { scroll: false });
    });
  }

  function onSearch(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { states: s, order: o } = latest.current;
      go(value.trim(), s, o);
    }, SEARCH_DEBOUNCE_MS);
  }

  function toggle(state: WatchState) {
    clearTimeout(timer.current);
    const next = listStates.filter((candidate) =>
      candidate === state ? !states.includes(state) : states.includes(candidate),
    );
    go(query.trim(), next, currentOrder);
  }

  function sortBy({ key }: { key: SortKey }) {
    const next = ORDER_FOR_KEY[key] ?? defaultOrder;
    clearTimeout(timer.current);
    go(query.trim(), states, next);
  }

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="Buscar"
        hideLabel
        type="search"
        name="q"
        placeholder="Buscar por título"
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        onChange={(event) => onSearch(event.target.value)}
      />
      <FilterChipRow label="Filtrar por estado">
        {listStates.map((state) => (
          <FilterChip
            key={state}
            state={state}
            pressed={states.includes(state)}
            onToggle={() => toggle(state)}
          >
            {WATCH_STATE_LABELS[state]}
          </FilterChip>
        ))}
      </FilterChipRow>
      <SortControl
        label="Ordenar"
        name="orden"
        options={orders.map((o) => ORDER_OPTIONS[o])}
        value={orderValue(currentOrder)}
        onChange={sortBy}
      />
    </div>
  );
}
