import type { INestApplication } from '@nestjs/common';
import { ProblemDetailsFilter } from './platform/http/problem-details.filter';

/**
 * Configuración común de la app Nest, compartida entre `main.ts` (runtime) y el harness de
 * integración (Testcontainers), para que ambos levanten la app idéntica.
 */
export function configurarApp(app: INestApplication): void {
  // Prefijo de versión de la API (contrato 2.4: servers = /api/v1).
  app.setGlobalPrefix('api/v1');

  // Errores en RFC 9457 Problem Details con trace_id (2.4 §4).
  app.useGlobalFilters(new ProblemDetailsFilter());

  // La web comparte sitio con la API vía rewrites de Vercel (ADR-004); la APK usa Bearer.
  app.enableCors({
    origin: process.env.WEB_BASE_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  // Cierra el pool de PG y demás recursos al terminar (onModuleDestroy).
  app.enableShutdownHooks();
}
