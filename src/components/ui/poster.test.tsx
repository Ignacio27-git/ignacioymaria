import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { Poster } from "./poster";

test("renders the TMDB image built from the stored path", () => {
  render(<Poster path="/abc.jpg" name="Dune" />);

  const image = screen.getByRole("img", { name: "Póster de Dune" });
  expect(image).toHaveAttribute("src", "https://image.tmdb.org/t/p/w342/abc.jpg");
});

test("a decorative poster is hidden from assistive tech", () => {
  const { container } = render(<Poster path="/abc.jpg" name="Dune" decorative />);

  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(container.querySelector("img")).toHaveAttribute("alt", "");
});

test("without a path a neutral placeholder keeps the same box", () => {
  const { container } = render(<Poster path={null} name="Mi peli" />);

  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByRole("img", { name: "Sin póster de Mi peli" })).toBeInTheDocument();
});

test("forwards className to the box", () => {
  const { container } = render(<Poster path={null} name="Mi peli" className="w-24" />);

  expect(container.firstElementChild).toHaveClass("w-24");
});

test("is axe clean with and without an image", async () => {
  const { container } = render(
    <>
      <Poster path="/abc.jpg" name="Dune" />
      <Poster path={null} name="Mi peli" />
    </>,
  );

  await expectNoAxeViolations(container);
});

test("fallback title writes the name in the 2:3 box with no image", () => {
  const { container } = render(
    <Poster path={null} name="Alien: el octavo pasajero" fallback="title" />,
  );

  expect(container.querySelector("img")).toBeNull();
  const box = container.firstElementChild as HTMLElement;
  expect(box).toHaveClass("aspect-[2/3]");
  const text = screen.getByText("Alien: el octavo pasajero");
  expect(box).toContainElement(text);
  expect(text).toHaveClass("line-clamp-6", "font-condensed", "text-2xl", "font-extrabold");
  expect(text.className).toContain("[overflow-wrap:anywhere]");
});

test("fallback title with decorative hides the fallback box from assistive tech", () => {
  const { container } = render(
    <Poster path={null} name="Mi peli" fallback="title" decorative />,
  );

  expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("fallback title without decorative names the box as a missing poster", () => {
  render(<Poster path={null} name="Mi peli" fallback="title" />);

  expect(screen.getByRole("img", { name: "Sin póster de Mi peli" })).toBeInTheDocument();
});

test("fallback title does not change a poster that exists", () => {
  const { container } = render(
    <Poster path="/abc.jpg" name="Dune" fallback="title" decorative />,
  );

  expect(container.querySelector("img")).toHaveAttribute("alt", "");
  expect(container.firstElementChild).not.toHaveAttribute("aria-hidden");
  expect(screen.queryByText("Dune")).not.toBeInTheDocument();
});

test("the default fallback stays the empty placeholder (CV-7 S3)", () => {
  const { container } = render(<Poster path={null} name="Mi peli" />);

  expect(screen.queryByText("Mi peli")).not.toBeInTheDocument();
  expect(container.querySelector("span[role='img']")?.textContent).toBe("");
});

test("a poster image loads lazily", () => {
  const { container } = render(<Poster path="/abc.jpg" name="Dune" decorative />);

  expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
});

test("fallback title is axe clean", async () => {
  const { container } = render(
    <>
      <Poster path={null} name="Mi peli" fallback="title" />
      <Poster path={null} name="Otra peli" fallback="title" decorative />
    </>,
  );

  await expectNoAxeViolations(container);
});
