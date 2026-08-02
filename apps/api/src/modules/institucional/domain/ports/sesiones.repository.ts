import type { ComandoGuardarSesion } from '../sesion-juego';

/** CU-30 A12: Filtro para obtener historial de sesiones. */
export interface FiltroSesiones {
  productoId?: string;
  pagina?: number;
  limite?: number;
}

/** CU-30 A12: Vista del historial. */
export interface HistorialSesion {
  id: string;
  fecha: Date;
  grupo: string;
  estudiantes: number;
  duracionMinutos: number;
  satisfaccion: number;
  aprendizajes: string;
}

export interface ResultadoPaginado<T> {
  items: T[];
  totalItems: number;
  totalPaginas: number;
  paginaActual: number;
}

// ─── CU-31: Filtro y vistas de reportes de uso institucional ──────────────────

export interface FiltroReporte {
  desde?: Date | undefined;
  hasta?: Date | undefined;
  productoId?: string | undefined;
  docenteId?: string | undefined;
}

/** CU-31: Fila del reporte corte "por juego". */
export interface FilaReporteJuego {
  productoId: string;
  nombreProducto: string;
  totalSesiones: number;
  docentesDistintos: number;
  alumnosAlcanzados: number;
  minutosTotales: number;
  ultimaSesion: Date | null;
}

/** CU-31: Fila del reporte corte "por docente". */
export interface FilaReporteDocente {
  docenteId: string;
  nombreDocente: string;
  totalSesiones: number;
  juegosDistintos: number;
  alumnosAlcanzados: number;
  minutosTotales: number;
}

// ─── CU-33: Métricas del Dashboard Pedagógico ────────────────────────────────

export interface MetricasDashboard {
  sesiones: number;
  sesionesAnterior: number;
  docentesActivos: number;
  docentesActivosAnterior: number;
  alumnosAlcanzados: number;
  alumnosAlcanzadosAnterior: number;
  minutosDeJuego: number;
  minutosDeJuegoAnterior: number;
  serieSemanal: { semana: string; sesiones: number }[];
  topJuegos: { productoId: string; nombre: string; sesiones: number }[];
  topDocentes: { docenteId: string; nombre: string; sesiones: number }[];
}

/** CU-29, CU-30, CU-31, CU-32, CU-33: Puerto de escritura, lectura y agregación de sesiones. */
export interface SesionesRepository {
  /**
   * CU-29: Aplica un comando de transición de estado e inserta la sesión.
   * Retorna el UUID de la sesión creada.
   */
  ejecutarComando(comando: ComandoGuardarSesion): Promise<string>;
  
  /**
   * CU-30: Lista las sesiones de un docente, opcionalmente filtradas por juego.
   */
  listar(docenteId: string, filtro: FiltroSesiones): Promise<ResultadoPaginado<HistorialSesion>>;

  /** CU-31: Reporte agrupado por juego. Directiva IA: GROUP BY en SQL, sin precálculo. */
  reportePorJuego(institucionId: string, filtro: FiltroReporte): Promise<FilaReporteJuego[]>;

  /** CU-31: Reporte agrupado por docente. */
  reportePorDocente(institucionId: string, filtro: FiltroReporte): Promise<FilaReporteDocente[]>;

  /** CU-32: Conteo de filas para validar PI-04 (tope de 5000). */
  contarFilasReporte(institucionId: string, corte: 'juego' | 'docente', filtro: FiltroReporte): Promise<number>;

  /** CU-33: Métricas del dashboard pedagógico con variaciones vs. periodo anterior. */
  metricasDashboard(institucionId: string, desde: Date, hasta: Date): Promise<MetricasDashboard>;
}
