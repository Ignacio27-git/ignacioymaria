// @vitest-environment node
import { describe, expect, test } from "vitest";

import { deltaE2000, hexToLab, stateFromFill } from "./color";

describe("deltaE2000", () => {
  test("matches the Sharma reference pair 1", () => {
    const d = deltaE2000(
      { l: 50, a: 2.6772, b: -79.7751 },
      { l: 50, a: 0, b: -82.7485 },
    );
    expect(d).toBeCloseTo(2.0425, 4);
  });

  test("is zero for identical colors", () => {
    const lab = hexToLab("61D230");
    expect(deltaE2000(lab, lab)).toBe(0);
  });
});

describe("stateFromFill", () => {
  test.each([
    ["FFFF6363", "urgent"],
    ["FF61D230", "watched"],
    ["FFB184D2", "watched_no_rewatch"],
    ["FFFFFF00", "watched_rewatch"],
    ["FFA4C2F4", "watched_awful"],
  ])("exact legend color %s maps to %s without a report", (argb, state) => {
    expect(stateFromFill(argb)).toEqual({ state, offLegend: null });
  });

  test("ignores alpha and case", () => {
    expect(stateFromFill("0061d230").state).toBe("watched");
    expect(stateFromFill("61d230").state).toBe("watched");
  });

  test("no fill is pending and not reported", () => {
    expect(stateFromFill(null)).toEqual({ state: "pending", offLegend: null });
  });

  test("an unparseable fill is pending and not reported", () => {
    expect(stateFromFill("not-a-color").state).toBe("pending");
  });

  test.each([
    ["FF00FF00", "watched"],
    ["FF8E7CC3", "watched_no_rewatch"],
    ["FFB4A7D6", "watched_no_rewatch"],
    ["FF000000", "watched_no_rewatch"],
  ])("off-legend %s maps to nearest %s and is reported", (argb, state) => {
    const result = stateFromFill(argb);
    expect(result.state).toBe(state);
    expect(result.offLegend?.original).toBe(argb.slice(-6));
    expect(result.offLegend?.distance).toBeGreaterThan(0);
  });
});
