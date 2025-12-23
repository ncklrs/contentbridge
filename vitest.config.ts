import { defineConfig } from 'vitest/config'

/**
 * Root Vitest configuration for ContentBridge monorepo
 *
 * This configuration is used as the base for all package-level test suites.
 * Individual packages can extend this configuration with their own settings.
 */
export default defineConfig({
  test: {
    // Global test setup
    globals: true,

    // Environment
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/test-utils/**',
        '**/__tests__/**',
        '**/examples/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Test include/exclude patterns
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Reporters
    reporters: ['verbose'],

    // Retry failed tests once
    retry: 0,

    // Isolation
    isolate: true,

    // Pool options
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
})
