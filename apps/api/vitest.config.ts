import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./src/tests/globalSetup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/tests/**', 'src/index.ts'],
      thresholds: {
        'src/routes/auth/**': { lines: 100, functions: 100 },
        'src/services/**': { lines: 90, functions: 90 },
        'src/routes/**': { lines: 80, functions: 80 },
      },
    },
  },
});
