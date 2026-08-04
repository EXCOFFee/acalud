import { SinPermisosDeEncargado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { FiltroDashboard, MetricasDashboard } from '../domain/ports/sesiones.repository';
import { type FilaReporteDocenteDTO, type FilaReporteJuegoDTO, mapearFilaDocente, mapearFilaJuego } from './ver-reporte-institucional';

// ─── Tipos de respuesta HTTP (snake_case) ─────────────────────────────────────

export interface KPI {
  valor: number;
  variacion_porcentual: number | null;
}

export interface DashboardPedagogico {
  institucion_id: string;
  rango: { desde: string; hasta: string };
  filtros: { producto_id?: string; docente_id?: string };
  kpis: {
    sesiones: KPI;
    docentes_activos: KPI;
    alumnos_alcanzados: KPI;
    minutos_de_juego: KPI;
    satisfaccion_promedio: KPI;
    tasa_reutilizacion: KPI;
  };
  serie_semanal: { semana: string; sesiones: number }[];
  serie_mensual: { periodo: string; sesiones: number; satisfaccion_promedio: number }[];
  distribucion_satisfaccion: { estrellas: number; cantidad: number }[];
  distribucion_dia_semana: { dia_semana: number; sesiones: number }[];
  top_juegos: FilaReporteJuegoDTO[];
  top_docentes: FilaReporteDocenteDTO[];
  nube_palabras: { palabra: string; frecuencia: number }[];
  dificultades_frecuentes: { palabra: string; frecuencia: number }[];
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
    filtro: FiltroDashboard,
  ): Promise<DashboardPedagogico> {
    return this.uow.transaccion(async (repos) => {
      const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
      if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();

      const metricas = await repos.sesiones.metricasDashboard(institucionId, desde, hasta, filtro);

      return mapear(institucionId, desde, hasta, filtro, metricas);
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
  filtro: FiltroDashboard,
  m: MetricasDashboard,
): DashboardPedagogico {
  return {
    institucion_id: institucionId,
    rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
    filtros: {
      ...(filtro.productoId !== undefined && { producto_id: filtro.productoId }),
      ...(filtro.docenteId !== undefined && { docente_id: filtro.docenteId }),
    },
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
      satisfaccion_promedio: {
        valor: m.satisfaccionPromedio,
        variacion_porcentual: variacion(m.satisfaccionPromedio, m.satisfaccionPromedioAnterior),
      },
      tasa_reutilizacion: {
        valor: m.tasaReutilizacion,
        variacion_porcentual: variacion(m.tasaReutilizacion, m.tasaReutilizacionAnterior),
      },
    },
    serie_semanal: m.serieSemanal,
    serie_mensual: m.serieMensual.map((s) => ({
      periodo: s.periodo,
      sesiones: s.sesiones,
      satisfaccion_promedio: s.satisfaccionPromedio,
    })),
    distribucion_satisfaccion: m.distribucionSatisfaccion,
    distribucion_dia_semana: m.distribucionDiaSemana.map((d) => ({
      dia_semana: d.diaSemana,
      sesiones: d.sesiones,
    })),
    top_juegos: m.topJuegos.map(mapearFilaJuego),
    top_docentes: m.topDocentes.map(mapearFilaDocente),
    nube_palabras: m.nubePalabras,
    dificultades_frecuentes: m.dificultadesFrecuentes,
  };
}
