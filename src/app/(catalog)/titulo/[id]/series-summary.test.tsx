import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import type { TitleSummary } from "@/domain";
import { expectNoAxeViolations } from "@/test/axe";

import { SeriesSummary } from "./series-summary";

const BASE: TitleSummary = {
  state: "watched_rewatch",
  watchDate: { kind: "known", date: "2026-05-01" },
  scores: { maria: 7, ignacio: 6 },
  average: 6.5,
};

function setup(summary: Partial<TitleSummary> = {}) {
  return render(<SeriesSummary summary={{ ...BASE, ...summary }} />);
}

test("shows the derived state, date, both scores and the average", () => {
  setup();

  expect(screen.getByRole("heading", { level: 2, name: "Resumen" })).toBeInTheDocument();
  expect(screen.getByText("Vista, repetir")).toBeInTheDocument();
  expect(screen.getByText("1 may 2026")).toBeInTheDocument();
  expect(screen.getByText("María:", { exact: false }).parentElement).toHaveTextContent("7");
  expect(screen.getByText("Ignacio:", { exact: false }).parentElement).toHaveTextContent("6");
  expect(screen.getByRole("img", { name: "Media 6,5" })).toBeInTheDocument();
});

test("is read-only: nothing in it can be edited", () => {
  setup();

  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Fecha de visionado")).not.toBeInTheDocument();
});

test("means off the quarter-point grid read with the decimal comma", () => {
  setup({ scores: { maria: 7.125, ignacio: null }, average: 7.125 });

  expect(screen.getByText("María:", { exact: false }).parentElement).toHaveTextContent("7,13");
  expect(screen.getByRole("img", { name: "Media 7,13" })).toBeInTheDocument();
});

test("a person with no scores reads Sin nota and no scores at all reads Sin media", () => {
  setup({
    state: "pending",
    watchDate: { kind: "unknown" },
    scores: { maria: null, ignacio: null },
    average: null,
  });

  expect(screen.getAllByText("Sin nota")).toHaveLength(2);
  expect(screen.getByRole("img", { name: "Sin media" })).toBeInTheDocument();
  expect(screen.getByText("Pendiente")).toBeInTheDocument();
  expect(screen.getByText("No sé cuándo")).toBeInTheDocument();
});

test("is axe clean", async () => {
  const { container } = setup();

  await expectNoAxeViolations(container);
});
