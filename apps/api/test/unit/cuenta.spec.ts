import { describe, expect, it } from 'vitest';
import { Cuenta, type DatosCuenta } from '../../src/modules/identidad/domain/cuenta';
import {
  estaBloqueadoPorIntentos,
  UMBRAL_INTENTOS_FALLIDOS,
  VENTANA_BLOQUEO_MS,
  ventanaDesde,
} from '../../src/modules/identidad/domain/politica-bloqueo';

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
    ...overrides,
  });
}

// El bloqueo ya no vive en el agregado: se calcula sobre los intentos recientes de
// `login_attempts` (decisión Δ3). CU-02 A2.6/A3.1: tres intentos, quince minutos.
describe('Política de bloqueo por fuerza bruta (CU-02 RN-007)', () => {
  it('el 3º intento fallido dentro de la ventana bloquea el ingreso', () => {
    expect(UMBRAL_INTENTOS_FALLIDOS).toBe(3);
    expect(estaBloqueadoPorIntentos(2)).toBe(false);
    expect(estaBloqueadoPorIntentos(3)).toBe(true); // borde exacto del umbral
    expect(estaBloqueadoPorIntentos(4)).toBe(true);
  });

  it('sin fallos recientes no hay bloqueo', () => {
    expect(estaBloqueadoPorIntentos(0)).toBe(false);
  });

  it('la ventana que se consulta es de 15 minutos hacia atrás', () => {
    expect(VENTANA_BLOQUEO_MS).toBe(15 * 60_000);
    expect(ventanaDesde(T0).getTime()).toBe(T0.getTime() - 15 * 60_000);
  });
});

describe('Cuenta', () => {
  it('la cuenta con correo sin confirmar tiene capacidades limitadas', () => {
    expect(cuenta({ estado: 'no_verificada' }).capacidadesLimitadas).toBe(true);
    expect(cuenta({ estado: 'verificada' }).capacidadesLimitadas).toBe(false);
  });

  it('aPerfil expone los datos públicos de la cuenta', () => {
    const perfil = cuenta({ esAdmin: true }).aPerfil();
    expect(perfil).toEqual({
      id: 'c1',
      email: 'a@b.com',
      nombre: 'N',
      apellido: 'A',
      estado: 'verificada',
      es_admin: true,
    });
  });
});
