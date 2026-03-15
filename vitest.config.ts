import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Separate projects: unit (default) and exploration (shipping API sandbox tests).
    // Run exploration with: npm run test:explore
    // Unit tests exclude exploration so they never hit real APIs.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['**/*.test.{ts,tsx}'],
          exclude: ['**/node_modules/**', '**/src/lib/shipping-exploration/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'exploration',
          environment: 'node',
          include: ['src/lib/shipping-exploration/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
