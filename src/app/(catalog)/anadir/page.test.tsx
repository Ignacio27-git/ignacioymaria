import { expect, test, vi } from "vitest";

vi.mock("./add-form", () => ({ AddForm: vi.fn() }));

import { AddScreen } from "./add-screen";
import AddPage, { metadata } from "./page";

test("hands the request's search params to the screen without reading them", () => {
  const searchParams = Promise.resolve({ desde: "vistas" });

  const element = AddPage({ params: Promise.resolve({}), searchParams });

  expect(element.type).toBe(AddScreen);
  expect(element.props).toEqual({ searchParams });
});

test("has its own title", () => {
  expect(metadata.title).toBe("Añadir · Ignacio y María");
});
