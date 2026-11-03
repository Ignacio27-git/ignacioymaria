import { expect, test, vi } from "vitest";

import Home from "./page";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

test("the home page sends everyone to /vistas", () => {
  Home();

  expect(redirect).toHaveBeenCalledWith("/vistas");
});
