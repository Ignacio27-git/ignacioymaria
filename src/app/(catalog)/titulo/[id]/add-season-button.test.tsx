import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { err, ok, titleSummary } from "@/domain";
import { makeRecord } from "@/server/titles/test-helpers";
import type { TitleView } from "@/server/titles/types";
import { expectNoAxeViolations } from "@/test/axe";

import { AddSeasonButton } from "./add-season-button";

const save = vi.fn();
const onAdded = vi.fn();

function seriesView(): TitleView {
  const record = makeRecord({ kind: "series" });
  return { ...record, summary: titleSummary(record.title), average: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  save.mockResolvedValue(ok(seriesView()));
});

function setup(nextNumber = 3) {
  return render(<AddSeasonButton nextNumber={nextNumber} save={save} onAdded={onAdded} />);
}

async function press() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Añadir temporada/ }));
  });
}

test("names the season it will add", () => {
  setup(3);
  expect(screen.getByRole("button", { name: "Añadir temporada 3" })).toBeInTheDocument();
});

test("names season 1 when the series has none", () => {
  setup(1);
  expect(screen.getByRole("button", { name: "Añadir temporada 1" })).toBeInTheDocument();
});

test("saves once, hands the fresh view to the parent and announces it", async () => {
  const view = seriesView();
  save.mockResolvedValue(ok(view));
  setup(3);

  await press();

  expect(save).toHaveBeenCalledTimes(1);
  expect(onAdded).toHaveBeenCalledWith(view);
  expect(screen.getByRole("status")).toHaveTextContent("Temporada 3 añadida.");
});

test("a failure says so, adds nothing and the button can be pressed again", async () => {
  save.mockResolvedValue(err({ kind: "unavailable" }));
  setup();

  await press();

  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo añadir la temporada. Inténtalo de nuevo.",
  );
  expect(onAdded).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Añadir temporada 3" })).toBeEnabled();
});

test("a thrown action counts as a failure", async () => {
  save.mockRejectedValue(new Error("network"));
  setup();

  await press();

  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(onAdded).not.toHaveBeenCalled();
});

test("while a save is in flight the button is disabled, so a double tap adds one season", async () => {
  let answer: (value: unknown) => void = () => {};
  save.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
  setup();

  await press();
  const button = screen.getByRole("button", { name: "Añadir temporada 3" });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(save).toHaveBeenCalledTimes(1);

  await act(async () => answer(ok(seriesView())));
  expect(screen.getByRole("button", { name: "Añadir temporada 3" })).toBeEnabled();
});

test("is axe clean, also with a failure showing", async () => {
  save.mockResolvedValue(err({ kind: "unavailable" }));
  const { container } = setup();
  await expectNoAxeViolations(container);

  await press();
  await expectNoAxeViolations(container);
});
