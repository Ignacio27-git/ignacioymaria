import { describe, expect, test } from "vitest";

import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  test.each(["/login", "/auth/confirm", "/auth/anything/else"])(
    "%s is public",
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    },
  );

  test.each(["/", "/titles", "/loginx", "/authx", "/auth", "/x/login"])(
    "%s is protected",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );
});
