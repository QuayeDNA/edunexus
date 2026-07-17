import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@edunexus/shared", "@edunexus/database"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
