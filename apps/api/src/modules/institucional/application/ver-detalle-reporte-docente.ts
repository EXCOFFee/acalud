import { DocenteNoEncontrado, SinPermisosDeEncargado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { FiltroReporte } from '../domain/ports/sesiones.repository';

export interface DetalleReporteDocenteDTO {
  docente_id: string;
  nombre_docente: string;
  email: string;
  total_sesiones: number;
  alumnos_alcanzados: number;
  distribucion_juegos: { producto_id: string; nombre_producto: string; sesiones: number }[];
  sesiones: {
    fecha: string;
    producto_id: string;
    nombre_producto: string;
    grupo: string;
    estudiantes: number;
    duracion_minutos: number;
    satisfaccion: number;
  }[];
}

/** CU-31 A9 · Detalle de un docente dentro del reporte de uso institucional. */
export class VerDetalleReporteDocente {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(
    institucionId: string,
    usuarioId: string,
    docenteId: string,
    filtro: FiltroReporte,
  ): Promise<DetalleReporteDocenteDTO> {
    return this.uow.transaccion(async (repos) => {
      const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
      if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();

      const detalle = await repos.sesiones.detalleDocente(institucionId, docenteId, filtro);
      if (detalle === null) throw new DocenteNoEncontrado();

      return {
        docente_id: detalle.docenteId,
        nombre_docente: detalle.nombreDocente,
        email: detalle.email,
        total_sesiones: detalle.totalSesiones,
        alumnos_alcanzados: detalle.alumnosAlcanzados,
        distribucion_juegos: detalle.distribucionJuegos.map((j) => ({
          producto_id: j.productoId,
          nombre_producto: j.nombreProducto,
          sesiones: j.sesiones,
        })),
        sesiones: detalle.sesiones.map((s) => ({
          fecha: s.fecha.toISOString(),
          producto_id: s.productoId,
          nombre_producto: s.nombreProducto,
          grupo: s.grupo,
          estudiantes: s.estudiantes,
          duracion_minutos: s.duracionMinutos,
          satisfaccion: s.satisfaccion,
        })),
      };
    });
  }
}
