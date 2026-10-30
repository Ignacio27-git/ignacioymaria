import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { setThemeAction } from "@/app/_actions/theme";
import { expectNoAxeViolations } from "@/test/axe";

import { ThemeToggle } from "./theme-toggle";

vi.mock("@/app/_actions/theme", () => ({ setThemeAction: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

test("is a radio group named Tema with Sistema, Claro and Oscuro", () => {
  render(<ThemeToggle value="system" />);

  const group = screen.getByRole("group", { name: "Tema" });
  expect(group).toBeInTheDocument();
  expect(
    screen.getAllByRole("radio").map((radio) => radio.getAttribute("value")),
  ).toEqual(["system", "light", "dark"]);
  expect(screen.getByRole("radio", { name: "Sistema" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Oscuro" })).toBeInTheDocument();
});

test("the three radios share one name so the arrows move between them", () => {
  render(<ThemeToggle value="system" />);

  const names = screen
    .getAllByRole("radio")
    .map((radio) => radio.getAttribute("name"));
  expect(new Set(names).size).toBe(1);
  expect(names[0]).toBeTruthy();
});

test("shows the current preference as checked", () => {
  render(<ThemeToggle value="dark" />);

  expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Claro" })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: "Sistema" })).not.toBeChecked();
});

test("shows another preference as checked when the value changes", () => {
  render(<ThemeToggle value="light" />);

  expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Oscuro" })).not.toBeChecked();
});

test("selecting Claro calls the action with light and checks it", async () => {
  vi.mocked(setThemeAction).mockResolvedValue(undefined);
  render(<ThemeToggle value="dark" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Claro" }));
  });

  expect(setThemeAction).toHaveBeenCalledTimes(1);
  expect(setThemeAction).toHaveBeenCalledWith("light");
});

test("selecting Sistema calls the action with system", async () => {
  vi.mocked(setThemeAction).mockResolvedValue(undefined);
  render(<ThemeToggle value="dark" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Sistema" }));
  });

  expect(setThemeAction).toHaveBeenCalledWith("system");
});

test("checks the chosen option at once, before the action finishes", async () => {
  let finish: () => void = () => {};
  vi.mocked(setThemeAction).mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  render(<ThemeToggle value="dark" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Claro" }));
  });

  expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Oscuro" })).not.toBeChecked();
  await act(async () => finish());
});

test("has no accessibility violations", async () => {
  const { container } = render(<ThemeToggle value="light" />);

  await expectNoAxeViolations(container);
});
