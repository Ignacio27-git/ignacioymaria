"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  relinkTitleAction,
  searchRelinkCandidatesAction,
} from "@/app/_actions/titles";
import { Button } from "@/components/ui/button";
import {
  CandidateRow,
  KIND_LABELS,
  OPEN_FICHA,
} from "@/components/ui/candidate-row";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Poster } from "@/components/ui/poster";
import { TextField } from "@/components/ui/text-field";
import { TmdbAttribution } from "@/components/ui/tmdb-attribution";
import type { AddCandidate } from "@/server/titles/add-candidates";
import type { RelinkFailure } from "@/server/titles/relink";

export const SEARCH_DEBOUNCE_MS = 250;

/** What the island needs to know of the title being relinked. */
export interface RelinkCurrent {
  name: string;
  year: number | null;
  kind: "movie" | "series";
  posterPath: string | null;
  tmdbId: number | null;
}

type Search =
  | { status: "idle" }
  | { status: "loading"; items: AddCandidate[] | null }
  | { status: "done"; items: AddCandidate[] }
  | { status: "error" };

type Notice =
  | { kind: "duplicate"; existingId: string | null }
  | { kind: "seasons" | "tmdb" | "not_found" | "generic" };

const NOTICE_TEXT = {
  seasons:
    "Esta serie tiene varias temporadas registradas y no puede pasar a ser una película.",
  tmdb: "No se pudo cargar la ficha de TMDB. Inténtalo de nuevo.",
  not_found: "Este título ya no está en la lista.",
  generic: "No se pudo vincular. Inténtalo de nuevo.",
} as const;

const DEFAULT_COPY =
  "Se conservan las notas, el estado, la fecha, las observaciones y las temporadas.";
const FOLD_COPY =
  "La serie tiene una sola temporada: su estado, su fecha y las dos notas pasan a la película y la temporada se elimina. Las observaciones se conservan.";

function noticeFor(error: RelinkFailure): Notice {
  switch (error.kind) {
    case "duplicate":
      return { kind: "duplicate", existingId: error.existingId };
    case "invalid_input":
      return error.errors.some((issue) => issue.code === "series_has_seasons")
        ? { kind: "seasons" }
        : { kind: "generic" };
    case "tmdb_unavailable":
      return { kind: "tmdb" };
    case "not_found":
      return { kind: "not_found" };
    default:
      return { kind: "generic" };
  }
}

const keyOf = ({ kind, tmdbId }: { kind: string; tmdbId: number }) =>
  `${kind}-${tmdbId}`;

/**
 * Relink a title with TMDB from its ficha: an inline search panel, then a
 * before/after confirmation. The server re-fetches the details and decides
 * the write path, so only ids leave the client; a series with several
 * seasons is blocked here too, for a faster answer (the server still guards).
 */
