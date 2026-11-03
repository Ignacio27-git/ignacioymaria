import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { usesInverseToken } from "@/lib/design/tokens";
import { expectNoAxeViolations } from "@/test/axe";

import { AverageBox } from "./average-box";

test("is an image named Media with the formatted value", () => {
  render(<AverageBox value={7.125} />);

  expect(screen.getByRole("img", { name: "Media 7,13" })).toBeInTheDocument();
});

test("formats other averages the same way", () => {
  const { rerender } = render(<AverageBox value={8} />);
  expect(screen.getByRole("img", { name: "Media 8" })).toBeInTheDocument();

  rerender(<AverageBox value={7.375} />);
  expect(screen.getByRole("img", { name: "Media 7,38" })).toBeInTheDocument();
});

test("the visible figure is hidden from assistive tech", () => {
  render(<AverageBox value={7.5} />);

  const figure = screen.getByText("7,5");
  expect(figure).toHaveAttribute("aria-hidden", "true");
});

test("without scores it shows a dash and is named Sin media", () => {
  const { container } = render(<AverageBox value={null} />);

  expect(screen.getByRole("img", { name: "Sin media" })).toBeInTheDocument();
  expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
  expect(container).not.toHaveTextContent("NaN");
});

test("forwards className to the box", () => {
  render(<AverageBox value={6} className="extra" />);

  expect(screen.getByRole("img")).toHaveClass("extra");
});

test("is the one component that uses the inverted ground (R4)", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/ui/average-box.tsx"),
    "utf8",
  );

  expect(usesInverseToken(source)).toBe(true);
});

test("has no accessibility violations", async () => {
  const { container } = render(
    <>
      <AverageBox value={7.13} />
      <AverageBox value={null} />
    </>,
  );

  expect(screen.getAllByRole("img")).toHaveLength(2);
  await expectNoAxeViolations(container);
});
