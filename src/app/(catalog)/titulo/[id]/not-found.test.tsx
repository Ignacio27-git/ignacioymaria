import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import NotFound from "./not-found";

test("says the title does not exist and links back to Vistas", () => {
  render(<NotFound />);

  expect(
    screen.getByRole("heading", { level: 1, name: "No encontrado" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Este título no existe o ya se eliminó.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Volver a Vistas" })).toHaveAttribute(
    "href",
    "/vistas",
  );
});

test("is axe clean", async () => {
  const { container } = render(<NotFound />);

  await expectNoAxeViolations(container);
});
