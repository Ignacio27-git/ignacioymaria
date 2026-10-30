import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The dev server is reached through 127.0.0.1 so the magic-link host matches
  // the cookie host (see docs/DECISIONS.md).
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
