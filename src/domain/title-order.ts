import { titleAverage, type Title } from "./title";

/** The two catalog lists; each has its own states and default order. */
export type TitleList = "vistas" | "pendientes";

/**
 * Supported orders. `priority` (Urgente first, then newest added) exists only
 * for Pendientes; `fecha` is the watch date in Vistas and the date added in
 * Pendientes.
 */
export type TitleOrder = "fecha" | "nota" | "priority";

/** A title with the persistence metadata sorting needs. */
export interface SortableTitle {
  readonly id: string;
  /** ISO timestamp the row was created. */
  readonly createdAt: string;
  readonly title: Title;
}

const collator = new Intl.Collator("es");

type Compare = (a: SortableTitle, b: SortableTitle) => number;

const time = (item: SortableTitle) => Date.parse(item.createdAt);

/** name (es), then newest added, then id: a total, stable order. */
const byTieBreak: Compare = (a, b) =>
  collator.compare(a.title.name, b.title.name) ||
  time(b) - time(a) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const byCreatedDesc: Compare = (a, b) => time(b) - time(a);

/** Descending by value; null always last. */
function descNullsLast(
  value: (item: SortableTitle) => number | null,
): Compare {
  return (a, b) => {
    const [x, y] = [value(a), value(b)];
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return y - x;
  };
}

const byAverage = descNullsLast((i) => titleAverage(i.title));

const byWatchDate = descNullsLast((i) =>
  i.title.watchDate.kind === "known"
    ? Date.parse(i.title.watchDate.date)
    : null,
);

const byUrgentFirst: Compare = (a, b) =>
  Number(b.title.state === "urgent") - Number(a.title.state === "urgent");

function primary(order: TitleOrder, list: TitleList): Compare {
  if (order === "nota") return byAverage;
  if (order === "priority") {
    return (a, b) => byUrgentFirst(a, b) || byCreatedDesc(a, b);
  }
  return list === "vistas" ? byWatchDate : byCreatedDesc;
}

/** Returns a new, sorted array; never throws on titles without scores/dates. */
export function sortTitles(
  items: readonly SortableTitle[],
  order: TitleOrder,
  list: TitleList,
): SortableTitle[] {
  const first = primary(order, list);
  return [...items].sort((a, b) => first(a, b) || byTieBreak(a, b));
}
