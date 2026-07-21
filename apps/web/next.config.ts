import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  transpilePackages: isDev ? [] : ['@edunexus/shared', '@edunexus/database'],
  turbopack: {
    resolveExtensions: [
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.mjs',
      '.json',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  cacheMaxMemorySize: 50 * 1024 * 1024,
};

export default nextConfig;
