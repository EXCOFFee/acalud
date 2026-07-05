// @ts-check
/**
 * Linter de fronteras hexagonales (ADR-002) — regla de dependencias INVIOLABLE.
 * Si un import ilegal rompe el build, está mal el código, no el linter.
 *
 * Capas por bounded context:  domain ← application ← infrastructure
 *   - domain no importa nada de application ni infrastructure.
 *   - application importa solo domain.
 *   - infrastructure puede importar application/domain.
 * Y ningún módulo importa el domain/infrastructure de otro módulo (2.3 §3);
 * la comunicación entre bounded contexts va por eventos (platform/) o application.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-domain-a-infra',
      comment: 'domain no puede importar infrastructure (ADR-002).',
      severity: 'error',
      from: { path: '(^|/)domain/' },
      to: { path: '(^|/)infrastructure/' },
    },
    {
      name: 'no-domain-a-application',
      comment: 'domain no puede importar application; el dominio no conoce casos de uso (ADR-002).',
      severity: 'error',
      from: { path: '(^|/)domain/' },
      to: { path: '(^|/)application/' },
    },
    {
      name: 'no-application-a-infra',
      comment: 'application importa solo domain, nunca infrastructure (ADR-002).',
      severity: 'error',
      from: { path: '(^|/)application/' },
      to: { path: '(^|/)infrastructure/' },
    },
    {
      name: 'no-cruce-entre-modulos',
      comment:
        'Ningún módulo importa el interior de otro; se comunican por eventos (platform/) o application explícita (2.3 §3).',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/([^/]+)/', pathNot: '^src/modules/$1/' },
    },
    {
      name: 'no-circular',
      comment: 'Sin dependencias circulares.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.js', '.json'],
    },
  },
};
