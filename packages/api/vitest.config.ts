import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30_000, // allow time for DB setup / bcrypt hashing
    hookTimeout: 30_000,
    // Run test files serially to avoid DB contention between suites
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
