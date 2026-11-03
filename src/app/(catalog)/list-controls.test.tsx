import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { ListControls, type ListControlsProps } from "./list-controls";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  vi.useFakeTimers();
  replace.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

const VISTAS: ListControlsProps = {
  list: "vistas",
  q: "",
  selectedStates: [],
  order: "fecha",
};

function setup(props: Partial<ListControlsProps> = {}) {
  return render(<ListControls {...VISTAS} {...props} />);
}

function type(value: string) {
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), {
    target: { value },
  });
}

test("the search field is a labelled search box seeded from the URL", () => {
  setup({ q: "amelie" });

  expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("amelie");
});

test("typing replaces the URL once, 250 ms after the last keystroke", () => {
  setup();

  type("a");
  act(() => void vi.advanceTimersByTime(200));
  type("ame");
  act(() => void vi.advanceTimersByTime(249));
  expect(replace).not.toHaveBeenCalled();

  act(() => void vi.advanceTimersByTime(1));

  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith("/vistas?q=ame", { scroll: false });
});

test("the search keeps its text and focus while the URL updates", () => {
  setup();
  const field = screen.getByRole("searchbox", { name: "Buscar" });
  field.focus();

  type("dune");
  act(() => void vi.advanceTimersByTime(250));

  expect(field).toHaveValue("dune");
  expect(field).toHaveFocus();
});

test("clearing the text removes q from the URL", () => {
  setup({ q: "dune" });

  type("");
  act(() => void vi.advanceTimersByTime(250));

  expect(replace).toHaveBeenCalledWith("/vistas", { scroll: false });
});

test("one chip per state of the list, none pressed means all", () => {
  setup();

  const group = screen.getByRole("group", { name: "Filtrar por estado" });
  expect(group).toBeInTheDocument();
  expect(
    screen.getAllByRole("button", { pressed: false }).map((b) => b.textContent),
  ).toEqual(["Vista", "Vista, repetir", "Vista, no repetir", "Vista y horrible"]);
});

test("Pendientes shows Urgente de ver and Pendiente", () => {
  setup({ list: "pendientes", order: "priority" });

  expect(screen.getByRole("button", { name: "Urgente de ver" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pendiente" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Vista" })).toBeNull();
});

test("pressed chips come from the URL", () => {
  setup({ selectedStates: ["watched_awful"] });

  expect(screen.getByRole("button", { name: "Vista y horrible" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a chip toggles its state into estado", () => {
  setup();

  fireEvent.click(screen.getByRole("button", { name: "Vista y horrible" }));

  expect(replace).toHaveBeenCalledWith("/vistas?estado=watched_awful", {
    scroll: false,
  });
});

test("a second chip joins the list in the list's own order; pressing again removes it", () => {
  const { rerender } = setup({ selectedStates: ["watched_awful"] });

  fireEvent.click(screen.getByRole("button", { name: "Vista" }));
  expect(replace).toHaveBeenLastCalledWith(
    "/vistas?estado=watched%2Cwatched_awful",
    { scroll: false },
  );

  rerender(
    <ListControls {...VISTAS} selectedStates={["watched", "watched_awful"]} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Vista y horrible" }));
  expect(replace).toHaveBeenLastCalledWith("/vistas?estado=watched", {
    scroll: false,
  });
});

test("the sort control keeps q and estado", () => {
  setup({ q: "matrix", selectedStates: ["watched"] });

  fireEvent.change(screen.getByLabelText("Ordenar"), {
    target: { value: "score:desc" },
  });

  expect(replace).toHaveBeenCalledWith(
    "/vistas?q=matrix&estado=watched&orden=nota",
    { scroll: false },
  );
});

test("choosing the default order drops orden from the URL", () => {
  setup({ order: "nota", q: "x" });

  fireEvent.change(screen.getByLabelText("Ordenar"), {
    target: { value: "date:desc" },
  });

  expect(replace).toHaveBeenCalledWith("/vistas?q=x", { scroll: false });
});

test("Pendientes offers priority, nota and fecha, and priority is its default", () => {
  setup({ list: "pendientes", order: "nota" });

  expect(
    screen.getAllByRole("option").map((option) => option.getAttribute("value")),
  ).toEqual(["priority:desc", "score:desc", "date:desc"]);
  expect(screen.getByLabelText("Ordenar")).toHaveValue("score:desc");

  fireEvent.change(screen.getByLabelText("Ordenar"), {
    target: { value: "priority:desc" },
  });
  expect(replace).toHaveBeenCalledWith("/pendientes", { scroll: false });
});

test("a chip change sends the text typed so far, not the stale URL text", () => {
  setup();

  type("dune");
  fireEvent.click(screen.getByRole("button", { name: "Vista" }));

  expect(replace).toHaveBeenLastCalledWith("/vistas?q=dune&estado=watched", {
    scroll: false,
  });
});

test("a URL change that this island did not send (back/forward) replaces the text", () => {
  const { rerender } = setup({ q: "dune" });

  rerender(<ListControls {...VISTAS} q="" />);

  expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("");
});

test("an echo of our own request does not overwrite newer typing", () => {
  const { rerender } = setup();
  type("du");
  act(() => void vi.advanceTimersByTime(250));
  type("dun");

  rerender(<ListControls {...VISTAS} q="du" />);

  expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("dun");
});

test("has no accessibility violations", async () => {
  vi.useRealTimers();
  const { container } = setup({ selectedStates: ["watched"] });

  await expectNoAxeViolations(container);
});
