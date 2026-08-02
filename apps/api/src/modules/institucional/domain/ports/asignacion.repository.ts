/**
 * Puerto de asignación de licencias institucionales (CU-26).
 *
 * La asignación apunta a la MEMBRESÍA (`institutional_teachers`), no al usuario: es lo que
 * modela el esquema y lo que permite conservar el historial cuando el docente se desvincula
 * (CU-28 RN-007/RN-008). La API habla de docentes, así que la traducción usuario → membresía
 * ocurre acá, en el borde de persistencia.
 */

/** Estado del producto dentro del inventario institucional, para validar RN-005. */
export interface ProductoEnInventario {
  nombreProducto: string;
  /** adquiridas − asignadas (CU-25 RN-002). */
  disponibles: number;
}

/** Docente vinculado y activo, destinatario de una asignación (CU-26 A3 / RN-010). */
export interface DocenteDestino {
  membresiaId: string;
  usuarioId: string;
  nombre: string;
  email: string;
}

export interface NuevaAsignacion {
  institucionId: string;
  membresiaDocenteId: string;
  productoId: string;
  cantidad: number;
  /** Membresía del encargado que asigna (`assigned_by` es FK a membresía, no a users). */
  asignadaPorMembresiaId: string;
  /** CU-26 p8: observaciones opcionales. */
  observaciones: string | null;
}

export interface AsignacionRepository {
  /** El producto dentro del inventario de la institución; null si no está (CU-26 p14). */
  buscarEnInventario(
    institucionId: string,
    productoId: string,
  ): Promise<ProductoEnInventario | null>;
  /**
   * Igual que `buscarEnInventario` pero con SELECT ... FOR UPDATE: la fila del inventario es
   * el mutex por (institución, producto) que serializa revocaciones entre sí y contra las
   * asignaciones de CU-26 (que la actualizan con `incrementarAsignado`).
   */
  bloquearInventario(
    institucionId: string,
    productoId: string,
  ): Promise<ProductoEnInventario | null>;
  /** Membresía ACTIVA del usuario en la institución; null si no está vinculado (A3). */
  buscarDocenteDestino(institucionId: string, usuarioId: string): Promise<DocenteDestino | null>;
  crear(datos: NuevaAsignacion): Promise<string>;
  /**
   * CU-26 RN-007: incrementa `quantity_assigned` con el guard de disponibilidad en el WHERE.
   * Devuelve false si el stock ya no alcanza —la comprobación previa y este UPDATE pueden
   * cruzarse con otra asignación concurrente— y es ahí donde RN-005 se decide de verdad.
   */
  incrementarAsignado(
    institucionId: string,
    productoId: string,
    cantidad: number,
  ): Promise<boolean>;
  /**
   * CU-27 p14: asignaciones ACTIVAS del docente para el producto, de la más antigua a la más
   * nueva (el consumo es FIFO). CU-26 crea una fila por asignación (RN-003), así que la
   * "cantidad asignada actual" del CU es la SUMA de estas filas.
   */
  listarActivas(
    institucionId: string,
    membresiaDocenteId: string,
    productoId: string,
  ): Promise<AsignacionActiva[]>;
  /**
   * CU-27 p17/p18: aplica la revocación sobre UNA fila. `nuevaCantidad` > 0 la reduce (A9,
   * revocación parcial); = 0 la marca `revoked` con fecha, autor y razón (A10). Nunca borra:
   * CU-28 RN-007/RN-008 exigen el historial.
   */
  aplicarRevocacion(revocacion: {
    asignacionId: string;
    nuevaCantidad: number;
    revocadaPorMembresiaId: string;
    razon: string | null;
  }): Promise<void>;
  /** CU-27 RN-004: descuenta la cantidad revocada del contador del inventario. */
  descontarAsignado(institucionId: string, productoId: string, cantidad: number): Promise<void>;
}

/** Fila activa de `institutional_assignments` para el consumo FIFO de CU-27. */
export interface AsignacionActiva {
  id: string;
  cantidad: number;
}

/** Notificación por dashboard (CU-26 RN-008; el email va por el outbox). */
export interface NotificacionesInstitucional {
  crear(notificacion: {
    destinatarioId: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    entidadTipo: string;
    entidadId: string;
  }): Promise<void>;
}

/** Cola de emails del BC (CU-26 RN-008 / A9: el envío no puede bloquear la asignación). */
export interface OutboxInstitucional {
  encolar(email: {
    tipo: string;
    destinatario: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
