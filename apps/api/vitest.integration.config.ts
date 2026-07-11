import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Tests de integración: PostgreSQL REAL vía Testcontainers (ADR-002 / CLAUDE.md).
// SWC emite la metadata de decoradores (emitDecoratorMetadata) que NestJS DI necesita y
// que esbuild (el transformador por defecto de Vitest) no genera. Requieren Docker.
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.integration.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 180_000, // arranque del contenedor + aplicación de migraciones
    fileParallelism: false, // un contenedor de Postgres por vez
  },
});
