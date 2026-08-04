import { SinPermisosDeEncargado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type {
  FilaReporteDocente,
  FilaReporteJuego,
  FiltroReporte,
  KpisReporte,
  PalabraFrecuente,
} from '../domain/ports/sesiones.repository';

/** CU-31 RN-006: cantidad de términos que se devuelven en la nube de palabras. */
const LIMITE_NUBE_PALABRAS = 30;

// ─── Tipos de respuesta HTTP (snake_case para la API) ─────────────────────────

export interface ReporteInstitucional {
  institucion_id: string;
  corte: 'juego' | 'docente';
  filtros: { desde?: string; hasta?: string; producto_id?: string; docente_id?: string };
  datos: FilaReporteJuegoDTO[] | FilaReporteDocenteDTO[];
  kpis: KpisReporteDTO;
  serie_temporal: { periodo: string; sesiones: number }[];
  nube_palabras: PalabraFrecuente[];
}

export interface KpisReporteDTO {
  total_sesiones: number;
  alumnos_alcanzados: number;
  satisfaccion_promedio: number;
  juegos_en_uso: number;
}

export interface FilaReporteJuegoDTO {
  producto_id: string;
  nombre_producto: string;
  total_sesiones: number;
  docentes_distintos: number;
  alumnos_alcanzados: number;
  minutos_totales: number;
  ultima_sesion: string | null;
  satisfaccion_promedio: number;
}

export interface FilaReporteDocenteDTO {
  docente_id: string;
  nombre_docente: string;
  total_sesiones: number;
  juegos_distintos: number;
  alumnos_alcanzados: number;
  minutos_totales: number;
  satisfaccion_promedio: number;
}

/**
 * CU-31 · Ver reporte de uso institucional (por juego/docente).
 *
 * PRE: membresía activa rol `encargado` (is_admin = true).
 * Directiva IA: agregaciones por GROUP BY, sin tablas de resumen precalculadas en v1.
 */
export class VerReporteInstitucional {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(
    institucionId: string,
    usuarioId: string,
    corte: 'juego' | 'docente',
    filtro: FiltroReporte,
  ): Promise<ReporteInstitucional> {
    return this.uow.transaccion(async (repos) => {
      // CU-31 PRE: solo encargado
      const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
      if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();

      const filtrosDTO: ReporteInstitucional['filtros'] = {
        ...(filtro.desde !== undefined && { desde: filtro.desde.toISOString() }),
        ...(filtro.hasta !== undefined && { hasta: filtro.hasta.toISOString() }),
        ...(filtro.productoId !== undefined && { producto_id: filtro.productoId }),
        ...(filtro.docenteId !== undefined && { docente_id: filtro.docenteId }),
      };

      const [datosPorCorte, kpis, serieTemporal, nubePalabras] = await Promise.all([
        corte === 'juego'
          ? repos.sesiones.reportePorJuego(institucionId, filtro).then((filas) => filas.map(mapearFilaJuego))
          : repos.sesiones.reportePorDocente(institucionId, filtro).then((filas) => filas.map(mapearFilaDocente)),
        repos.sesiones.kpisReporte(institucionId, filtro),
        repos.sesiones.serieTemporalReporte(institucionId, filtro),
        repos.sesiones.nubeDePalabras(institucionId, filtro, LIMITE_NUBE_PALABRAS),
      ]);

      return {
        institucion_id: institucionId,
        corte,
        filtros: filtrosDTO,
        datos: datosPorCorte,
        kpis: mapearKpis(kpis),
        serie_temporal: serieTemporal,
        nube_palabras: nubePalabras,
      };
    });
  }
}

function mapearFilaJuego(f: FilaReporteJuego): FilaReporteJuegoDTO {
  return {
    producto_id: f.productoId,
    nombre_producto: f.nombreProducto,
    total_sesiones: f.totalSesiones,
    docentes_distintos: f.docentesDistintos,
    alumnos_alcanzados: f.alumnosAlcanzados,
    minutos_totales: f.minutosTotales,
    ultima_sesion: f.ultimaSesion?.toISOString() ?? null,
    satisfaccion_promedio: f.satisfaccionPromedio,
  };
}

function mapearFilaDocente(f: FilaReporteDocente): FilaReporteDocenteDTO {
  return {
    docente_id: f.docenteId,
    nombre_docente: f.nombreDocente,
    total_sesiones: f.totalSesiones,
    juegos_distintos: f.juegosDistintos,
    alumnos_alcanzados: f.alumnosAlcanzados,
    minutos_totales: f.minutosTotales,
    satisfaccion_promedio: f.satisfaccionPromedio,
  };
}

function mapearKpis(k: KpisReporte): KpisReporteDTO {
  return {
    total_sesiones: k.totalSesiones,
    alumnos_alcanzados: k.alumnosAlcanzados,
    satisfaccion_promedio: k.satisfaccionPromedio,
    juegos_en_uso: k.juegosEnUso,
  };
}
