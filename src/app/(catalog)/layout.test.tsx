import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { expect, test, vi } from "vitest";

import CatalogLayout from "./layout";

vi.mock("./catalog-shell", () => ({
  CatalogShell: () => <p>Cabecera y contenido</p>,
}));

test("wraps the guarded shell in Suspense so the request-time guard streams", () => {
  const element = CatalogLayout({ children: <main>Página</main> });

  expect(element.type).toBe(Suspense);
});

test("renders the shell inside the layout", () => {
  render(<CatalogLayout>{<main>Página</main>}</CatalogLayout>);

  expect(screen.getByText("Cabecera y contenido")).toBeInTheDocument();
});
