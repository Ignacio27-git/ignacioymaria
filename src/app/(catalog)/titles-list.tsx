import Link from "next/link";
import { redirect } from "next/navigation";

import { AddAction } from "@/components/ui/add-action";
import {
  CriticsTable,
  CriticsTableHeader,
  CriticsTableRow,
} from "@/components/ui/critics-table";
import { Masthead } from "@/components/ui/masthead";
import type { TitleList } from "@/domain/title-order";
import { formatAddedDate, formatWatchDate } from "@/lib/titles/format-date";
import { parseListParams, type RawSearchParams } from "@/lib/titles/list-params";
import { listTitles } from "@/server/titles/list";
import type { TitleView } from "@/server/titles/types";

import { ListControls } from "./list-controls";

const HEADINGS: Record<TitleList, string> = {
  vistas: "Vistas",
  pendientes: "Pendientes",
};

/**
 * The date column: when it was watched in Vistas, when it was added in
 * Pendientes (the same date "fecha" sorts by, A3).
 */
function dateFor(list: TitleList, { title, createdAt }: TitleView): string {
  if (list === "pendientes") return formatAddedDate(createdAt);
  return title.watchDate.kind === "known"
    ? formatWatchDate(title.watchDate.date)
    : "—";
}

/**
 * One catalog list, shared by /vistas and /pendientes: reads the URL state,
 * asks the use case for the filtered and sorted titles, and renders the
 * critics' table. Rows carry no posters.
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
      <ListControls
        list={list}
        q={q}
        selectedStates={selectedStates}
        order={order}
      />

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
      ) : (
        <CriticsTable label={heading}>
          <CriticsTableHeader showDate />
          {rows.map((row) => (
            <CriticsTableRow
              key={row.id}
              href={`/titulo/${row.id}`}
              name={row.title.name}
              year={row.title.year}
              state={row.title.state}
              maria={row.title.scores.maria}
              ignacio={row.title.scores.ignacio}
              average={row.average}
              watchedOn={dateFor(list, row)}
            />
          ))}
        </CriticsTable>
      )}

      <AddAction href={`/anadir?desde=${list}`} />
    </main>
  );
}
