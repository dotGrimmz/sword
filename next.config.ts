import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*supabase\.co\/storage\/v1\/object\/public\//i,
      handler: "CacheFirst",
      options: {
        cacheName: "supabase-storage",
        cacheableResponse: {
          statuses: [0, 200],
        },
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
  ],
}) as ((config: NextConfig) => NextConfig);

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
