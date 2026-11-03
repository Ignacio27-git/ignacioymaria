import { expect, test, vi } from "vitest";

vi.mock("@/server/titles/list", () => ({ listTitles: vi.fn() }));

import { TitlesList } from "../titles-list";
import PendientesPage, { metadata } from "./page";

test("renders the Pendientes list with the request's search params", () => {
  const searchParams = Promise.resolve({ estado: "urgent" });

  const element = PendientesPage({
    params: Promise.resolve({}),
    searchParams,
  });

  expect(element.type).toBe(TitlesList);
  expect(element.props).toEqual({ list: "pendientes", searchParams });
});

test("has its own title", () => {
  expect(metadata.title).toBe("Pendientes · Ignacio y María");
});
