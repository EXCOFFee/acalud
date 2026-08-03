/** Un evento de la cronología de envío, ya resuelto para mostrar (CU-13 §4). */
export interface EventoSeguimiento {
  estado: string;
  ubicacion: string | null;
  descripcion: string;
  fecha: string | null; // ISO 8601
}

/**
 * Resultado de CU-13. `fechaEstimadaEntrega`/`direccionEntrega` sólo vienen cuando la respuesta
 * es fresca (consultada al proveedor recién): no se persisten, así que una respuesta servida
 * desde caché (RN-003 vigente o RNF-007 fallback) los devuelve en `null` (A6-style: se sigue
 * mostrando el estado y la cronología, sólo faltan esos dos datos de paso).
 */
export interface SeguimientoPedido {
  estadoActual: string;
  eventos: EventoSeguimiento[];
  fechaEstimadaEntrega: string | null;
  direccionEntrega: string | null;
  ultimaActualizacion: string | null;
  desdeCache: boolean;
}
