import { defineConfig } from 'vitest/config';

// Tests de integración: PostgreSQL REAL vía Testcontainers (ADR-002 / CLAUDE.md).
// Prohibido mockear la BD para estos tests. Requieren Docker (local o CI).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.integration.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 180_000, // arranque del contenedor + aplicación de migraciones
    fileParallelism: false, // un contenedor de Postgres por vez
  },
});
