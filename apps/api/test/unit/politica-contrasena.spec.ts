import { describe, expect, it } from 'vitest';
import { longitudContrasenaValida } from '../../src/modules/identidad/domain/contrasena';
import { normalizarEmail } from '../../src/modules/identidad/domain/email';

describe('Política de contraseña (PA-01) y normalización de email', () => {
  it('acepta 12–128 caracteres y rechaza fuera de rango', () => {
    expect(longitudContrasenaValida('a'.repeat(11))).toBe(false);
    expect(longitudContrasenaValida('a'.repeat(12))).toBe(true);
    expect(longitudContrasenaValida('a'.repeat(128))).toBe(true);
    expect(longitudContrasenaValida('a'.repeat(129))).toBe(false);
  });

  it('normaliza el email a minúsculas y sin espacios (unicidad CU-001)', () => {
    expect(normalizarEmail('  Maria@Escuela.EDU.ar ')).toBe('maria@escuela.edu.ar');
  });
});
