import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure these server-side packages are included in the standalone build
  serverExternalPackages: [
    'better-sqlite3',
    '@prisma/client',
    'sharp',
  ],
};

export default nextConfig;
