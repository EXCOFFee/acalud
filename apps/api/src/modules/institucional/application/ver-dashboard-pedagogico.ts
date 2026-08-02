import { SinPermisosDeEncargado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { MetricasDashboard } from '../domain/ports/sesiones.repository';

// ─── Tipos de respuesta HTTP (snake_case) ─────────────────────────────────────

export interface KPI {
  valor: number;
  variacion_porcentual: number | null;
}

export interface DashboardPedagogico {
  institucion_id: string;
  rango: { desde: string; hasta: string };
  kpis: {
    sesiones: KPI;
    docentes_activos: KPI;
    alumnos_alcanzados: KPI;
    minutos_de_juego: KPI;
  };
  serie_semanal: { semana: string; sesiones: number }[];
  top_juegos: { producto_id: string; nombre: string; sesiones: number }[];
  top_docentes: { docente_id: string; nombre: string; sesiones: number }[];
}

/**
 * CU-33 · Ver dashboard de métricas pedagógicas.
 *
 * PRE: membresía activa rol `encargado`.
 * POST: lectura pura, sin side effects.
 * Directiva IA: consultas en vivo (sin precálculo, misma que CU-31).
 */
export class VerDashboardPedagogico {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(
    institucionId: string,
    usuarioId: string,
    desde: Date,
    hasta: Date,
  ): Promise<DashboardPedagogico> {
    return this.uow.transaccion(async (repos) => {
      const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
      if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();

      const metricas = await repos.sesiones.metricasDashboard(institucionId, desde, hasta);

      return mapear(institucionId, desde, hasta, metricas);
    });
  }
}

function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual > 0 ? 100 : null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

function mapear(
  institucionId: string,
  desde: Date,
  hasta: Date,
  m: MetricasDashboard,
): DashboardPedagogico {
  return {
    institucion_id: institucionId,
    rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
    kpis: {
      sesiones: { valor: m.sesiones, variacion_porcentual: variacion(m.sesiones, m.sesionesAnterior) },
      docentes_activos: {
        valor: m.docentesActivos,
        variacion_porcentual: variacion(m.docentesActivos, m.docentesActivosAnterior),
      },
      alumnos_alcanzados: {
        valor: m.alumnosAlcanzados,
        variacion_porcentual: variacion(m.alumnosAlcanzados, m.alumnosAlcanzadosAnterior),
      },
      minutos_de_juego: {
        valor: m.minutosDeJuego,
        variacion_porcentual: variacion(m.minutosDeJuego, m.minutosDeJuegoAnterior),
      },
    },
    serie_semanal: m.serieSemanal,
    top_juegos: m.topJuegos.map((j) => ({
      producto_id: j.productoId,
      nombre: j.nombre,
      sesiones: j.sesiones,
    })),
    top_docentes: m.topDocentes.map((d) => ({
      docente_id: d.docenteId,
      nombre: d.nombre,
      sesiones: d.sesiones,
    })),
  };
}
