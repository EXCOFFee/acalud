export interface TramoDescuento {
  cantidad_minima: number;
  descuento_pct: number;
}

/** Línea del carrito + datos del juego necesarios para el cálculo server-side (CU-010). */
export interface LineaConJuego {
  juego_id: string;
  nombre: string;
  cantidad: number;
  precio_lista: number;
  stock_actual: number;
  tramos: TramoDescuento[];
}

export interface LineaCarritoView {
  juego_id: string;
  nombre: string;
  cantidad: number;
  precio_lista: number;
  descuento_pct: number;
  precio_unitario: number;
  subtotal: number;
  disponible: boolean;
}

export interface CarritoView {
  lineas: LineaCarritoView[];
  total: number;
  ahorro_total: number;
  contexto: string | null;
}
