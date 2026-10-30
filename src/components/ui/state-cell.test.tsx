import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { WATCH_STATE_LABELS, WATCH_STATES } from "@/domain/watch-state";
import { expectNoAxeViolations } from "@/test/axe";

import { StateCell, StateSwatch } from "./state-cell";

test.each(WATCH_STATES)("%s shows its exact legend label", (state) => {
  render(<StateCell state={state} />);

  expect(screen.getByText(WATCH_STATE_LABELS[state])).toBeInTheDocument();
});

test("the six labels are the Excel legend", () => {
  expect(WATCH_STATES.map((state) => WATCH_STATE_LABELS[state])).toEqual([
    "Urgente de ver",
    "Vista",
    "Vista, repetir",
    "Vista, no repetir",
    "Vista y horrible",
    "Pendiente",
  ]);
});

test("the swatch is decorative and carries a state-specific marker", () => {
  const { container } = render(
    <>
      <StateCell state="urgent" />
      <StateCell state="watched" />
    </>,
  );

  const swatches = container.querySelectorAll('[aria-hidden="true"]');
  expect(swatches).toHaveLength(2);
  expect(swatches[0]).toHaveAttribute("data-state", "urgent");
  expect(swatches[1]).toHaveAttribute("data-state", "watched");
});

test("pending is an empty outline and the other states are filled", () => {
  const { container } = render(
    <>
      <StateCell state="pending" />
      <StateCell state="watched_awful" />
    </>,
  );

  const [pending, awful] = container.querySelectorAll('[aria-hidden="true"]');
  expect(pending).toHaveAttribute("data-filled", "false");
  expect(awful).toHaveAttribute("data-filled", "true");
});

test("StateSwatch alone adds no text to the accessibility tree", () => {
  const { container } = render(<StateSwatch state="watched_rewatch" />);

  expect(container).toHaveTextContent("");
  expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
});

test("forwards className to the cell", () => {
  render(<StateCell state="watched" className="extra" />);

  expect(screen.getByText("Vista").parentElement).toHaveClass("extra");
});

test("has no accessibility violations for any state", async () => {
  const { container } = render(
    <ul>
      {WATCH_STATES.map((state) => (
        <li key={state}>
          <StateCell state={state} />
        </li>
      ))}
    </ul>,
  );

  expect(screen.getAllByRole("listitem")).toHaveLength(6);
  await expectNoAxeViolations(container);
});
