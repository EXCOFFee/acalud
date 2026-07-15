import type { CarritoView, LineaCarritoView, LineaConJuego, TramoDescuento } from './carrito';

/** Redondeo a centavos (money). El cliente nunca manda precios: todo esto es server-side. */
export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Descuento por cantidad (CU-022): el mayor `descuento_pct` entre los tramos cuyo mínimo NO
 * supera la cantidad comprada — es decir, `cantidad >= cantidad_minima` (**borde inclusivo**:
 * comprar JUSTO `cantidad_minima` unidades ya aplica el descuento, el `>=`, no `>`). Sin tramo
 * aplicable → 0 %.
 */
export function descuentoAplicable(cantidad: number, tramos: TramoDescuento[]): number {
  let pct = 0;
  for (const t of tramos) {
    if (cantidad >= t.cantidad_minima && t.descuento_pct > pct) pct = t.descuento_pct;
  }
  return pct;
}

/** Arma la vista del carrito con precios, descuentos y totales calculados server-side. */
export function calcularCarrito(lineas: LineaConJuego[], contexto: string | null): CarritoView {
  const vistas: LineaCarritoView[] = lineas.map((l) => {
    const descuento_pct = descuentoAplicable(l.cantidad, l.tramos);
    const precio_unitario = redondear2(l.precio_lista * (1 - descuento_pct / 100));
    const subtotal = redondear2(precio_unitario * l.cantidad);
    return {
      juego_id: l.juego_id,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precio_lista: l.precio_lista,
      descuento_pct,
      precio_unitario,
      subtotal,
      disponible: l.stock_actual >= l.cantidad,
    };
  });
  const total = redondear2(vistas.reduce((s, v) => s + v.subtotal, 0));
  const ahorro_total = redondear2(
    vistas.reduce((s, v) => s + (v.precio_lista * v.cantidad - v.subtotal), 0),
  );
  return { lineas: vistas, total, ahorro_total, contexto };
}
