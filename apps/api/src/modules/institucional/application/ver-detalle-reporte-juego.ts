import { ProductoNoEnInventario, SinPermisosDeEncargado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { FiltroReporte } from '../domain/ports/sesiones.repository';

export interface DetalleReporteJuegoDTO {
  producto_id: string;
  nombre_producto: string;
  total_sesiones: number;
  alumnos_alcanzados: number;
  satisfaccion_promedio: number;
  distribucion_satisfaccion: { estrellas: number; cantidad: number }[];
  sesiones: {
    fecha: string;
    docente_id: string;
    nombre_docente: string;
    grupo: string;
    estudiantes: number;
    duracion_minutos: number;
    satisfaccion: number;
  }[];
  nube_palabras: { palabra: string; frecuencia: number }[];
}

/** CU-31 A8 · Detalle de un juego dentro del reporte de uso institucional. */
export class VerDetalleReporteJuego {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(
    institucionId: string,
    usuarioId: string,
    productoId: string,
    filtro: FiltroReporte,
  ): Promise<DetalleReporteJuegoDTO> {
    return this.uow.transaccion(async (repos) => {
      const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
      if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();

      const detalle = await repos.sesiones.detalleJuego(institucionId, productoId, filtro);
      if (detalle === null) throw new ProductoNoEnInventario();

      return {
        producto_id: detalle.productoId,
        nombre_producto: detalle.nombreProducto,
        total_sesiones: detalle.totalSesiones,
        alumnos_alcanzados: detalle.alumnosAlcanzados,
        satisfaccion_promedio: detalle.satisfaccionPromedio,
        distribucion_satisfaccion: detalle.distribucionSatisfaccion,
        sesiones: detalle.sesiones.map((s) => ({
          fecha: s.fecha.toISOString(),
          docente_id: s.docenteId,
          nombre_docente: s.nombreDocente,
          grupo: s.grupo,
          estudiantes: s.estudiantes,
          duracion_minutos: s.duracionMinutos,
          satisfaccion: s.satisfaccion,
        })),
        nube_palabras: detalle.nubePalabras,
      };
    });
  }
}
