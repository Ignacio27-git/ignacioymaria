import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Home from "./page";

vi.mock("@/app/_actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("./person-gate", () => ({
  PersonGate: () => <p>Sesión iniciada como Ignacio</p>,
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
