/**
 * Punto de entrada de los tipos del contrato de API, compartidos entre web y api.
 *
 * Los tipos concretos se GENERAN desde el openapi.yaml (fuente de verdad en
 * `docs/02-arquitectura/2.4-contratos/openapi.yaml`) con el script `pnpm generate`,
 * hacia `./generated/types.ts` (no versionado). Este módulo los re-exportará una vez
 * generados. En la Etapa 0 aún no se consumen; se deja el punto de entrada preparado.
 */

// export type { paths, components, operations } from '../generated/types.js';

export {};
