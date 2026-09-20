import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    // Pure geometry/metrics — no DOM needed. measureTextWidth falls back to
    // its heuristic without a canvas, and these tests supply widths directly.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Threaded workers time out talking to Vite on this Windows setup;
    // a single forked process is slower to start but reliable.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
