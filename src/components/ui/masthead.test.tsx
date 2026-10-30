import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { Masthead } from "./masthead";

test("renders an h1 with the title and the count", () => {
  render(<Masthead title="Vistas" count={12} />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Vistas" }),
  ).toBeInTheDocument();
  expect(screen.getByText("12")).toBeInTheDocument();
});

test("a zero count is still shown", () => {
  render(<Masthead title="Pendientes" count={0} />);

  expect(screen.getByText("0")).toBeInTheDocument();
});

test("without a count only the title renders", () => {
  const { container } = render(<Masthead title="Sistema" />);

  expect(container).toHaveTextContent(/^Sistema$/);
});

test("as=h2 renders a level-2 heading and no h1", () => {
  render(<Masthead title="Color" as="h2" />);

  expect(
    screen.getByRole("heading", { level: 2, name: "Color" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
});

test("forwards className to the wrapper", () => {
  const { container } = render(<Masthead title="Vistas" className="extra" />);

  expect(container.firstElementChild).toHaveClass("extra");
});

test("has no accessibility violations", async () => {
  const { container } = render(<Masthead title="Vistas" count={12} />);

  await expectNoAxeViolations(container);
});
