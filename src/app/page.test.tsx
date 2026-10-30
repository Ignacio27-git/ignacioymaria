import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Home from "./page";

vi.mock("@/app/_actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("./person-gate", () => ({
  PersonGate: () => <p>Sesión iniciada como Ignacio</p>,
}));
vi.mock("./theme-section", () => ({
  ThemeSection: () => <p>Selector de tema</p>,
}));

test("renders the home heading", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Ignacio y María" }),
  ).toBeInTheDocument();
});

test("renders the signed-in person and a sign-out button", () => {
  render(<Home />);

  expect(screen.getByText("Sesión iniciada como Ignacio")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
});

test("renders the theme selector", () => {
  render(<Home />);

  expect(screen.getByText("Selector de tema")).toBeInTheDocument();
});
