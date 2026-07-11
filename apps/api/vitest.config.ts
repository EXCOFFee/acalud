import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Vitest para dominio puro y tests de arquitectura (rápido, sin Docker).
// SWC emite metadata de decoradores (por si un test unitario usa NestJS DI en el futuro);
// para el dominio puro es inocuo. Los tests de integración usan vitest.integration.config.ts.
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
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: [
      'node_modules',
      'dist',
      'test/architecture/__fixtures__/**',
      'test/integration/**',
    ],
  },
});
