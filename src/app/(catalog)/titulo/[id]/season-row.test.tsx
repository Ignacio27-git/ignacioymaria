import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { createSeason, err, ok, titleSummary, type Season } from "@/domain";
import { makeRecord } from "@/server/titles/test-helpers";
import type { TitleView } from "@/server/titles/types";
import { expectNoAxeViolations } from "@/test/axe";

import { SeasonRow, type SeasonRowProps } from "./season-row";

const TODAY = "2026-10-31";
const save = vi.fn();
const onSaved = vi.fn();

function season(input: Record<string, unknown> = {}): Season {
  const created = createSeason({
    number: 2,
    state: "watched",
    watchDate: { kind: "known", date: "2026-05-01" },
    scores: { maria: 8, ignacio: 6 },
    ...input,
  });
  if (!created.ok) throw new Error("invalid test season");
  return created.value;
}

function seriesView(): TitleView {
  const record = makeRecord({ kind: "series" });
  return { ...record, summary: titleSummary(record.title), average: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  save.mockResolvedValue(ok(seriesView()));
});

function setup(props: Partial<SeasonRowProps> = {}) {
  return render(
    <SeasonRow
      season={season()}
      me="maria"
      today={TODAY}
      open
      save={save}
      onSaved={onSaved}
      {...props}
    />,
  );
}

test("names the season and shows its state, date and both scores", () => {
  setup();

  expect(screen.getByText("Temporada 2")).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Vista" })).toBeChecked();
  expect(screen.getByLabelText("Fecha de visionado")).toHaveValue("2026-05-01");
  expect(screen.getByText("María:", { exact: false }).parentElement).toHaveTextContent("8");
  expect(screen.getByText("Ignacio:", { exact: false }).parentElement).toHaveTextContent("6");
});

test("a new pending season reads Pendiente, no date and Sin nota twice", () => {
  setup({ season: season({ state: "pending", watchDate: undefined, scores: {} }) });

  expect(screen.getByRole("radio", { name: "Pendiente" })).toBeChecked();
  expect(screen.getByLabelText("Fecha de visionado")).toHaveValue("");
  expect(screen.getAllByText("Sin nota", { selector: ".sr-only" })).toHaveLength(2);
});

test("only the signed-in person's own score has controls", () => {
  setup({ me: "maria" });
  expect(screen.getAllByRole("group", { name: "Tu nota" })).toHaveLength(1);
});

test("a score save goes to my own column, never the other person's", async () => {
  setup({ me: "ignacio" });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "9" }));
  });

  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith({ field: "myScore", value: 9 });
});

test("the server's answer is handed to the parent", async () => {
  const view = seriesView();
  save.mockResolvedValue(ok(view));
  setup();

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Vista y horrible" }));
  });

  expect(save).toHaveBeenCalledWith({ field: "state", value: "watched_awful" });
  expect(onSaved).toHaveBeenCalledWith(view);
});

test("the date saves the chosen day, and Hoy fills in today", async () => {
  setup({ season: season({ watchDate: undefined }) });

  await act(async () => {
    fireEvent.change(screen.getByLabelText("Fecha de visionado"), {
      target: { value: "2026-06-02" },
    });
  });
  expect(save).toHaveBeenLastCalledWith({
    field: "watchDate",
    value: { kind: "known", date: "2026-06-02" },
  });
});

test("Hoy sends today's date from the server", async () => {
  setup({ season: season({ watchDate: undefined }) });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
  });

  expect(save).toHaveBeenCalledWith({
    field: "watchDate",
    value: { kind: "known", date: TODAY },
  });
});

test("a failed save alerts and puts the confirmed value back", async () => {
  save.mockResolvedValue(err({ kind: "unavailable" }));
  setup();

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Vista y horrible" }));
  });

  expect(screen.getByRole("radio", { name: "Vista" })).toBeChecked();
  expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar");
  expect(onSaved).not.toHaveBeenCalled();
});

test("is axe clean", async () => {
  const { container } = setup();

  await expectNoAxeViolations(container);
});
