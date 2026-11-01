"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  addFromTmdbAction,
  addManualAction,
  searchAddCandidatesAction,
} from "@/app/_actions/titles";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { CheckMark } from "@/components/ui/icons";
import { Poster } from "@/components/ui/poster";
import { TextField } from "@/components/ui/text-field";
import { TmdbAttribution } from "@/components/ui/tmdb-attribution";
import type { AddOrigin } from "@/lib/titles/add-origin";
import type { AddCandidate } from "@/server/titles/add-candidates";
import type { TitleFailure } from "@/server/titles/types";
import type { TmdbFailure } from "@/server/tmdb/types";

export const SEARCH_DEBOUNCE_MS = 250;

const KIND_LABELS = { movie: "Película", series: "Serie" } as const;

type Search =
  | { status: "idle" }
  | { status: "loading"; items: AddCandidate[] | null }
  | { status: "done"; items: AddCandidate[] }
  | { status: "error" };

type Notice =
  | { kind: "tmdb" }
  | { kind: "duplicate"; existingId: string | null }
  | { kind: "generic" };

const NOTICE_TEXT = {
  tmdb: "No se pudo cargar la ficha de TMDB. Inténtalo de nuevo.",
  generic: "No se pudo añadir. Inténtalo de nuevo.",
} as const;

const OPEN_FICHA =
  "inline-flex min-h-11 items-center underline underline-offset-4";

/**
 * The add flow: TMDB search as you type, a pick that creates the title on the
 * server (which re-fetches the details itself, so nothing the client sends is
 * trusted) and a manual form that is always on the page. `desde` is the list
 * the user came from and decides the initial state of the new title (A1).
 */
export function AddForm({ desde }: { desde: AddOrigin }) {
  const [text, setText] = useState("");
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Only the latest request may paint results; the guard ref blocks a second
  // tap while the first creation is still on its way.
  const requestSeq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const adding = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  function onSearch(value: string) {
    setText(value);
    setNotice(null);
    clearTimeout(timer.current);
    const query = value.trim();
    const seq = ++requestSeq.current;

    if (query === "") {
      setSearch({ status: "idle" });
      return;
    }
    timer.current = setTimeout(async () => {
      setSearch((current) => ({
        status: "loading",
        items:
          current.status === "done" || current.status === "loading"
            ? current.items
            : null,
      }));
      const result = await searchAddCandidatesAction(query);
      if (seq !== requestSeq.current) return;
      setSearch(
        result.ok
          ? { status: "done", items: result.value }
          : result.error.kind === "not_found"
            ? { status: "done", items: [] }
            : { status: "error" },
      );
    }, SEARCH_DEBOUNCE_MS);
  }

  function choose(candidate: AddCandidate) {
    if (adding.current) return;
    adding.current = true;
    setNotice(null);
    setPickedKey(keyOf(candidate));

    startTransition(async () => {
      // A success redirects to the ficha and never returns here.
      const result = await addFromTmdbAction(
        candidate.kind,
        candidate.tmdbId,
        desde,
      );
      adding.current = false;
      setPickedKey(null);
      if (result && !result.ok) setNotice(noticeFor(result.error));
    });
  }

  const items =
    search.status === "done" || search.status === "loading" ? search.items : null;

  return (
    <div className="flex flex-col gap-10">
      <section aria-label="Buscar en TMDB" className="flex flex-col gap-4">
        <TextField
          label="Buscar película o serie"
          type="search"
          name="q"
          placeholder="Por ejemplo, Dune"
          autoComplete="off"
          enterKeyHint="search"
          value={text}
          onChange={(event) => onSearch(event.target.value)}
        />

        {notice && <NoticeBox notice={notice} onClose={() => setNotice(null)} />}

        <p role="status" className="text-ink-muted empty:hidden">
          {search.status === "loading" && "Buscando…"}
          {search.status === "done" && items?.length === 0 && (
            <span className="flex flex-col items-start gap-1">
              <span className="font-condensed text-title font-bold text-ink">
                Sin resultados
              </span>
              <a href="#anadir-a-mano" className={OPEN_FICHA}>
                Añadir a mano
              </a>
            </span>
          )}
        </p>

        {search.status === "error" && (
          <p role="alert" className="border border-rule-strong p-4">
            No se pudo buscar en TMDB. Puedes añadirlo a mano.
          </p>
        )}

        {items && items.length > 0 && (
          <ul
            aria-label="Resultados de TMDB"
            aria-busy={search.status === "loading" || undefined}
            className="flex flex-col border-t border-rule"
          >
            {items.map((candidate) => (
              <CandidateRow
                key={keyOf(candidate)}
                candidate={candidate}
                busy={pickedKey === keyOf(candidate)}
                disabled={pickedKey !== null}
                onChoose={() => choose(candidate)}
              />
            ))}
          </ul>
        )}

        <TmdbAttribution />
      </section>

      <ManualForm desde={desde} />
    </div>
  );
}

