import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Proxy HexStrike Python backend (port 8888) through Next.js portal (port 3000)
  // All HexStrike tools accessible at /hexstrike-api/* without CORS issues
  async rewrites() {
    return [
      {
        source: "/hexstrike-api/:path*",
        destination: `${process.env.HEXSTRIKE_BACKEND_URL || "http://127.0.0.1:8888"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
