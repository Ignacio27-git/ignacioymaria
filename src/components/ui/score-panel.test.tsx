import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { ScorePanel } from "./score-panel";

function setup(props: Partial<Parameters<typeof ScorePanel>[0]> = {}) {
  const onChange = vi.fn();
  const view = render(<ScorePanel value={7} onChange={onChange} {...props} />);
  return { onChange, ...view };
}

test("offers the integer buttons 0 to 10 and marks the current one pressed", () => {
  setup({ value: 7 });

  const group = screen.getByRole("group", { name: "Tu nota" });
  const buttons = within(group)
    .getAllByRole("button", { name: /^(?:\d|10)$/ })
    .map((button) => button.textContent);
  expect(buttons).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  expect(screen.getByRole("button", { name: "7" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "8" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("pressing an integer button saves that value", () => {
  const { onChange } = setup({ value: 7 });

  fireEvent.click(screen.getByRole("button", { name: "8" }));

  expect(onChange).toHaveBeenCalledWith(8);
});

test("exposes the current value accessibly in Spanish format", () => {
  setup({ value: 7.25 });

  expect(screen.getByText("Tu nota: 7,25")).toHaveClass("sr-only");
});

test("+ adds a quarter point", () => {
  const { onChange } = setup({ value: 7 });

  fireEvent.click(screen.getByRole("button", { name: "Subir un cuarto de punto" }));

  expect(onChange).toHaveBeenCalledWith(7.25);
});

test("− subtracts a quarter point", () => {
  const { onChange } = setup({ value: 7.5 });

  fireEvent.click(screen.getByRole("button", { name: "Bajar un cuarto de punto" }));

  expect(onChange).toHaveBeenCalledWith(7.25);
});

test("+ is disabled at 10 and − at 0, so no invalid write happens", () => {
  const { rerender, onChange } = setup({ value: 10 });
  const up = screen.getByRole("button", { name: "Subir un cuarto de punto" });
  expect(up).toBeDisabled();
  fireEvent.click(up);

  rerender(<ScorePanel value={0} onChange={onChange} />);
  const down = screen.getByRole("button", { name: "Bajar un cuarto de punto" });
  expect(down).toBeDisabled();
  fireEvent.click(down);

  expect(onChange).not.toHaveBeenCalled();
});

test("+ clamps a value that would pass 10", () => {
  const { onChange } = setup({ value: 9.9 });

  fireEvent.click(screen.getByRole("button", { name: "Subir un cuarto de punto" }));

  expect(onChange).toHaveBeenCalledWith(10);
});

test("with no score, + starts at 0,25 and − is disabled", () => {
  const { onChange } = setup({ value: null });

  expect(
    screen.getByRole("button", { name: "Bajar un cuarto de punto" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Subir un cuarto de punto" }));

  expect(onChange).toHaveBeenCalledWith(0.25);
  expect(screen.getByText("Tu nota: Sin nota")).toBeInTheDocument();
});

test("Quitar nota clears the score and is unavailable when there is none", () => {
  const { onChange, rerender } = setup({ value: 6 });

  fireEvent.click(screen.getByRole("button", { name: "Quitar nota" }));
  expect(onChange).toHaveBeenCalledWith(null);

  rerender(<ScorePanel value={null} onChange={onChange} />);
  expect(screen.getByRole("button", { name: "Quitar nota" })).toBeDisabled();
});

test("before any save there is no stamp and no status text", () => {
  const { container } = setup({ value: 7 });

  expect(container.querySelector(".animate-stamp")).toBeNull();
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

test("a confirmed save stamps the figure once and announces it", () => {
  const { container, rerender, onChange } = setup({ value: 7.5, savedCount: 0 });

  rerender(<ScorePanel value={7.5} onChange={onChange} savedCount={1} />);

  const stamped = container.querySelectorAll(".animate-stamp");
  expect(stamped).toHaveLength(1);
  expect(stamped[0]).toHaveClass("motion-reduce:animate-none");
  expect(screen.getByRole("status")).toHaveTextContent("Nota guardada: 7,5");
});

test("under reduced motion the confirmation is a static marker plus the status", () => {
  const { container } = setup({ value: 8, savedCount: 2 });

  // motion-reduce:animate-none switches the animation off; the marker and text stay.
  expect(container.querySelector(".animate-stamp")).toHaveClass(
    "motion-reduce:animate-none",
  );
  expect(container.querySelector("[data-saved-mark]")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Nota guardada: 8");
});

test("a failed save (savedCount unchanged) shows no stamp", () => {
  const { container, rerender, onChange } = setup({ value: 7, savedCount: 0 });

  rerender(<ScorePanel value={6} onChange={onChange} savedCount={0} />);

  expect(container.querySelector(".animate-stamp")).toBeNull();
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

test("busy and disabled lock every control", () => {
  setup({ value: 5, disabled: true });

  for (const button of screen.getAllByRole("button")) {
    expect(button).toBeDisabled();
  }
});

test("forwards className to the group", () => {
  setup({ className: "extra" });

  expect(screen.getByRole("group", { name: "Tu nota" })).toHaveClass("extra");
});

test("has no accessibility violations", async () => {
  const { container } = setup({ value: 7.25, savedCount: 1 });

  await expectNoAxeViolations(container);
});
