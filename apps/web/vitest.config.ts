import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@edunexus/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['./tests/**/*.test.ts'],
    exclude: ['node_modules'],
  },
});
