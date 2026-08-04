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
  productoId: string;
  nombreProducto: string;
  grupo: string;
  estudiantes: number;
  duracionMinutos: number;
  satisfaccion: number;
  aprendizajes: string;
}

/** CU-30 A9: detalle completo de una sesión (incluye lo que el listado no trae). */
export interface DetalleSesion extends HistorialSesion {
  dificultades: string | null;
  reutilizaria: boolean;
  registradaEn: Date;
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
  satisfaccionPromedio: number;
}

/** CU-31: Fila del reporte corte "por docente". */
export interface FilaReporteDocente {
  docenteId: string;
  nombreDocente: string;
  totalSesiones: number;
  juegosDistintos: number;
  alumnosAlcanzados: number;
  minutosTotales: number;
  satisfaccionPromedio: number;
}

/** CU-31 RN-005: evolución mensual de sesiones (respeta los mismos filtros que el reporte). */
export interface FilaSerieTemporal {
  periodo: string; // 'YYYY-MM'
  sesiones: number;
}

/** CU-31 RN-006: término + cuántas veces aparece en los `key_learnings` filtrados. */
export interface PalabraFrecuente {
  palabra: string;
  frecuencia: number;
}

/** CU-31 RN-004: KPIs agregados del reporte (mismos filtros que el corte por juego/docente). */
export interface KpisReporte {
  totalSesiones: number;
  alumnosAlcanzados: number;
  satisfaccionPromedio: number;
  juegosEnUso: number;
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

  /** CU-30 A9: detalle completo de una sesión propia. null si no existe o es de otro docente. */
  detalle(usuarioId: string, sesionId: string): Promise<DetalleSesion | null>;

  /** CU-31: Reporte agrupado por juego. Directiva IA: GROUP BY en SQL, sin precálculo. */
  reportePorJuego(institucionId: string, filtro: FiltroReporte): Promise<FilaReporteJuego[]>;

  /** CU-31: Reporte agrupado por docente. */
  reportePorDocente(institucionId: string, filtro: FiltroReporte): Promise<FilaReporteDocente[]>;

  /** CU-31 RN-005: evolución mensual de sesiones, mismo filtro que el reporte. */
  serieTemporalReporte(institucionId: string, filtro: FiltroReporte): Promise<FilaSerieTemporal[]>;

  /** CU-31 RN-006: top de términos más frecuentes en `key_learnings`, mismo filtro. */
  nubeDePalabras(institucionId: string, filtro: FiltroReporte, limite: number): Promise<PalabraFrecuente[]>;

  /** CU-31 RN-004: KPIs agregados del reporte, mismo filtro que el corte por juego/docente. */
  kpisReporte(institucionId: string, filtro: FiltroReporte): Promise<KpisReporte>;

  /** CU-32: Conteo de filas para validar PI-04 (tope de 5000). */
  contarFilasReporte(institucionId: string, corte: 'juego' | 'docente', filtro: FiltroReporte): Promise<number>;

  /** CU-33: Métricas del dashboard pedagógico con variaciones vs. periodo anterior. */
  metricasDashboard(institucionId: string, desde: Date, hasta: Date): Promise<MetricasDashboard>;
}
