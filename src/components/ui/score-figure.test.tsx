import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";
import { makeScore } from "@/test/score";

import { formatScore, ScoreFigure } from "./score-figure";

describe("formatScore (es-ES, up to two decimals, half expands)", () => {
  test.each([
    [7.25, "7,25"],
    [7.5, "7,5"],
    [8, "8"],
    [0, "0"],
    [10, "10"],
    [7.125, "7,13"],
    [7.375, "7,38"],
    [6.666666, "6,67"],
  ])("%s -> %s", (value, expected) => {
    expect(formatScore(value)).toBe(expected);
  });
});

describe("ScoreFigure", () => {
  test("shows the formatted score", () => {
    render(<ScoreFigure score={makeScore(7.25)} />);

    expect(screen.getByText("7,25")).toBeInTheDocument();
  });

  test("shows a whole score without decimals", () => {
    render(<ScoreFigure score={makeScore(8)} />);

    expect(screen.getByText("8")).toBeInTheDocument();
  });

  test("a null score is a dash with the accessible text Sin nota", () => {
    const { container } = render(<ScoreFigure score={null} />);

    expect(screen.getByText("Sin nota")).toBeInTheDocument();
    expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
    expect(container).not.toHaveTextContent("NaN");
    expect(container).not.toHaveTextContent("undefined");
  });

  test("announces the person label before the score", () => {
    const { rerender, container } = render(
      <ScoreFigure score={makeScore(9)} label="María" />,
    );
    expect(container).toHaveTextContent("María: 9");

    rerender(<ScoreFigure score={null} label="Ignacio" />);
    expect(screen.getByText("Ignacio:")).toBeInTheDocument();
    expect(screen.getByText("Sin nota")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("María");
  });

  test("forwards className to the figure", () => {
    const { container } = render(
      <ScoreFigure score={makeScore(5)} className="extra" />,
    );

    expect(container.firstElementChild).toHaveClass("extra");
    expect(container.firstElementChild).toHaveTextContent("5");
  });

  test("has no accessibility violations", async () => {
    const { container } = render(
      <p>
        <ScoreFigure score={makeScore(7.5)} label="María" />
        <ScoreFigure score={null} label="Ignacio" />
      </p>,
    );

    await expectNoAxeViolations(container);
  });
});
