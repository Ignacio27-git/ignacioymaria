import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { FilterChip, FilterChipRow } from "./filter-chip";

test("is a toggle button named by its label", () => {
  render(<FilterChip pressed={false}>Vista</FilterChip>);

  const chip = screen.getByRole("button", { name: "Vista" });
  expect(chip).toHaveAttribute("aria-pressed", "false");
  expect(chip).toHaveAttribute("type", "button");
});

test("reflects the pressed state", () => {
  render(<FilterChip pressed>Vista</FilterChip>);

  expect(screen.getByRole("button", { name: "Vista" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("onToggle receives the next value on every click", () => {
  const onToggle = vi.fn();
  const { rerender } = render(
    <FilterChip pressed={false} onToggle={onToggle}>
      Vista
    </FilterChip>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Vista" }));
  expect(onToggle).toHaveBeenLastCalledWith(true);

  rerender(
    <FilterChip pressed onToggle={onToggle}>
      Vista
    </FilterChip>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Vista" }));
  expect(onToggle).toHaveBeenLastCalledWith(false);
  expect(onToggle).toHaveBeenCalledTimes(2);
});

test("clicking without a handler does not throw", () => {
  render(<FilterChip pressed={false}>Vista</FilterChip>);

  expect(() =>
    fireEvent.click(screen.getByRole("button", { name: "Vista" })),
  ).not.toThrow();
});

test("a state dot is decorative and does not change the name", () => {
  const { container } = render(
    <FilterChip pressed={false} state="urgent">
      Urgente de ver
    </FilterChip>,
  );

  expect(
    screen.getByRole("button", { name: "Urgente de ver" }),
  ).toBeInTheDocument();
  const dot = container.querySelector('[aria-hidden="true"]');
  expect(dot).toHaveAttribute("data-state", "urgent");
});

test("without a state there is no dot", () => {
  const { container } = render(<FilterChip pressed={false}>Todas</FilterChip>);

  expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
});

test("FilterChipRow is a labelled group of chips", () => {
  render(
    <FilterChipRow label="Filtrar por estado">
      <FilterChip pressed={false}>Vista</FilterChip>
      <FilterChip pressed>Pendiente</FilterChip>
    </FilterChipRow>,
  );

  const group = screen.getByRole("group", { name: "Filtrar por estado" });
  expect(group).toBeInTheDocument();
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(group).toContainElement(screen.getByRole("button", { name: "Vista" }));
});

test("forwards className on chip and row", () => {
  render(
    <FilterChipRow label="Filtros" className="row-extra">
      <FilterChip pressed={false} className="chip-extra">
        Vista
      </FilterChip>
    </FilterChipRow>,
  );

  expect(screen.getByRole("group")).toHaveClass("row-extra");
  expect(screen.getByRole("button")).toHaveClass("chip-extra");
});

test("has no accessibility violations", async () => {
  const { container } = render(
    <FilterChipRow label="Filtrar por estado">
      <FilterChip pressed={false} state="watched">
        Vista
      </FilterChip>
      <FilterChip pressed state="pending">
        Pendiente
      </FilterChip>
    </FilterChipRow>,
  );

  await expectNoAxeViolations(container);
});
