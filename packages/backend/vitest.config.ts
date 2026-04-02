import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Allow enough time for DB setup per test file
    testTimeout: 15_000,
    // Run test files serially to avoid DB contention between suites
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
