import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['engine/**/*.test.ts', 'data/**/*.test.ts', 'app/**/*.test.ts'] },
});
