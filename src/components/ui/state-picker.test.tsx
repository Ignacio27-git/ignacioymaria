import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { WATCH_STATE_LABELS, WATCH_STATES } from "@/domain/watch-state";
import { expectNoAxeViolations } from "@/test/axe";

import { StatePicker } from "./state-picker";

test("is a radio group named Estado with the six legend states and no seventh", () => {
  render(<StatePicker value="pending" onChange={vi.fn()} />);

  expect(screen.getByRole("group", { name: "Estado" })).toBeInTheDocument();
  const radios = screen.getAllByRole("radio");
  expect(radios.map((radio) => radio.getAttribute("value"))).toEqual([
    ...WATCH_STATES,
  ]);
  for (const state of WATCH_STATES) {
    expect(
      screen.getByRole("radio", { name: WATCH_STATE_LABELS[state] }),
    ).toBeInTheDocument();
  }
  expect(radios).toHaveLength(6);
});

test("checks the current state only", () => {
  render(<StatePicker value="watched_rewatch" onChange={vi.fn()} />);

  expect(screen.getByRole("radio", { name: "Vista, repetir" })).toBeChecked();
  expect(screen.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
});

test("the radios share one name so the arrows move between them", () => {
  render(<StatePicker value="pending" onChange={vi.fn()} />);

  const names = screen.getAllByRole("radio").map((r) => r.getAttribute("name"));
  expect(new Set(names).size).toBe(1);
  expect(names[0]).toBeTruthy();
});

test("choosing a state reports it", () => {
  const onChange = vi.fn();
  render(<StatePicker value="pending" onChange={onChange} />);

  fireEvent.click(screen.getByRole("radio", { name: "Urgente de ver" }));

  expect(onChange).toHaveBeenCalledWith("urgent");
});

test("disabled locks every option", () => {
  render(<StatePicker value="pending" onChange={vi.fn()} disabled />);

  for (const radio of screen.getAllByRole("radio")) {
    expect(radio).toBeDisabled();
  }
});

test("forwards className and aria-busy to the group", () => {
  render(
    <StatePicker value="pending" onChange={vi.fn()} className="extra" busy />,
  );

  const group = screen.getByRole("group", { name: "Estado" });
  expect(group).toHaveClass("extra");
  expect(group).toHaveAttribute("aria-busy", "true");
});

test("has no accessibility violations", async () => {
  const { container } = render(<StatePicker value="watched" onChange={vi.fn()} />);

  await expectNoAxeViolations(container);
});
