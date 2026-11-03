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
