import { execSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

/**
 * Prueba que el linter de fronteras hexagonales (ADR-002) realmente funciona:
 * el código real de src/ está limpio, y un import ilegal (domain→infrastructure)
 * en un fixture ROMPE la verificación. Es el "linter probado" del Gate 0 (5.1 §4).
 */
function depcruise(target: string): { code: number; salida: string } {
  try {
    const salida = execSync(
      `pnpm exec depcruise ${target} --config .dependency-cruiser.cjs --no-progress`,
      { encoding: 'utf8', stdio: 'pipe' },
    );
    return { code: 0, salida };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, salida: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

// depcruise cruza todo src/ (crece con el proyecto): timeout amplio para estos tests.
const TIMEOUT_DEPCRUISE = 60_000;

describe('Fronteras hexagonales (ADR-002)', () => {
  it(
    'el código real de src/ no viola ninguna frontera',
    () => {
      const { code, salida } = depcruise('src');
      expect(code, salida).toBe(0);
    },
    TIMEOUT_DEPCRUISE,
  );

  it(
    'un import ilegal domain→infrastructure rompe la verificación',
    () => {
      const { code, salida } = depcruise('test/architecture/__fixtures__/import-ilegal');
      expect(code).not.toBe(0);
      expect(salida).toContain('no-domain-a-infra');
    },
    TIMEOUT_DEPCRUISE,
  );
});
