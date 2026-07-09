import { defineConfig } from 'vitest/config';

// Vitest para dominio puro y tests de arquitectura (rápido, sin Docker).
// Los tests de integración (Testcontainers) usan vitest.integration.config.ts.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: [
      'node_modules',
      'dist',
      'test/architecture/__fixtures__/**',
      'test/integration/**',
    ],
  },
});
