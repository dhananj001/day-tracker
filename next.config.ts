import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    // Include custom service worker for background sync
    importScripts: ["/sw-custom.js"],
  },
});

const nextConfig: NextConfig = {
  // Empty turbopack config to silence warning when webpack is used for PWA
  turbopack: {},
};

export default withPWA(nextConfig);
