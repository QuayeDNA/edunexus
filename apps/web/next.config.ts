import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  transpilePackages: isDev ? [] : ['@edunexus/shared', '@edunexus/database'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    turbo: {
      resolveExtensions: [
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json',
      ],
    },
  },
  cacheMaxMemorySize: 50 * 1024 * 1024,
};

export default nextConfig;
