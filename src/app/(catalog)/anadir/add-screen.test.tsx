import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("./add-form", () => ({
  AddForm: ({ desde }: { desde: string }) => (
    <div data-testid="add-form">{desde}</div>
  ),
}));

import { AddScreen } from "./add-screen";

async function renderScreen(desde?: string | string[]) {
  render(await AddScreen({ searchParams: Promise.resolve({ desde }) }));
}

test("the masthead names the page and the form gets the origin list", async () => {
  await renderScreen("vistas");

  expect(screen.getByRole("heading", { level: 1, name: "Añadir" })).toBeInTheDocument();
  expect(screen.getByTestId("add-form")).toHaveTextContent("vistas");
  expect(screen.getByRole("link", { name: "Volver a Vistas" })).toHaveAttribute(
    "href",
    "/vistas",
  );
});

test("without an origin it adds to Pendientes", async () => {
  await renderScreen(undefined);

  expect(screen.getByTestId("add-form")).toHaveTextContent("pendientes");
  expect(screen.getByRole("link", { name: "Volver a Pendientes" })).toHaveAttribute(
    "href",
    "/pendientes",
  );
});

test("an unknown origin falls back to Pendientes", async () => {
  await renderScreen("otra");

  expect(screen.getByTestId("add-form")).toHaveTextContent("pendientes");
});