function keyOf({ kind, tmdbId }: AddCandidate): string {
  return `${kind}-${tmdbId}`;
}

function noticeFor(error: TitleFailure | TmdbFailure): Notice {
  if (error.kind === "duplicate") {
    return { kind: "duplicate", existingId: error.existingId };
  }
  // A TMDB failure (the details could not be loaded) versus anything else.
  return error.kind === "unavailable" || error.kind === "not_found"
    ? { kind: "tmdb" }
    : { kind: "generic" };
}

function NoticeBox({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-x-4 border-2 border-ink p-3"
    >
      {notice.kind === "duplicate" ? (
        <span className="flex flex-wrap items-center gap-x-4">
          <span className="font-semibold">Ya está en la lista</span>
          {notice.existingId && (
            <Link href={`/titulo/${notice.existingId}`} className={OPEN_FICHA}>
              Abrir ficha
            </Link>
          )}
        </span>
      ) : (
        <span>{NOTICE_TEXT[notice.kind]}</span>
      )}
      <Button variant="ghost" size="sm" onClick={onClose}>
        Cerrar aviso
      </Button>
    </div>
  );
}

function CandidateRow({
  candidate,
  busy,
  disabled,
  onChoose,
}: {
  candidate: AddCandidate;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const { name, year, kind, posterPath, existingId } = candidate;
  const body = (
    <>
      <Poster path={posterPath} name={name} decorative className="w-12" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-condensed text-title font-bold">{name}</span>
        <span className="text-sm text-ink-muted tabular-nums">
          {year === null ? KIND_LABELS[kind] : `${year} · ${KIND_LABELS[kind]}`}
        </span>
      </span>
    </>
  );
  const row = "flex min-h-[4.5rem] w-full items-center gap-3 border-b border-rule py-2";

  if (existingId !== null) {
    return (
      <li className={cx(row, "flex-wrap")}>
        {body}
        <span className="flex flex-col items-end text-sm">
          <span>Ya está en la lista</span>
          <Link href={`/titulo/${existingId}`} className={OPEN_FICHA}>
            Abrir ficha
          </Link>
        </span>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        aria-busy={busy || undefined}
        onClick={onChoose}
        className={cx(
          row,
          "pr-3 text-left transition-colors duration-150 motion-reduce:transition-none",
          "hover:bg-surface disabled:text-ink-muted disabled:hover:bg-paper",
        )}
      >
        {body}
        {busy && <span className="text-sm">Añadiendo…</span>}
      </button>
    </li>
  );
}

function ManualForm({ desde }: { desde: AddOrigin }) {
  const [state, formAction, pending] = useActionState(addManualAction, null);
  // Controlled so a failed submit keeps what was typed (React resets forms).
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"movie" | "series">("movie");

  const failure = state && !state.ok ? state.error : null;
  const nameMissing =
    failure?.kind === "invalid_input" &&
    failure.errors.some((issue) => issue.field === "name");
  const generic = failure !== null && !nameMissing;

  return (
    <section
      id="anadir-a-mano"
      aria-labelledby="anadir-a-mano-titulo"
      className="flex scroll-mt-6 flex-col gap-5 border-t-2 border-ink pt-5"
    >
      <h2
        id="anadir-a-mano-titulo"
        className="font-condensed text-2xl font-extrabold"
      >
        Añadir a mano
      </h2>
      <form action={formAction} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="desde" value={desde} />
        <TextField
          label="Título"
          name="name"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameMissing ? "Introduce un título" : undefined}
        />
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-medium">Tipo</legend>
          <div role="presentation" className="flex flex-wrap gap-2">
            {(["movie", "series"] as const).map((option) => (
              <label
                key={option}
                className={cx(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm text-ink",
                  "transition-colors duration-150 motion-reduce:transition-none",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                  kind === option
                    ? "border-ink bg-surface font-semibold"
                    : "border-rule-strong bg-paper hover:bg-surface",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={option}
                  checked={kind === option}
                  onChange={() => setKind(option)}
                  className="sr-only"
                />
                {kind === option && <CheckMark />}
                {KIND_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          Añadir a la lista
        </Button>
        {generic && (
          <p role="alert" className="border border-rule-strong p-4">
            {NOTICE_TEXT.generic}
          </p>
        )}
      </form>
    </section>
  );
}
