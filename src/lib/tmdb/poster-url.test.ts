import { expect, test } from "vitest";

import { posterUrl } from "./poster-url";

test("builds the w342 URL from a path (S-TL-18)", () => {
  expect(posterUrl("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  expect(posterUrl("/x/y.png")).toBe("https://image.tmdb.org/t/p/w342/x/y.png");
});

test.each([null, undefined, "", "abc.jpg", 5])(
  "gives no URL for %j",
  (path) => {
    expect(posterUrl(path as string | null)).toBeNull();
  },
);
