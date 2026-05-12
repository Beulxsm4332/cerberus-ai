import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Proxy HexStrike Python backend (port 9999) through Next.js portal (port 8888)
  // All HexStrike tools accessible at /hexstrike-api/* without CORS issues
  async rewrites() {
    return [
      {
        source: "/hexstrike-api/:path*",
        destination: `${process.env.HEXSTRIKE_BACKEND_URL || "http://127.0.0.1:9999"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