export function RelinkIsland({
  id,
  current,
  seasonCount,
}: {
  id: string;
  current: RelinkCurrent;
  seasonCount: number;
}) {
  const router = useRouter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [picked, setPicked] = useState<AddCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Only the latest request may paint results; the guard ref blocks a second
  // confirm while the first is still on its way.
  const requestSeq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const confirming = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  function runSearch(value: string, delay: number) {
    clearTimeout(timer.current);
    const query = value.trim();
    const seq = ++requestSeq.current;
    if (query === "") {
      setSearch({ status: "idle" });
      return;
    }
    const execute = async () => {
      setSearch((previous) => ({
        status: "loading",
        items:
          previous.status === "done" || previous.status === "loading"
            ? previous.items
            : null,
      }));
      const result = await searchRelinkCandidatesAction(id, query);
      if (seq !== requestSeq.current) return;
      setSearch(
        result.ok
          ? { status: "done", items: result.value }
          : result.error.kind === "not_found"
            ? { status: "done", items: [] }
            : { status: "error" },
      );
    };
    if (delay === 0) void execute();
    else timer.current = setTimeout(execute, delay);
  }

  function openPanel() {
    setOpen(true);
    setText(current.name);
    setNotice(null);
    setDone(false);
    runSearch(current.name, 0);
  }

  function closePanel() {
    requestSeq.current++;
    clearTimeout(timer.current);
    setOpen(false);
    setNotice(null);
    setPicked(null);
    setSearch({ status: "idle" });
    trigger.current?.focus();
  }

  function onChange(value: string) {
    setText(value);
    setNotice(null);
    runSearch(value, SEARCH_DEBOUNCE_MS);
  }

  function choose(candidate: AddCandidate) {
    setNotice(null);
    if (current.kind === "series" && candidate.kind === "movie" && seasonCount >= 2) {
      setNotice({ kind: "seasons" });
      return;
    }
    setPicked(candidate);
  }

  async function confirm() {
    if (confirming.current || picked === null) return;
    confirming.current = true;
    setBusy(true);
    const result = await relinkTitleAction(id, picked.kind, picked.tmdbId);
    confirming.current = false;
    setBusy(false);
    setPicked(null);
    if (result.ok) {
      closePanel();
      setDone(true);
      router.refresh();
      return;
    }
    setNotice(noticeFor(result.error));
  }

  const isFold =
    current.kind === "series" && picked?.kind === "movie" && seasonCount === 1;
  const linked = current.tmdbId !== null;
  const items =
    search.status === "done" || search.status === "loading" ? search.items : null;

  return (
    <section aria-label="Ficha de TMDB" className="flex flex-col items-start gap-4">
      <Button
        ref={trigger}
        variant="secondary"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        {linked ? "Cambiar ficha de TMDB" : "Vincular con TMDB"}
      </Button>

      <p role="status" className="text-sm empty:hidden">
        {done && "Ficha actualizada."}
      </p>

      {open && (
        <div
          id={panelId}
          className="flex w-full flex-col gap-4 border-t border-rule pt-4"
        >
          <h2
            ref={heading}
            tabIndex={-1}
            className="font-condensed text-2xl font-extrabold outline-none"
          >
            Elegir ficha de TMDB
          </h2>
          <form
            role="search"
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(text, 0);
            }}
          >
            <TextField
              label="Buscar película o serie"
              type="search"
              name="q"
              autoComplete="off"
              enterKeyHint="search"
              value={text}
              onChange={(event) => onChange(event.target.value)}
            />
          </form>

          {notice && <NoticeBox notice={notice} onClose={() => setNotice(null)} />}

          <p role="status" className="text-ink-muted empty:hidden">
            {search.status === "loading" && "Buscando…"}
            {search.status === "done" && items?.length === 0 && (
              <span className="font-condensed text-title font-bold text-ink">
                Sin resultados
              </span>
            )}
          </p>

          {search.status === "error" && (
            <p role="alert" className="border border-rule-strong p-4">
              No se pudo buscar en TMDB. Inténtalo de nuevo.
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
                  busy={false}
                  disabled={false}
                  note={
                    candidate.kind === current.kind &&
                    candidate.tmdbId === current.tmdbId
                      ? "Ficha actual"
                      : undefined
                  }
                  onChoose={() => choose(candidate)}
                />
              ))}
            </ul>
          )}

          <TmdbAttribution />
          <Button variant="ghost" size="sm" className="self-start" onClick={closePanel}>
            Cerrar
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={picked !== null}
        title={linked ? "¿Cambiar la ficha de TMDB?" : "¿Vincular con TMDB?"}
        description={isFold ? FOLD_COPY : DEFAULT_COPY}
        confirmLabel={linked ? "Cambiar ficha" : "Vincular"}
        busy={busy}
        onConfirm={confirm}
        onCancel={() => setPicked(null)}
      >
        {picked && (
          <div className="mt-4 flex flex-col gap-3">
            <BeforeAfter label="Ahora" entry={current} />
            <BeforeAfter label="Pasará a ser" entry={picked} />
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}

function BeforeAfter({
  label,
  entry,
}: {
  label: string;
  entry: {
    name: string;
    year: number | null;
    kind: "movie" | "series";
    posterPath: string | null;
  };
}) {
  const { name, year, kind, posterPath } = entry;
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-3 border-t border-rule pt-3"
    >
      <Poster path={posterPath} name={name} decorative className="w-12" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-ink-muted">{label}</span>
        <span className="font-condensed text-title font-bold [overflow-wrap:anywhere]">
          {name}
        </span>
        <span className="text-sm text-ink-muted tabular-nums">
          {year === null ? KIND_LABELS[kind] : `${year} · ${KIND_LABELS[kind]}`}
        </span>
      </span>
    </div>
  );
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
