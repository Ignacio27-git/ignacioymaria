import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AverageBox } from "@/components/ui/average-box";
import { Button } from "@/components/ui/button";
import {
  CriticsTable,
  CriticsTableHeader,
  CriticsTableRow,
} from "@/components/ui/critics-table";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Masthead } from "@/components/ui/masthead";
import { ScoreFigure } from "@/components/ui/score-figure";
import { SortControl } from "@/components/ui/sort-control";
import { StateCell } from "@/components/ui/state-cell";
import { TextField } from "@/components/ui/text-field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WATCH_STATE_LABELS, WATCH_STATES } from "@/domain/watch-state";
import { contrastRatio } from "@/lib/design/contrast";
import {
  CONTRAST_PAIRS,
  cssVarName,
  THEMES,
  TOKENS,
  type Theme,
  type TokenName,
} from "@/lib/design/tokens";
import {
  SAMPLE_FIGURES,
  SAMPLE_ROWS,
  SAMPLE_SORT_OPTIONS,
} from "@/server/specimen/sample";
import { readThemePreference } from "@/server/theme/read-preference";

export const metadata: Metadata = {
  title: "Sistema de diseño · Ignacio y María",
};

const SAMPLE_LABEL = "Datos de muestra";

const THEME_NAMES: Record<Theme, string> = { light: "Claro", dark: "Oscuro" };

const BASE_TOKENS: readonly { token: TokenName; label: string }[] = [
  { token: "paper", label: "Fondo" },
  { token: "surface", label: "Fondo al pasar" },
  { token: "ink", label: "Tinta" },
  { token: "inkMuted", label: "Tinta atenuada" },
  { token: "rule", label: "Filete" },
  { token: "ruleStrong", label: "Filete marcado" },
];

const ratioFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Floored, never rounded up: the page must not claim more contrast than exists.
function formatRatio(ratio: number): string {
  return `${ratioFormat.format(Math.floor(ratio * 10) / 10)}:1`;
}

