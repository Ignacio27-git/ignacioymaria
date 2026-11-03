import { describe, expect, test } from "vitest";

import { LIST_STATES, parseListParams } from "./list-params";

describe("LIST_STATES", () => {
  test("Vistas and Pendientes never share a state", () => {
    const shared = LIST_STATES.vistas.filter((s) =>
      (LIST_STATES.pendientes as readonly string[]).includes(s),
    );
    expect(shared).toEqual([]);
  });
});

describe("parseListParams q", () => {
  test("defaults to an empty query", () => {
    expect(parseListParams("vistas", {}).q).toBe("");
  });

  test("trims whitespace", () => {
    expect(parseListParams("vistas", { q: "  matrix  " }).q).toBe("matrix");
  });

  test("caps the query at 100 characters", () => {
    const { q } = parseListParams("vistas", { q: "a".repeat(150) });
    expect(q).toHaveLength(100);
  });

  test("takes the first value of a repeated parameter", () => {
    expect(parseListParams("vistas", { q: ["one", "two"] }).q).toBe("one");
  });
});

describe("parseListParams estado", () => {
  test("empty selection means every state of the list", () => {
    const parsed = parseListParams("vistas", {});
    expect(parsed.selectedStates).toEqual([]);
    expect(parsed.states).toEqual(LIST_STATES.vistas);
  });

  test("TL-3 S1: keeps a valid state of the list", () => {
    const parsed = parseListParams("vistas", {
      estado: "watched_awful",
      q: "matrix",
    });
    expect(parsed.selectedStates).toEqual(["watched_awful"]);
    expect(parsed.states).toEqual(["watched_awful"]);
    expect(parsed.q).toBe("matrix");
  });

  test("drops bogus values without failing", () => {
    const parsed = parseListParams("vistas", { estado: "bogus,watched" });
    expect(parsed.selectedStates).toEqual(["watched"]);
  });

  test("only bogus values fall back to all states", () => {
    const parsed = parseListParams("vistas", { estado: "bogus" });
    expect(parsed.selectedStates).toEqual([]);
    expect(parsed.states).toEqual(LIST_STATES.vistas);
  });

  test("TL-3 S3: a state of the other list is ignored", () => {
    const parsed = parseListParams("pendientes", { estado: "watched" });
    expect(parsed.selectedStates).toEqual([]);
    expect(parsed.states).toEqual(LIST_STATES.pendientes);
  });

  test("removes duplicates and keeps list order", () => {
    const parsed = parseListParams("pendientes", {
      estado: "pending,urgent,pending",
    });
    expect(parsed.selectedStates).toEqual(["urgent", "pending"]);
  });
});

describe("parseListParams orden", () => {
  test("TL-3 S2: unknown order falls back to the list default", () => {
    expect(parseListParams("vistas", { orden: "zzz" }).order).toBe("fecha");
    expect(parseListParams("pendientes", { orden: "zzz" }).order).toBe(
      "priority",
    );
  });

  test("accepts the orders of the list", () => {
    expect(parseListParams("vistas", { orden: "nota" }).order).toBe("nota");
    expect(parseListParams("pendientes", { orden: "fecha" }).order).toBe(
      "fecha",
    );
    expect(parseListParams("pendientes", { orden: "priority" }).order).toBe(
      "priority",
    );
  });

  test("priority is not an order of Vistas", () => {
    expect(parseListParams("vistas", { orden: "priority" }).order).toBe(
      "fecha",
    );
  });
});
