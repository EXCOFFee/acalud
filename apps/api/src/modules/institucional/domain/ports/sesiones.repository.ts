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
  /** CU-33: % de sesiones con `would_reuse = true` (0-100). */
  tasaReutilizacion: number;
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
  /** CU-33: % de sesiones con `would_reuse = true` (0-100). */
  tasaReutilizacion: number;
}

/** CU-31 RN-005 / CU-33: evolución mensual de sesiones (respeta los mismos filtros que el reporte). */
export interface FilaSerieTemporal {
  periodo: string; // 'YYYY-MM'
  sesiones: number;
  /** CU-33: satisfacción promedio de las sesiones de ese mes. */
  satisfaccionPromedio: number;
}

/** CU-33: cantidad de sesiones por día de la semana (1 = lunes … 7 = domingo, ISO). */
export interface FilaDistribucionDiaSemana {
  diaSemana: 1 | 2 | 3 | 4 | 5 | 6 | 7;
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

// ─── CU-31 A8/A9: Detalle de un juego/docente dentro del reporte ──────────────

export interface ItemDistribucionSatisfaccion {
  estrellas: 1 | 2 | 3 | 4 | 5;
  cantidad: number;
}

export interface ItemDistribucionJuego {
  productoId: string;
  nombreProducto: string;
  sesiones: number;
}

/** CU-31 A8: sesión de un juego, vista desde el detalle (identifica al docente). */
export interface SesionDelJuego {
  fecha: Date;
  docenteId: string;
  nombreDocente: string;
  grupo: string;
  estudiantes: number;
  duracionMinutos: number;
  satisfaccion: number;
}

/** CU-31 A9: sesión de un docente, vista desde el detalle (identifica el juego). */
export interface SesionDelDocente {
  fecha: Date;
  productoId: string;
  nombreProducto: string;
  grupo: string;
  estudiantes: number;
  duracionMinutos: number;
  satisfaccion: number;
}

/** CU-31 A8: detalle de un juego dentro del reporte (respeta los filtros de fecha/docente). */
export interface DetalleReporteJuego {
  productoId: string;
  nombreProducto: string;
  totalSesiones: number;
  alumnosAlcanzados: number;
  satisfaccionPromedio: number;
  distribucionSatisfaccion: ItemDistribucionSatisfaccion[];
  sesiones: SesionDelJuego[];
  nubePalabras: PalabraFrecuente[];
}

/** CU-31 A9: detalle de un docente dentro del reporte (respeta los filtros de fecha/juego). */
export interface DetalleReporteDocente {
  docenteId: string;
  nombreDocente: string;
  email: string;
  totalSesiones: number;
  alumnosAlcanzados: number;
  distribucionJuegos: ItemDistribucionJuego[];
  sesiones: SesionDelDocente[];
}

/** CU-32 paso 10.2: fila completa de la hoja "Sesiones" del Excel (y de la lista del PDF). */
export interface SesionReporteCompleta {
  fecha: Date;
  nombreProducto: string;
  nombreDocente: string;
  grupo: string;
  estudiantes: number;
  duracionMinutos: number;
  satisfaccion: number;
  aprendizajes: string;
}

// ─── CU-33: Métricas del Dashboard Pedagógico ────────────────────────────────

/** CU-33: filtro adicional de juego/docente para el dashboard (aplica a ambos períodos). */
export interface FiltroDashboard {
  productoId?: string | undefined;
  docenteId?: string | undefined;
}

export interface MetricasDashboard {
  sesiones: number;
  sesionesAnterior: number;
  docentesActivos: number;
  docentesActivosAnterior: number;
  alumnosAlcanzados: number;
  alumnosAlcanzadosAnterior: number;
  minutosDeJuego: number;
  minutosDeJuegoAnterior: number;
  satisfaccionPromedio: number;
  satisfaccionPromedioAnterior: number;
  /** CU-33: % de sesiones con `would_reuse = true` (0-100). */
  tasaReutilizacion: number;
  tasaReutilizacionAnterior: number;
  serieSemanal: { semana: string; sesiones: number }[];
  /** CU-33: evolución mensual de sesiones + satisfacción. */
  serieMensual: FilaSerieTemporal[];
  distribucionSatisfaccion: ItemDistribucionSatisfaccion[];
  distribucionDiaSemana: FilaDistribucionDiaSemana[];
  /** CU-33: top 5 por sesiones — reusa la misma agregación de CU-31 (`reportePorJuego`). */
  topJuegos: FilaReporteJuego[];
  topDocentes: FilaReporteDocente[];
  nubePalabras: PalabraFrecuente[];
  dificultadesFrecuentes: PalabraFrecuente[];
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

  /** CU-31 A8: detalle de un juego. null si no hay sesiones de ese producto en la institución. */
  detalleJuego(institucionId: string, productoId: string, filtro: FiltroReporte): Promise<DetalleReporteJuego | null>;

  /** CU-31 A9: detalle de un docente. null si no hay sesiones de ese docente en la institución. */
  detalleDocente(
    institucionId: string,
    docenteId: string,
    filtro: FiltroReporte,
  ): Promise<DetalleReporteDocente | null>;

  /** CU-32 paso 10.2: listado completo de sesiones individuales, mismo filtro que el reporte. */
  listarSesionesReporte(institucionId: string, filtro: FiltroReporte): Promise<SesionReporteCompleta[]>;

  /** CU-32 PI-04: conteo de sesiones individuales para validar el tope (5000) antes de exportar. */
  contarSesionesReporte(institucionId: string, filtro: FiltroReporte): Promise<number>;

  /** CU-33 RN-006: top de términos más frecuentes en `difficulties` (columna opcional), mismo filtro. */
  dificultadesFrecuentes(institucionId: string, filtro: FiltroReporte, limite: number): Promise<PalabraFrecuente[]>;

  /** CU-33: distribución de sesiones por día de la semana (1=lunes…7=domingo), mismo filtro. */
  distribucionPorDiaSemana(institucionId: string, filtro: FiltroReporte): Promise<FilaDistribucionDiaSemana[]>;

  /**
   * CU-33: Métricas del dashboard pedagógico con variaciones vs. periodo anterior. `filtro`
   * (juego/docente) se aplica tanto al período actual como al anterior.
   */
  metricasDashboard(
    institucionId: string,
    desde: Date,
    hasta: Date,
    filtro: FiltroDashboard,
  ): Promise<MetricasDashboard>;
}
