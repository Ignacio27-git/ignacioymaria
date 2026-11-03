// @vitest-environment node
import { describe, expect, it } from "vitest";

import { readProdBaseUrl } from "./env";

describe("readProdBaseUrl", () => {
  it("returns an https URL without a trailing slash", () => {
    expect(readProdBaseUrl({ PROD_BASE_URL: "https://app.vercel.app/" })).toBe(
      "https://app.vercel.app",
    );
    expect(readProdBaseUrl({ PROD_BASE_URL: "https://app.vercel.app" })).toBe(
      "https://app.vercel.app",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(readProdBaseUrl({ PROD_BASE_URL: "  https://a.example.com \n" })).toBe(
      "https://a.example.com",
    );
  });

  it("fails clearly when the variable is missing or empty", () => {
    expect(() => readProdBaseUrl({})).toThrow(/PROD_BASE_URL/);
    expect(() => readProdBaseUrl({ PROD_BASE_URL: "  " })).toThrow(
      /PROD_BASE_URL/,
    );
  });

  it("rejects non-https URLs", () => {
    expect(() => readProdBaseUrl({ PROD_BASE_URL: "http://app.vercel.app" })).toThrow(
      /https/,
    );
    expect(() => readProdBaseUrl({ PROD_BASE_URL: "not a url" })).toThrow(
      /PROD_BASE_URL/,
    );
  });

  it("rejects local hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "app.localhost"]) {
      expect(() =>
        readProdBaseUrl({ PROD_BASE_URL: `https://${host}:3000` }),
      ).toThrow(/local/i);
    }
  });
});
