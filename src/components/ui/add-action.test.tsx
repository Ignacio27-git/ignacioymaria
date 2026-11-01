import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { AddAction } from "./add-action";

test("with an href it is a link named Añadir", () => {
  render(<AddAction href="/titulos/nuevo" />);

  const link = screen.getByRole("link", { name: "Añadir" });
  expect(link).toHaveAttribute("href", "/titulos/nuevo");
});

test("without an href it is a button named Añadir that fires onClick", () => {
  let clicks = 0;
  render(<AddAction onClick={() => (clicks += 1)} />);

  const button = screen.getByRole("button", { name: "Añadir" });
  expect(button).toHaveAttribute("type", "button");
  button.click();
  expect(clicks).toBe(1);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("the plus mark is decorative and the visible word names the action", () => {
  const { container } = render(<AddAction href="/x" />);

  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByRole("link")).toHaveTextContent(/^Añadir$/);
});

test("forwards className to the control", () => {
  render(<AddAction href="/x" className="extra" />);

  expect(screen.getByRole("link", { name: "Añadir" })).toHaveClass("extra");
});

test("has no accessibility violations as link or button", async () => {
  const { container } = render(
    <>
      <AddAction href="/x" />
      <AddAction />
    </>,
  );

  await expectNoAxeViolations(container);
});

test("sits in a click-through wrapper anchored to the 760px column (DS-1)", () => {
  render(<AddAction href="/x" />);

  const link = screen.getByRole("link", { name: "Añadir" });
  const track = link.parentElement;
  const wrapper = track?.parentElement;

  expect(wrapper).toHaveClass("fixed", "pointer-events-none");
  expect(track).toHaveClass("max-w-table", "mx-auto", "flex", "justify-end");
  // Same horizontal padding as the pages' content, so the right edges match.
  expect(track?.className).toContain("px-[max(1rem,env(safe-area-inset-right))]");
  expect(track?.className).toContain("sm:px-[max(1.5rem,env(safe-area-inset-right))]");
  expect(track?.className).not.toContain("md:px-[env(safe-area-inset-right)]");
  expect(link).toHaveClass("pointer-events-auto");
  expect(link).not.toHaveClass("fixed");
});

test("the button variant lives in the same anchored wrapper", () => {
  render(<AddAction />);

  const button = screen.getByRole("button", { name: "Añadir" });
  expect(button.parentElement?.parentElement).toHaveClass(
    "fixed",
    "pointer-events-none",
  );
  expect(button).toHaveClass("pointer-events-auto");
});
