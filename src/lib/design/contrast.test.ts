// @vitest-environment node
import { describe, expect, test } from "vitest";

import {
  AA_LARGE_TEXT,
  AA_NON_TEXT,
  AA_TEXT,
  contrastRatio,
  relativeLuminance,
} from "./contrast";

describe("relativeLuminance", () => {
  test("is 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBe(1);
  });

  test("weights green above red above blue", () => {
    const red = relativeLuminance("#ff0000");
    const green = relativeLuminance("#00ff00");
    const blue = relativeLuminance("#0000ff");

    expect(red).toBeCloseTo(0.2126, 4);
    expect(green).toBeCloseTo(0.7152, 4);
    expect(blue).toBeCloseTo(0.0722, 4);
  });

  test("accepts upper case and rejects malformed hex", () => {
    expect(relativeLuminance("#FFFFFF")).toBe(1);
    expect(() => relativeLuminance("fff")).toThrow("#rrggbb");
    expect(() => relativeLuminance("#12345")).toThrow("#rrggbb");
  });
});

describe("contrastRatio", () => {
  test("is 21 between black and white, in either order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  test("is 1 for identical colors", () => {
    expect(contrastRatio("#858480", "#858480")).toBe(1);
  });

  test("matches a known mid-range reference (#767676 on white is 4.54)", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe("AA thresholds", () => {
  test("are 4.5 for text, 3 for large text and 3 for non-text", () => {
    expect(AA_TEXT).toBe(4.5);
    expect(AA_LARGE_TEXT).toBe(3);
    expect(AA_NON_TEXT).toBe(3);
  });
});
