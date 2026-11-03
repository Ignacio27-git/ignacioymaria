import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { TmdbAttribution } from "./tmdb-attribution";

test("states the TMDB notice and links to TMDB", () => {
  render(<TmdbAttribution />);

  const link = screen.getByRole("link", { name: "TMDB" });
  expect(link.parentElement).toHaveTextContent(
    "Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB.",
  );
  expect(screen.getByRole("link", { name: "TMDB" })).toHaveAttribute(
    "href",
    "https://www.themoviedb.org",
  );
});

test("forwards className", () => {
  const { container } = render(<TmdbAttribution className="mt-8" />);

  expect(container.firstElementChild).toHaveClass("mt-8");
});
