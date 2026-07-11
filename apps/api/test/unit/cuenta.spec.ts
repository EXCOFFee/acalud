import { describe, expect, it } from 'vitest';
import { Cuenta, type DatosCuenta } from '../../src/modules/identidad/domain/cuenta';

const T0 = new Date('2026-01-01T10:00:00Z');

function cuenta(overrides: Partial<DatosCuenta> = {}): Cuenta {
  return new Cuenta({
    id: 'c1',
    email: 'a@b.com',
    hashPassword: 'h',
    nombre: 'N',
    apellido: 'A',
    estado: 'verificada',
    esAdmin: false,
    intentosFallidos: 0,
    intentosDesde: null,
    bloqueadaHasta: null,
    ...overrides,
  });
}

describe('Cuenta · bloqueo por fuerza bruta (PA-02)', () => {
  it('el 5º intento fallido dentro de la ventana bloquea 15 min', () => {
    const c = cuenta({ intentosFallidos: 4, intentosDesde: new Date(T0.getTime() - 60_000) });
    const seg = c.registrarFallo(T0);
    expect(seg.intentosFallidos).toBe(5);
    expect(seg.bloqueada).toBe(true);
    expect(seg.recienBloqueada).toBe(true);
    expect(seg.bloqueadaHasta?.getTime()).toBe(T0.getTime() + 15 * 60_000);
  });

  it('un fallo fuera de la ventana de 15 min reinicia la racha', () => {
    const c = cuenta({ intentosFallidos: 4, intentosDesde: new Date(T0.getTime() - 16 * 60_000) });
    const seg = c.registrarFallo(T0);
    expect(seg.intentosFallidos).toBe(1);
    expect(seg.bloqueada).toBe(false);
  });

  it('estaBloqueada respeta bloqueada_hasta', () => {
    expect(cuenta({ bloqueadaHasta: new Date(T0.getTime() + 60_000) }).estaBloqueada(T0)).toBe(true);
    expect(cuenta({ bloqueadaHasta: new Date(T0.getTime() - 60_000) }).estaBloqueada(T0)).toBe(
      false,
    );
    expect(cuenta().estaBloqueada(T0)).toBe(false);
  });

  it('resetearSeguridad limpia el contador y marca último login', () => {
    const seg = cuenta({ intentosFallidos: 3 }).resetearSeguridad(T0);
    expect(seg.intentosFallidos).toBe(0);
    expect(seg.bloqueadaHasta).toBeNull();
    expect(seg.ultimoLogin).toEqual(T0);
  });

  it('la cuenta no_verificada tiene capacidades limitadas (PA-06)', () => {
    expect(cuenta({ estado: 'no_verificada' }).capacidadesLimitadas).toBe(true);
    expect(cuenta({ estado: 'verificada' }).capacidadesLimitadas).toBe(false);
  });
});
