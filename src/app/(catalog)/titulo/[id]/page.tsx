import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Poster } from "@/components/ui/poster";
import { TmdbAttribution } from "@/components/ui/tmdb-attribution";
import { todayIso, type Person, type WatchState } from "@/domain";
import { LIST_STATES } from "@/lib/titles/list-params";
import { getCurrentPerson } from "@/server/auth/current-person";
import { getTitle } from "@/server/titles/get";
import type { TitleView } from "@/server/titles/types";

import { FichaEditor } from "./ficha-editor";

export const metadata: Metadata = { title: "Ficha · Ignacio y María" };

const KIND_LABELS = { movie: "Película", series: "Serie" } as const;
const MAX_ACTORS = 5;

function listOf(state: WatchState): "vistas" | "pendientes" {
  return (LIST_STATES.vistas as readonly WatchState[]).includes(state)
    ? "vistas"
    : "pendientes";
}

/** "Serie · 2011 · 8 temporadas": whatever of kind, year and seasons is known. */
function facts({ title }: TitleView): string {
  const parts: string[] = [KIND_LABELS[title.kind]];
  if (title.year !== null) parts.push(String(title.year));
  if (title.kind === "series" && title.seasonsTotal !== null) {
    parts.push(
      `${title.seasonsTotal} ${title.seasonsTotal === 1 ? "temporada" : "temporadas"}`,
    );
  }
  return parts.join(" · ");
}

const MAIN = "mx-auto flex w-full max-w-table flex-1 flex-col gap-8 px-4 pb-16 pt-6 sm:px-6";
const BACK = "inline-flex min-h-11 items-center self-start underline underline-offset-4";

/**
 * One title: the facts and poster are rendered here on the server; everything
 * editable lives in the client editor, which saves field by field (TD-2). An
 * unknown or malformed id is a 404 without a database round trip.
 */
export default async function TitlePage({ params }: PageProps<"/titulo/[id]">) {
  const { id } = await params;
  const [result, me] = await Promise.all([getTitle(id), getCurrentPerson()]);

  if (!result.ok && result.error.kind === "not_found") notFound();
  if (me === null || (!result.ok && result.error.kind === "unauthorized")) {
    redirect("/login");
  }

  if (!result.ok) {
    return (
      <main className={MAIN}>
        <Link href="/vistas" className={BACK}>
          Volver a Vistas
        </Link>
        <p role="alert" className="border border-rule-strong p-4">
          No se pudo cargar la ficha. Inténtalo de nuevo.
        </p>
      </main>
    );
  }

  const record = result.value;
  const { title } = record;
  const other: Person = me === "maria" ? "ignacio" : "maria";
  const list = listOf(title.state);

  return (
    <main className={MAIN}>
      <Link href={`/${list}`} className={BACK}>
        Volver a {list === "vistas" ? "Vistas" : "Pendientes"}
      </Link>

      <header className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
        <Poster path={title.posterPath} name={title.name} className="w-24 sm:w-36" />
        <div className="flex flex-col gap-3">
          <h1 className="border-b-2 border-ink pb-2 font-condensed text-masthead tracking-tight text-balance [overflow-wrap:anywhere]">
            {title.name}
          </h1>
          <p className="text-ink-muted tabular-nums">{facts(record)}</p>
          {title.actors.length > 0 && (
            <p className="text-sm text-ink-muted">
              Reparto: {title.actors.slice(0, MAX_ACTORS).join(", ")}
            </p>
          )}
        </div>
      </header>

      <FichaEditor
        id={record.id}
        name={title.name}
        me={me}
        today={todayIso()}
        otherScore={title.scores[other]}
        initial={{
          state: title.state,
          watchDate: title.watchDate,
          observations: title.observations,
          myScore: title.scores[me],
          average: record.average,
        }}
      />

      {title.tmdbId !== null && <TmdbAttribution />}
    </main>
  );
}
