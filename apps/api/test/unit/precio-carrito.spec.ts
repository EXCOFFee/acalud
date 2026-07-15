import { describe, expect, it } from 'vitest';
import type { LineaConJuego, TramoDescuento } from '../../src/modules/compras/domain/carrito';
import {
  calcularCarrito,
  descuentoAplicable,
  redondear2,
} from '../../src/modules/compras/domain/precio';

const TRAMOS: TramoDescuento[] = [
  { cantidad_minima: 5, descuento_pct: 10 },
  { cantidad_minima: 10, descuento_pct: 18 },
];

describe('descuentoAplicable · borde exacto del tramo (CU-022)', () => {
  it('comprar JUSTO cantidad_minima aplica el descuento (>=, NO >) — el off-by-one', () => {
    // El borde inclusivo: exactamente 5 unidades ya activa el tramo de 5, exactamente 10 el de 10.
    expect(descuentoAplicable(5, TRAMOS)).toBe(10);
    expect(descuentoAplicable(10, TRAMOS)).toBe(18);
  });

  it('una unidad por debajo del mínimo NO entra a ese tramo', () => {
    expect(descuentoAplicable(4, TRAMOS)).toBe(0); // debajo del primer tramo → sin descuento
    expect(descuentoAplicable(9, TRAMOS)).toBe(10); // cae al tramo de 5, no al de 10
  });

  it('sin tramos aplicables → 0 %', () => {
    expect(descuentoAplicable(3, TRAMOS)).toBe(0);
    expect(descuentoAplicable(50, [])).toBe(0);
  });

  it('con varios tramos aplicables elige el mayor descuento', () => {
    expect(descuentoAplicable(12, TRAMOS)).toBe(18); // 12>=5 y 12>=10 → el mejor
  });
});

describe('calcularCarrito · totales server-side', () => {
  function linea(over: Partial<LineaConJuego> = {}): LineaConJuego {
    return {
      juego_id: 'j1',
      nombre: 'Juego',
      cantidad: 5,
      precio_lista: 10000,
      stock_actual: 100,
      tramos: TRAMOS,
      ...over,
    };
  }

  it('al llegar justo al mínimo aplica el descuento y calcula precio_unitario/subtotal/ahorro', () => {
    const v = calcularCarrito([linea({ cantidad: 5 })], null);
    const l = v.lineas[0];
    expect(l?.descuento_pct).toBe(10);
    expect(l?.precio_unitario).toBe(9000); // 10000 × 0,90
    expect(l?.subtotal).toBe(45000); // 9000 × 5
    expect(l?.disponible).toBe(true);
    expect(v.total).toBe(45000);
    expect(v.ahorro_total).toBe(5000); // (10000 − 9000) × 5
  });

  it('sin alcanzar el tramo no descuenta', () => {
    const v = calcularCarrito([linea({ cantidad: 4 })], null);
    expect(v.lineas[0]?.descuento_pct).toBe(0);
    expect(v.total).toBe(40000);
    expect(v.ahorro_total).toBe(0);
  });

  it('marca no disponible cuando la cantidad supera el stock', () => {
    const v = calcularCarrito([linea({ cantidad: 3, stock_actual: 2, tramos: [] })], null);
    expect(v.lineas[0]?.disponible).toBe(false);
  });
});

describe('redondear2', () => {
  it('redondea a centavos (media hacia arriba)', () => {
    expect(redondear2(10.125)).toBe(10.13);
    expect(redondear2(9000)).toBe(9000);
  });
});
