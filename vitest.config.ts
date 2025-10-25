import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    environmentMatchGlobs: [
      // Use node environment for API and lib integration tests only
      // React component integration tests (*.tsx) will use jsdom
      ['tests/integration/api/**', 'node'],
      ['tests/integration/lib/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        'components/features/interpretation/**': {
          lines: 50,
          functions: 50,
          branches: 50,
          statements: 50,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
