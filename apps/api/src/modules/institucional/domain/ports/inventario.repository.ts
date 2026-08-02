/**
 * Puerto de lectura del inventario institucional (CU-25).
 *
 * La membresía se resuelve contra `institutional_teachers`: sin membresía activa con
 * is_admin = true, el inventario de la institución no existe para el caller (RN-004, A2;
 * la regla de seguridad del proyecto responde 404, no 403).
 */
export interface MembresiaInstitucional {
  id: string;
  esAdmin: boolean;
}

/** Criterios de filtro/orden del listado (CU-25 A5/A6). El orden es por whitelist, nunca SQL crudo. */
export interface FiltroInventario {
  productoId?: string | undefined;
  orden?: OrdenInventario | undefined;
  direccion?: 'asc' | 'desc' | undefined;
}

export type OrdenInventario =
  | 'cantidad_adquirida'
  | 'cantidad_asignada'
  | 'cantidad_disponible'
  | 'ultima_compra'
  | 'nombre';

/** Una fila de la grilla de CU-25 p6/p7. `cantidadDisponible` = adquirida − asignada (RN-002). */
export interface ItemInventario {
  productoId: string;
  nombreProducto: string;
  descripcionProducto: string | null;
  cantidadAdquirida: number;
  cantidadAsignada: number;
  cantidadDisponible: number;
  ultimaCompraEn: Date | null;
  /** Suma de (precio_unitario × cantidad) de las órdenes pagas; null si nunca se compró (p6: opcional). */
  totalGastado: number | null;
}

/** El resumen superior de CU-25 p8. */
export interface ResumenInventario {
  totalAdquiridas: number;
  docentesConAsignaciones: number;
  totalEnUso: number;
  totalDisponibles: number;
}

/** Una compra del historial de CU-25 RN-007 (órdenes b2b pagas de la institución). */
export interface CompraHistorial {
  ordenId: string;
  numero: string;
  fecha: Date;
  cantidad: number;
  monto: number;
}

/** Un docente con el juego asignado, en el detalle de CU-25 A7. */
export interface DocenteAsignado {
  docenteId: string;
  nombre: string;
  cantidad: number;
  asignadaEn: Date;
  estado: 'active' | 'revoked';
}

/** Detalle de producto con asignaciones (CU-25 A7). */
export interface DetalleProductoInstitucional {
  productoId: string;
  nombreProducto: string;
  descripcionProducto: string | null;
  precio: number;
  cantidadAdquirida: number;
  cantidadAsignada: number;
  cantidadDisponible: number;
  compras: CompraHistorial[];
  docentes: DocenteAsignado[];
}

export interface InventarioRepository {
  /** Membresía activa del usuario en la institución, o null si no es miembro. */
  buscarMembresiaActiva(
    institucionId: string,
    usuarioId: string,
  ): Promise<MembresiaInstitucional | null>;
  /** Grilla del inventario con filtro y orden (CU-25 p5–p7, A5, A6). */
  listar(institucionId: string, filtro: FiltroInventario): Promise<ItemInventario[]>;
  /** Resumen superior (CU-25 p8). */
  resumen(institucionId: string): Promise<ResumenInventario>;
  /** Detalle de UN producto del inventario (CU-25 A7); null si no está en el inventario. */
  detalle(institucionId: string, productoId: string): Promise<DetalleProductoInstitucional | null>;
}

export const INVENTARIO_REPOSITORY = Symbol('InventarioRepository');
