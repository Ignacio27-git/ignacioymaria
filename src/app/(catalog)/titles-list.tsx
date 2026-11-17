import Link from "next/link";
import { redirect } from "next/navigation";

import { AddAction } from "@/components/ui/add-action";
import {
  CriticsTable,
  CriticsTableHeader,
  CriticsTableRow,
} from "@/components/ui/critics-table";
import { Masthead } from "@/components/ui/masthead";
import { TitleCard, TitleCardGrid } from "@/components/ui/title-card";
import type { TitleList } from "@/domain/title-order";
import { formatAddedDate, formatWatchDate } from "@/lib/titles/format-date";
import { parseListParams, type RawSearchParams } from "@/lib/titles/list-params";
import { readListView } from "@/server/list-view/read-preference";
import { listTitles } from "@/server/titles/list";
import type { TitleView } from "@/server/titles/types";

import { ListControls } from "./list-controls";
import { ListViewToggle } from "./list-view-toggle";

const HEADINGS: Record<TitleList, string> = {
  vistas: "Vistas",
  pendientes: "Pendientes",
};

/**
 * The date column: when it was watched in Vistas, when it was added in
 * Pendientes (the same date "fecha" sorts by, A3).
 */
function dateFor(list: TitleList, { summary, createdAt }: TitleView): string {
  if (list === "pendientes") return formatAddedDate(createdAt);
  return summary.watchDate.kind === "known"
    ? formatWatchDate(summary.watchDate.date)
    : "—";
}

/**
 * One catalog list, shared by /vistas and /pendientes: reads the URL state,
 * asks the use case for the filtered and sorted titles, and renders them as
 * the critics' table (rows carry no posters) or as the card grid, per the
 * device's stored view.
 */
export async function TitlesList({
  list,
  searchParams,
}: {
  list: TitleList;
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const { q, selectedStates, order } = parseListParams(list, raw);
  const view = await readListView();
  const result = await listTitles(list, raw);

  if (!result.ok && result.error.kind === "unauthorized") {
    redirect("/login");
  }

  const heading = HEADINGS[list];
  const rows = result.ok ? result.value : [];
  const isFiltered = q !== "" || selectedStates.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-table flex-1 flex-col gap-5 px-4 pb-28 pt-6 sm:px-6">
      <Masthead title={heading} count={rows.length} as="h1" />
      <div className="flex flex-col gap-3">
        <ListControls
          list={list}
          q={q}
          selectedStates={selectedStates}
          order={order}
        />
        <ListViewToggle value={view} />
      </div>

      {!result.ok ? (
        <p role="alert" className="border border-rule-strong p-4">
          No se pudo cargar la lista. Inténtalo de nuevo.
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="font-condensed text-title font-bold">
            {isFiltered ? "Sin resultados" : "Aún no hay títulos"}
          </p>
          {isFiltered && (
            <Link href={`/${list}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
              Limpiar filtros
            </Link>
          )}
        </div>
      ) : view === "grid" ? (
        <TitleCardGrid label={heading}>
          {rows.map((row) => (
            <TitleCard
              key={row.id}
              href={`/titulo/${row.id}`}
              name={row.title.name}
              year={row.title.year}
              posterPath={row.title.posterPath ?? null}
              state={row.summary.state}
              maria={row.summary.scores.maria}
              ignacio={row.summary.scores.ignacio}
              average={row.summary.average}
              watchedOn={dateFor(list, row)}
            />
          ))}
        </TitleCardGrid>
      ) : (
        <CriticsTable label={heading}>
          <CriticsTableHeader showDate />
          {rows.map((row) => (
            <CriticsTableRow
              key={row.id}
              href={`/titulo/${row.id}`}
              name={row.title.name}
              year={row.title.year}
              state={row.summary.state}
              maria={row.summary.scores.maria}
              ignacio={row.summary.scores.ignacio}
              average={row.summary.average}
              watchedOn={dateFor(list, row)}
            />
          ))}
        </CriticsTable>
      )}

      <AddAction href={`/anadir?desde=${list}`} />
    </main>
  );
}
