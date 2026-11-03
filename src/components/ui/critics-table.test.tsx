import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";
import { makeScore } from "@/test/score";

import {
  CriticsTable,
  CriticsTableHeader,
  CriticsTableRow,
} from "./critics-table";

function Sample({ showDate = false }: { showDate?: boolean }) {
  return (
    <CriticsTable label="Películas vistas">
      <CriticsTableHeader guideWords="Alien – Zodiac" showDate={showDate} />
      <CriticsTableRow
        href="/titulo/1"
        name="Alien, el octavo pasajero"
        year={1979}
        state="watched"
        maria={makeScore(9)}
        ignacio={makeScore(8.5)}
        average={8.75}
        watchedOn={showDate ? "12 mar 2024" : undefined}
      />
      <CriticsTableRow
        name="Zodiac"
        year={null}
        state="pending"
        maria={null}
        ignacio={null}
        average={null}
        watchedOn={showDate ? "—" : undefined}
      />
    </CriticsTable>
  );
}

function expectHeaderNames(names: string[]) {
  const headers = screen.getAllByRole("columnheader");
  expect(headers).toHaveLength(names.length);
  names.forEach((name, index) => {
    expect(headers[index]).toHaveAccessibleName(name);
  });
}

describe("CriticsTable semantics", () => {
  test("is a table with an accessible name", () => {
    render(<Sample />);

    expect(
      screen.getByRole("table", { name: "Películas vistas" }),
    ).toBeInTheDocument();
  });

  test("exposes four column headers: Título, María, Ignacio, Media", () => {
    render(<Sample />);

    expectHeaderNames(["Título", "María", "Ignacio", "Media"]);
  });

  test("adds a Fecha column header when showDate is set", () => {
    render(<Sample showDate />);

    expectHeaderNames(["Título", "María", "Ignacio", "Media", "Fecha"]);
  });

  test("has one row per title plus the header row", () => {
    render(<Sample />);

    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  test("guide words orient sighted users without renaming the column", () => {
    render(<Sample />);

    const guide = screen.getByText("Alien – Zodiac");
    expect(guide).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("columnheader", { name: "Título" })).toBeVisible();
  });
});

describe("CriticsTableRow", () => {
  test("shows title, year and state under it, scores and the average", () => {
    render(<Sample />);

    const [, alien] = screen.getAllByRole("row");
    expect(within(alien).getByText("Alien, el octavo pasajero")).toBeVisible();
    expect(within(alien).getByText("1979")).toBeVisible();
    expect(within(alien).getByText("Vista")).toBeVisible();
    expect(within(alien).getByText("9")).toBeVisible();
    expect(within(alien).getByText("8,5")).toBeVisible();
    expect(
      within(alien).getByRole("img", { name: "Media 8,75" }),
    ).toBeInTheDocument();
    expect(within(alien).getAllByRole("cell")).toHaveLength(4);
  });

  test("the title is a link when href is given", () => {
    render(<Sample />);

    expect(
      screen.getByRole("link", { name: "Alien, el octavo pasajero" }),
    ).toHaveAttribute("href", "/titulo/1");
    expect(screen.queryByRole("link", { name: "Zodiac" })).toBeNull();
  });

  test("missing scores and average read as Sin nota and Sin media", () => {
    render(<Sample />);

    const [, , zodiac] = screen.getAllByRole("row");
    expect(within(zodiac).getByText("Zodiac")).toBeVisible();
    expect(within(zodiac).getAllByText("Sin nota")).toHaveLength(2);
    expect(
      within(zodiac).getByRole("img", { name: "Sin media" }),
    ).toBeInTheDocument();
    expect(within(zodiac).getByText("Pendiente")).toBeVisible();
    expect(zodiac).not.toHaveTextContent("NaN");
  });

  test("the date column renders only when watchedOn is provided", () => {
    render(<Sample showDate />);

    const [, alien] = screen.getAllByRole("row");
    expect(within(alien).getAllByRole("cell")).toHaveLength(5);
    expect(within(alien).getByText("12 mar 2024")).toBeInTheDocument();
  });

  test("forwards className to the row", () => {
    render(
      <CriticsTable label="t">
        <CriticsTableRow
          name="X"
          year={2000}
          state="watched"
          maria={null}
          ignacio={null}
          average={null}
          className="row-extra"
        />
      </CriticsTable>,
    );

    expect(screen.getByRole("row")).toHaveClass("row-extra");
  });
});

test("has no accessibility violations with and without the date column", async () => {
  const { container, rerender } = render(<Sample />);
  await expectNoAxeViolations(container);

  rerender(<Sample showDate />);
  await expectNoAxeViolations(container);
});
