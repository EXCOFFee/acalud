import { defineConfig } from 'vitest/config';

// Vitest para dominio puro y tests de arquitectura (rápido, sin decoradores).
// Cuando se agreguen tests de integración con NestJS DI (Testcontainers, ADR-002),
// se incorpora `unplugin-swc` para emitir metadata de decoradores.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'test/architecture/__fixtures__/**'],
  },
});
