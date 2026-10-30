import "server-only";

import {
  averageScore,
  parseScore,
  type Score,
  type WatchState,
} from "@/domain";
import type { SortOption } from "@/components/ui/sort-control";

/** One synthetic table row; shaped like the props of `CriticsTableRow`. */
export interface SampleRow {
  name: string;
  year: number | null;
  state: WatchState;
  maria: Score | null;
  ignacio: Score | null;
  average: number | null;
  watchedOn: string | null;
}

// Scores go through the domain parser, like real ones will (D-53).
function score(value: number): Score {
  const result = parseScore(value);
  if (!result.ok) throw new Error(`Invalid sample score ${value}`);
  return result.value;
}

function row(
  name: string,
  year: number | null,
  state: WatchState,
  maria: number | null,
  ignacio: number | null,
  watchedOn: string | null,
): SampleRow {
  const mariaScore = maria === null ? null : score(maria);
  const ignacioScore = ignacio === null ? null : score(ignacio);
  return {
    name,
    year,
    state,
    maria: mariaScore,
    ignacio: ignacioScore,
    average: averageScore([mariaScore, ignacioScore]),
    watchedOn,
  };
}

/** Synthetic titles for /sistema ("Datos de muestra"); no database, no TMDB. */
export const SAMPLE_ROWS: readonly SampleRow[] = [
  row("La casa del lago azul", 2019, "watched", 8.25, 7.5, "12 mar 2024"),
  row("Noche en el faro", 2021, "watched_rewatch", 9, 9.25, "3 ene 2024"),
  row("El último tren a Valdivia", 2016, "urgent", null, null, null),
  row("Ceniza y cristal", 2022, "watched_no_rewatch", 5.5, 4.75, "20 nov 2023"),
  row("Los hijos del eclipse", 2018, "watched_awful", 2, 1.5, "8 ago 2023"),
  row("Mapa de las islas perdidas", 2024, "pending", null, null, null),
  row("Cartas desde el desierto", null, "watched", 7.25, null, null),
  row(
    "La extraordinaria y verdadera historia de los cartógrafos del norte",
    2020,
    "watched",
    null,
    6.75,
    "30 jun 2023",
  ),
];

export const SAMPLE_SORT_OPTIONS: readonly SortOption[] = [
  { key: "score", direction: "desc", label: "Nota, de mayor a menor" },
  { key: "score", direction: "asc", label: "Nota, de menor a mayor" },
  { key: "date", direction: "desc", label: "Fecha, la más reciente primero" },
  { key: "name", direction: "asc", label: "Título, de la A a la Z" },
];

/** Two scores and their average, for the ScoreFigure / AverageBox demos. */
const FIGURE_MARIA = score(7.25);
const FIGURE_IGNACIO = score(7);
export const SAMPLE_FIGURES = {
  maria: FIGURE_MARIA,
  ignacio: FIGURE_IGNACIO,
  average: averageScore([FIGURE_MARIA, FIGURE_IGNACIO]),
};