const ROWS_BY_NAME = [...SAMPLE_ROWS].sort((a, b) =>
  a.name.localeCompare(b.name, "es"),
);
const GUIDE_WORDS = `${ROWS_BY_NAME[0].name.split(" ")[0]} – ${
  ROWS_BY_NAME[ROWS_BY_NAME.length - 1].name.split(" ")[0]
}`;

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-14">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ContrastTable() {
  return (
    <table className="mt-6 w-full text-left text-sm">
      <caption className="sr-only">
        Contraste de cada par de colores en ambos temas
      </caption>
      <thead>
        <tr className="border-b border-rule-strong text-ink-muted">
          <th scope="col" className="py-2 pr-2 font-medium">
            Par
          </th>
          {THEMES.map((theme) => (
            <th key={theme} scope="col" className="py-2 pr-2 font-medium">
              {THEME_NAMES[theme]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CONTRAST_PAIRS.map((pair) => (
          <tr key={pair.id} className="border-b border-rule">
            <th scope="row" className="py-2 pr-2 text-left font-normal">
              <span className="block">{pair.id}</span>
              <span className="block text-ink-muted tabular-nums">
                mínimo {formatRatio(pair.min)}
              </span>
            </th>
            {THEMES.map((theme) => {
              const fg = TOKENS[theme][pair.fg];
              const bg = TOKENS[theme][pair.bg];
              return (
                <td key={theme} className="py-2 pr-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-7 items-center justify-center border border-rule-strong text-xs font-bold"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      Aa
                    </span>
                    <span className="tabular-nums">
                      {formatRatio(contrastRatio(fg, bg))}
                    </span>
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function SistemaPage() {
  const themePreference = await readThemePreference();

  return (
    <main className="mx-auto w-full max-w-table px-4 pb-24 pt-8 sm:px-6">
      <Masthead title="Sistema" as="h1" />
      <p className="mt-3 font-semibold">{SAMPLE_LABEL}</p>
      <p className="mt-1 text-ink-muted">
        Todo lo que aparece aquí es inventado: no hay base de datos ni TMDB
        detrás. Sirve para ver el sistema de diseño en uno y otro tema.
      </p>

      <Section id="color" title="Color">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BASE_TOKENS.map(({ token, label }) => (
            <li key={token} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-10 shrink-0 border border-rule-strong"
                style={{ backgroundColor: `var(--${cssVarName(token)})` }}
              />
              <span className="text-sm">{label}</span>
            </li>
          ))}
        </ul>
        <ContrastTable />
      </Section>

      <Section id="tipografia" title="Tipografía">
        <div className="flex flex-col gap-5">
          <Masthead title="Vistas" count={12} as="h2" />
          <p className="font-condensed text-title font-bold">
            Título de película en tipo condensado
          </p>
          <p className="max-w-[65ch]">
            Texto de lectura en Archivo normal. Se mide a unos sesenta y cinco
            caracteres por línea para que se lea sin esfuerzo, también en
            pantallas pequeñas.
          </p>
          <p className="text-sm text-ink-muted">
            Texto secundario más pequeño, con la tinta atenuada.
          </p>
          <p className="text-2xl font-extrabold tabular-nums">
            0123456789 · 7,25 · 8,5
          </p>
        </div>
      </Section>

      <Section id="estados" title="Estados">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WATCH_STATES.map((state) => (
            <li key={state}>
              <StateCell state={state} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="botones" title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Guardar</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Más tarde</Button>
          <Button size="sm">Guardar</Button>
          <Button disabled>Guardar</Button>
          <Button aria-busy="true">Guardando…</Button>
        </div>
      </Section>

      <Section id="campos" title="Campos">
        <div className="flex flex-col gap-5">
          <TextField
            label="Correo electrónico"
            name="correo"
            type="email"
            autoComplete="email"
          />
          <TextField
            label="Nombre"
            name="nombre"
            hint="Tal como aparece en la lista."
          />
          <TextField
            label="Nota"
            name="nota"
            defaultValue="11"
            error="Introduce una nota entre 0 y 10."
          />
          <TextField
            label="Buscar"
            hideLabel
            name="buscar"
            type="search"
            placeholder="Buscar en la lista"
          />
        </div>
      </Section>

      <Section id="filtros" title="Filtros y orden" note={SAMPLE_LABEL}>
        <FilterChipRow label="Filtrar por estado" className="-mx-1">
          <FilterChip pressed>Todas</FilterChip>
          {WATCH_STATES.map((state) => (
            <FilterChip key={state} state={state} pressed={false}>
              {WATCH_STATE_LABELS[state]}
            </FilterChip>
          ))}
        </FilterChipRow>
        <SortControl
          label="Ordenar"
          name="orden"
          options={SAMPLE_SORT_OPTIONS}
          defaultValue="score:desc"
          className="mt-4"
        />
      </Section>

      <Section id="notas" title="Notas y media" note={SAMPLE_LABEL}>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">María</span>
            <ScoreFigure
              score={SAMPLE_FIGURES.maria}
              label="María"
              className="text-2xl font-bold"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">Ignacio</span>
            <ScoreFigure
              score={SAMPLE_FIGURES.ignacio}
              label="Ignacio"
              className="text-2xl font-bold"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">Sin votar</span>
            <ScoreFigure score={null} className="text-2xl font-bold" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">Media</span>
            <AverageBox value={SAMPLE_FIGURES.average} />
            <AverageBox value={null} />
          </div>
        </div>
      </Section>

      <Section id="tabla" title="Tabla de críticos" note={SAMPLE_LABEL}>
        <CriticsTable label="Películas de muestra">
          <CriticsTableHeader guideWords={GUIDE_WORDS} showDate />
          {ROWS_BY_NAME.map((row, index) => (
            <CriticsTableRow
              key={row.name}
              href={index < 2 ? "/sistema" : undefined}
              name={row.name}
              year={row.year}
              state={row.state}
              maria={row.maria}
              ignacio={row.ignacio}
              average={row.average}
              watchedOn={row.watchedOn ?? "—"}
            />
          ))}
        </CriticsTable>
      </Section>

      <Section id="tema" title="Tema">
        <ThemeToggle value={themePreference} />
      </Section>
    </main>
  );
}
