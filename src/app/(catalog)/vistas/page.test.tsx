import { expect, test, vi } from "vitest";

vi.mock("@/server/titles/list", () => ({ listTitles: vi.fn() }));

import { TitlesList } from "../titles-list";
import VistasPage, { metadata } from "./page";

test("renders the Vistas list with the request's search params", () => {
  const searchParams = Promise.resolve({ q: "dune" });

  const element = VistasPage({
    params: Promise.resolve({}),
    searchParams,
  });

  expect(element.type).toBe(TitlesList);
  expect(element.props).toEqual({ list: "vistas", searchParams });
});

test("has its own title", () => {
  expect(metadata.title).toBe("Vistas · Ignacio y María");
});
