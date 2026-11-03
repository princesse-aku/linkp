import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Docker sur Windows ne transmet pas les événements de fichiers : on scrute les changements.
  watchOptions: { pollIntervalMs: 1000 },
  devIndicators: false,
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
