import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { TitleCard, TitleCardGrid } from "./title-card";

const BASE = {
  href: "/titulo/abc",
  name: "Dune",
  year: 2021,
  posterPath: "/dune.jpg",
  state: "watched" as const,
  maria: 8,
  ignacio: 7,
  average: 7.5,
  watchedOn: "1 may 2026",
};

function renderCard(props: Partial<Parameters<typeof TitleCard>[0]> = {}) {
  return render(
    <ul>
      <TitleCard {...BASE} {...props} />
    </ul>,
  );
}

test("a full card shows cover, name, year, state, both scores, average and date", () => {
  const { container } = renderCard();
  const card = within(screen.getByRole("listitem"));

  expect(container.querySelector("img")).toHaveAttribute(
    "src",
    "https://image.tmdb.org/t/p/w342/dune.jpg",
  );
  expect(card.getByRole("link", { name: "Dune" })).toBeInTheDocument();
  expect(card.getByText("2021")).toBeInTheDocument();
  expect(card.getByText("Vista")).toBeInTheDocument();
  expect(card.getAllByText(/María/).length).toBeGreaterThan(0);
  expect(card.getByText("8")).toBeInTheDocument();
  expect(card.getByText("7")).toBeInTheDocument();
  expect(card.getByRole("img", { name: "Media 7,5" })).toBeInTheDocument();
  expect(card.getByText("1 may 2026")).toBeInTheDocument();
});

test("the elements come in order: cover, name, state, scores, date", () => {
  const { container } = renderCard();
  const html = container.innerHTML;
  const order = [
    html.indexOf("<img"),
    html.indexOf("Dune</a>"),
    html.indexOf("Vista"),
    html.indexOf("Media 7,5"),
    html.indexOf("1 may 2026"),
  ];

  expect(order.every((index) => index >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});

test("the whole card is one link to the ficha, with one tab stop", () => {
  const { container } = renderCard();

  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute("href", "/titulo/abc");
  expect(links[0]).toHaveAccessibleName("Dune");
  // The stretched link covers the card; nothing else inside is interactive.
  expect(links[0].className).toContain("after:absolute");
  expect(links[0].className).toContain("after:inset-0");
  expect(
    container.querySelectorAll("a, button, input, select, textarea, [tabindex]"),
  ).toHaveLength(1);
});

test("the name is announced once: the cover is hidden from assistive tech", () => {
  renderCard({ posterPath: null });

  expect(screen.getAllByText("Dune")).toHaveLength(2);
  expect(screen.getAllByRole("link", { name: "Dune" })).toHaveLength(1);
  expect(screen.queryByRole("img", { name: /Sin póster/ })).not.toBeInTheDocument();
});

test("a title without poster fills the cover with its name and has no image", () => {
  const { container } = renderCard({ posterPath: null });

  expect(container.querySelector("img")).toBeNull();
  const cover = container.querySelector("[aria-hidden='true'].aspect-\\[2\\/3\\]");
  expect(cover).not.toBeNull();
  expect(cover).toHaveTextContent("Dune");
});

test("with a poster the image is decorative and lazy", () => {
  const { container } = renderCard();

  const image = container.querySelector("img");
  expect(image).toHaveAttribute("alt", "");
  expect(image).toHaveAttribute("loading", "lazy");
});

test("observations never appear", () => {
  renderCard();

  expect(screen.queryByText(/observaci/i)).not.toBeInTheDocument();
});

test("without scores each person shows a dash with Sin nota for screen readers only", () => {
  const { container } = renderCard({ maria: null, ignacio: null, average: null });

  const notes = screen.getAllByText("Sin nota");
  expect(notes).toHaveLength(2);
  for (const note of notes) expect(note).toHaveClass("sr-only");
  expect(container.querySelectorAll("[aria-hidden='true']")).not.toHaveLength(0);
  expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  expect(screen.getByRole("img", { name: "Sin media" })).toBeInTheDocument();
  expect(container).not.toHaveTextContent(/NaN|undefined/);
});

test("with one score the average equals it", () => {
  renderCard({ maria: 8, ignacio: null, average: 8 });

  expect(screen.getAllByText("Sin nota")).toHaveLength(1);
  expect(screen.getByRole("img", { name: "Media 8" })).toBeInTheDocument();
});

test("the date reads as text with Fecha for screen readers, a dash when unknown", () => {
  const { rerender } = renderCard();

  expect(screen.getByText("Fecha:", { exact: false })).toHaveClass("sr-only");
  expect(screen.getByText("1 may 2026")).toBeInTheDocument();

  rerender(
    <ul>
      <TitleCard {...BASE} watchedOn="—" />
    </ul>,
  );
  expect(within(screen.getByRole("listitem")).getByText("—", { selector: "span" })).toBeInTheDocument();
});

test("a series shows its derived values like a movie shows its own", () => {
  renderCard({ name: "Dark", state: "watched_rewatch", maria: 7, ignacio: 6, average: 6.5 });

  expect(screen.getByText("Vista, repetir")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Media 6,5" })).toBeInTheDocument();
});

test("is flat and square: no radius, no shadow, only the average is inverted", () => {
  const { container } = renderCard();

  expect(container.innerHTML).not.toMatch(/rounded|shadow/);
  const inverted = container.querySelectorAll("[class*='bg-inverse']");
  expect(inverted).toHaveLength(1);
  expect(inverted[0]).toHaveAttribute("aria-label", "Media 7,5");
});

test("the year is omitted when unknown", () => {
  renderCard({ year: null });

  expect(screen.queryByText("2021")).not.toBeInTheDocument();
});

test("a card is axe clean with and without poster and scores", async () => {
  const { container } = render(
    <ul>
      <TitleCard {...BASE} />
      <TitleCard
        {...BASE}
        href="/titulo/def"
        name="Amélie"
        posterPath={null}
        maria={null}
        ignacio={null}
        average={null}
      />
    </ul>,
  );

  await expectNoAxeViolations(container);
});

test("the grid is a labelled list with the cards in the given order", () => {
  render(
    <TitleCardGrid label="Vistas">
      <TitleCard {...BASE} href="/titulo/1" name="Uno" />
      <TitleCard {...BASE} href="/titulo/2" name="Dos" />
      <TitleCard {...BASE} href="/titulo/3" name="Tres" />
    </TitleCardGrid>,
  );

  const list = screen.getByRole("list", { name: "Vistas" });
  expect(list.getAttribute("role")).toBe("list");
  expect(
    within(list).getAllByRole("link").map((link) => link.textContent),
  ).toEqual(["Uno", "Dos", "Tres"]);
  expect(list).toHaveClass("grid-cols-2", "sm:grid-cols-3", "md:grid-cols-4");
  expect(list).toHaveClass("border-t-2", "border-ink");
});
