import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { SortControl } from "./sort-control";

const OPTIONS = [
  { key: "score", direction: "desc", label: "Nota, de mayor a menor" },
  { key: "score", direction: "asc", label: "Nota, de menor a mayor" },
  { key: "date", direction: "desc", label: "Fecha, la más reciente primero" },
] as const;

test("is a select labelled Ordenar with the direction in every option", () => {
  render(<SortControl label="Ordenar" name="orden" options={OPTIONS} />);

  const select = screen.getByLabelText("Ordenar");
  expect(select.tagName).toBe("SELECT");
  expect(select).toHaveAttribute("name", "orden");
  expect(
    screen.getAllByRole("option").map((option) => option.textContent),
  ).toEqual([
    "Nota, de mayor a menor",
    "Nota, de menor a mayor",
    "Fecha, la más reciente primero",
  ]);
});

test("defaultValue selects the matching option", () => {
  render(
    <SortControl
      label="Ordenar"
      name="orden"
      options={OPTIONS}
      defaultValue="score:asc"
    />,
  );

  expect(screen.getByLabelText("Ordenar")).toHaveValue("score:asc");
  expect(
    screen.getByRole("option", { name: "Nota, de menor a mayor" }),
  ).toHaveProperty("selected", true);
});

test("onChange reports key and direction of the chosen option", () => {
  const onChange = vi.fn();
  render(
    <SortControl
      label="Ordenar"
      name="orden"
      options={OPTIONS}
      defaultValue="score:desc"
      onChange={onChange}
    />,
  );

  fireEvent.change(screen.getByLabelText("Ordenar"), {
    target: { value: "date:desc" },
  });
  expect(onChange).toHaveBeenLastCalledWith({ key: "date", direction: "desc" });

  fireEvent.change(screen.getByLabelText("Ordenar"), {
    target: { value: "score:asc" },
  });
  expect(onChange).toHaveBeenLastCalledWith({ key: "score", direction: "asc" });
  expect(onChange).toHaveBeenCalledTimes(2);
});

test("a controlled value shows the current selection", () => {
  const { rerender } = render(
    <SortControl
      label="Ordenar"
      name="orden"
      options={OPTIONS}
      value="date:desc"
    />,
  );
  expect(screen.getByLabelText("Ordenar")).toHaveValue("date:desc");

  rerender(
    <SortControl
      label="Ordenar"
      name="orden"
      options={OPTIONS}
      value="score:desc"
    />,
  );
  expect(screen.getByLabelText("Ordenar")).toHaveValue("score:desc");
});

test("changing without a handler does not throw", () => {
  render(<SortControl label="Ordenar" name="orden" options={OPTIONS} />);

  expect(() =>
    fireEvent.change(screen.getByLabelText("Ordenar"), {
      target: { value: "date:desc" },
    }),
  ).not.toThrow();
});

test("forwards className to the wrapper", () => {
  render(
    <SortControl
      label="Ordenar"
      name="orden"
      options={OPTIONS}
      className="extra"
    />,
  );

  expect(screen.getByLabelText("Ordenar").parentElement?.parentElement).toHaveClass("extra");
});

test("has no accessibility violations", async () => {
  const { container } = render(
    <SortControl label="Ordenar" name="orden" options={OPTIONS} />,
  );

  await expectNoAxeViolations(container);
});

test("draws its own chevron: decorative, after the select, outside the tab order", () => {
  const { container } = render(
    <SortControl label="Ordenar" name="orden" options={OPTIONS} />,
  );

  const select = screen.getByLabelText("Ordenar");
  const chevron = select.parentElement?.querySelector("svg");
  expect(chevron).toHaveAttribute("aria-hidden", "true");
  expect(chevron).toHaveAttribute("focusable", "false");
  expect(container.querySelectorAll("svg")).toHaveLength(1);
});

test("attaches no onChange to the select without a callback (DS-3)", () => {
  const element = SortControl({ label: "Ordenar", name: "orden", options: OPTIONS });

  expect(findSelect(element)?.props?.onChange).toBeUndefined();
});

test("attaches onChange when the callback is present (DS-3)", () => {
  const element = SortControl({
    label: "Ordenar",
    name: "orden",
    options: OPTIONS,
    onChange: vi.fn(),
  });

  expect(findSelect(element)?.props?.onChange).toBeTypeOf("function");
});

test("supports the priority key for Pendientes", () => {
  const onChange = vi.fn();
  render(
    <SortControl
      label="Ordenar"
      name="orden"
      options={[
        { key: "priority", direction: "desc", label: "Urgente primero" },
        { key: "score", direction: "desc", label: "Nota" },
      ]}
      value="priority:desc"
      onChange={onChange}
    />,
  );

  expect(screen.getByLabelText("Ordenar")).toHaveValue("priority:desc");
  fireEvent.change(screen.getByLabelText("Ordenar"), {
    target: { value: "score:desc" },
  });
  expect(onChange).toHaveBeenLastCalledWith({ key: "score", direction: "desc" });
});

type Node = { type?: unknown; props?: { children?: unknown; onChange?: unknown } };

function findSelect(node: unknown): Node | undefined {
  if (!node || typeof node !== "object") return undefined;
  const element = node as Node;
  if (element.type === "select") return element;
  const children = element.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findSelect(child);
    if (found) return found;
  }
  return undefined;
}
