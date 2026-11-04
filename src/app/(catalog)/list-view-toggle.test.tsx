import { act, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

import { setListViewAction } from "@/app/_actions/list-view";
import { expectNoAxeViolations } from "@/test/axe";

import { ListViewToggle } from "./list-view-toggle";

vi.mock("@/app/_actions/list-view", () => ({ setListViewAction: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

test("is a radiogroup labelled by the visible text Vista", () => {
  render(<ListViewToggle value="table" />);

  const label = screen.getByText("Vista");
  expect(label).not.toHaveClass("sr-only");
  expect(screen.getByRole("radiogroup", { name: "Vista" })).toBeInTheDocument();
});

test("offers Tabla and Tarjetas as native radios sharing one name", () => {
  render(<ListViewToggle value="table" />);

  const radios = screen.getAllByRole("radio");
  expect(radios.map((radio) => radio.getAttribute("value"))).toEqual([
    "table",
    "grid",
  ]);
  expect(screen.getByRole("radio", { name: "Tabla" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Tarjetas" })).toBeInTheDocument();
  // One shared name is what lets the arrow keys move between the radios.
  const names = radios.map((radio) => radio.getAttribute("name"));
  expect(new Set(names).size).toBe(1);
  expect(names[0]).toBeTruthy();
  for (const radio of radios) expect(radio).toHaveAttribute("type", "radio");
});

test.each([
  ["table", "Tabla", "Tarjetas"],
  ["grid", "Tarjetas", "Tabla"],
] as const)("with %s exactly %s is checked", (value, checked, other) => {
  render(<ListViewToggle value={value} />);

  expect(screen.getByRole("radio", { name: checked })).toBeChecked();
  expect(screen.getByRole("radio", { name: other })).not.toBeChecked();
});

test("choosing Tarjetas calls the action with grid and keeps focus there", async () => {
  vi.mocked(setListViewAction).mockResolvedValue(undefined);
  render(<ListViewToggle value="table" />);
  const cards = screen.getByRole("radio", { name: "Tarjetas" });
  cards.focus();

  await act(async () => {
    fireEvent.click(cards);
  });

  expect(setListViewAction).toHaveBeenCalledTimes(1);
  expect(setListViewAction).toHaveBeenCalledWith("grid");
  expect(cards).toHaveFocus();
});

test("choosing Tabla calls the action with table", async () => {
  vi.mocked(setListViewAction).mockResolvedValue(undefined);
  render(<ListViewToggle value="grid" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Tabla" }));
  });

  expect(setListViewAction).toHaveBeenCalledWith("table");
});

test("choosing the value already selected does not call the action", async () => {
  render(<ListViewToggle value="grid" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Tarjetas" }));
  });

  expect(setListViewAction).not.toHaveBeenCalled();
});

test("checks the chosen option at once, before the action finishes", async () => {
  let finish: () => void = () => {};
  vi.mocked(setListViewAction).mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  render(<ListViewToggle value="table" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Tarjetas" }));
  });

  expect(screen.getByRole("radio", { name: "Tarjetas" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Tabla" })).not.toBeChecked();
  await act(async () => finish());
});

test("a rejected action reverts the selection without throwing", async () => {
  vi.mocked(setListViewAction).mockRejectedValue(new Error("network"));
  render(<ListViewToggle value="table" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Tarjetas" }));
  });

  expect(screen.getByRole("radio", { name: "Tabla" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Tarjetas" })).not.toBeChecked();
});

test("never touches the URL", async () => {
  vi.mocked(setListViewAction).mockResolvedValue(undefined);
  const push = vi.spyOn(window.history, "pushState");
  const replace = vi.spyOn(window.history, "replaceState");
  render(<ListViewToggle value="table" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Tarjetas" }));
  });

  expect(push).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
  push.mockRestore();
  replace.mockRestore();
});

test("every option is a 44px touch target and none is inverted", () => {
  render(<ListViewToggle value="table" />);

  for (const radio of screen.getAllByRole("radio")) {
    const label = radio.closest("label");
    expect(label).toHaveClass("min-h-11");
    expect(label?.className).not.toMatch(/inverse|filter-chip-selected/);
  }
});

test("only the selected option carries the decorative check", () => {
  const { container } = render(<ListViewToggle value="grid" />);

  expect(container.querySelectorAll("svg")).toHaveLength(1);
  const selected = screen.getByRole("radio", { name: "Tarjetas" }).closest("label");
  expect(selected?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

test("has no accessibility violations", async () => {
  const { container } = render(<ListViewToggle value="grid" />);

  await expectNoAxeViolations(container);
});

test("the first render checks exactly the server-provided view", () => {
  const html = renderToString(<ListViewToggle value="grid" />);

  expect(html.match(/checked=""/g)).toHaveLength(1);
  expect(html).toMatch(/value="grid"[^>]*checked=""|checked=""[^>]*value="grid"/);
});

test("hydrates the server markup without a mismatch warning", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const container = document.createElement("div");
  container.innerHTML = renderToString(<ListViewToggle value="grid" />);
  document.body.append(container);

  await act(async () => {
    hydrateRoot(container, <ListViewToggle value="grid" />);
  });

  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
  container.remove();
});
