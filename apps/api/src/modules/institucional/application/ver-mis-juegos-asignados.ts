import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';

export interface MisJuegosAsignados {
  juegos: {
    producto_id: string;
    nombre_producto: string;
    cantidad: number;
    asignada_en: string;
    total_sesiones: number;
    ultima_sesion_en: string | null;
  }[];
}

/**
 * CU-29 paso 2 / CU-30: juegos que el docente autenticado tiene asignados, con su propio
 * conteo de sesiones cargadas — punto de partida del formulario de "Cargar sesión" (elige
 * de qué juego) y de "Mis sesiones" (elige por cuál filtrar). Lista vacía si no está
 * vinculado a ninguna institución o no tiene asignaciones activas (CU-29 A1, no es un error).
 */
export class VerMisJuegosAsignados {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(usuarioId: string): Promise<MisJuegosAsignados> {
    return this.uow.transaccion(async (repos) => {
      const juegos = await repos.docentes.misAsignaciones(usuarioId);
      return {
        juegos: juegos.map((j) => ({
          producto_id: j.productoId,
          nombre_producto: j.nombreProducto,
          cantidad: j.cantidad,
          asignada_en: j.asignadaEn.toISOString(),
          total_sesiones: j.totalSesiones,
          ultima_sesion_en: j.ultimaSesionEn?.toISOString() ?? null,
        })),
      };
    });
  }
}
