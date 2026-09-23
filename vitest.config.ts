import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // `server-only` throws outside the React Server Components condition
      // (which vitest's node environment does not set), so resolve it to the
      // package's no-op module in tests.
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      // Generated Shopify SDKs and hand-written GraphQL documents are not
      // authored code, so they are excluded from the coverage denominator.
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/shopify/storefront/index.ts',
        'src/shopify/admin/index.ts',
        'src/types/**',
        // Presentational UI is verified through the build/type-check and
        // end-to-end flows; unit coverage tracks business logic only.
        'src/app/**',
        'src/components/**',
      ],
      // A floor that fails the build when business-logic coverage regresses.
      // Kept a few points below the current baseline so ordinary changes do not
      // trip it; raise these as the suite grows.
      thresholds: {
        branches: 74,
        functions: 68,
        lines: 35,
        statements: 35,
      },
    },
  },
});
