import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { CandidateRow } from "./candidate-row";

const candidate = {
  kind: "movie",
  name: "Dune",
  year: 2021,
  posterPath: null,
  existingId: null,
} as const;

function setup(props: Partial<Parameters<typeof CandidateRow>[0]> = {}) {
  const onChoose = vi.fn();
  const view = render(
    <ul>
      <CandidateRow
        candidate={candidate}
        busy={false}
        disabled={false}
        onChoose={onChoose}
        {...props}
      />
    </ul>,
  );
  return { onChoose, ...view };
}

test("a free candidate is one button with its name, year and kind", () => {
  const { onChoose } = setup();

  const button = screen.getByRole("button", { name: /^Dune\s*2021 · Película/ });
  fireEvent.click(button);

  expect(onChoose).toHaveBeenCalledTimes(1);
});

test("a series without year shows only its kind", () => {
  setup({ candidate: { ...candidate, kind: "series", year: null, name: "Dark" } });

  expect(screen.getByRole("button", { name: /^Dark\s*Serie$/ })).toBeInTheDocument();
});

test("a candidate already in the list is not selectable and links to its ficha", () => {
  const { onChoose } = setup({ candidate: { ...candidate, existingId: "abc" } });

  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByText("Ya está en la lista")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
    "href",
    "/titulo/abc",
  );
  expect(onChoose).not.toHaveBeenCalled();
});

test("an optional note is shown inside the selectable row", () => {
  setup({ note: "Ficha actual" });

  expect(
    screen.getByRole("button", { name: /^Dune\s*2021 · Película\s*Ficha actual$/ }),
  ).toBeInTheDocument();
});

test("without a note nothing extra is announced", () => {
  setup();

  expect(screen.getByRole("button")).toHaveAccessibleName(/^Dune\s*2021 · Película$/);
});

test("busy shows the progress label and disabled blocks the tap", () => {
  const { onChoose } = setup({ busy: true, disabled: true });

  const button = screen.getByRole("button");
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(screen.getByText("Añadiendo…")).toBeInTheDocument();
  fireEvent.click(button);
  expect(onChoose).not.toHaveBeenCalled();
});

test("is axe clean in both shapes", async () => {
  const { container } = render(
    <ul>
      <CandidateRow candidate={candidate} busy={false} disabled={false} onChoose={() => {}} note="Ficha actual" />
      <CandidateRow
        candidate={{ ...candidate, existingId: "abc" }}
        busy={false}
        disabled={false}
        onChoose={() => {}}
      />
    </ul>,
  );

  await expectNoAxeViolations(container);
});
