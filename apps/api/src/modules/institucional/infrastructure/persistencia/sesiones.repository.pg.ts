import type { PoolClient } from 'pg';
import { tokenizarAprendizajes } from '../../domain/nube-de-palabras';
import type { ComandoGuardarSesion } from '../../domain/sesion-juego';
import type {
  DetalleReporteDocente,
  DetalleReporteJuego,
  DetalleSesion,
  FilaReporteDocente,
  FilaReporteJuego,
  FilaSerieTemporal,
  FiltroReporte,
  FiltroSesiones,
  HistorialSesion,
  ItemDistribucionJuego,
  ItemDistribucionSatisfaccion,
  KpisReporte,
  MetricasDashboard,
  PalabraFrecuente,
  ResultadoPaginado,
  SesionDelDocente,
  SesionDelJuego,
  SesionesRepository,
  SesionReporteCompleta,
} from '../../domain/ports/sesiones.repository';

/** CU-31 RN-006: cantidad de términos que se devuelven en la nube de palabras de un detalle. */
const LIMITE_NUBE_PALABRAS_DETALLE = 30;

export class SesionesRepositoryPg implements SesionesRepository {
  constructor(private readonly client: PoolClient) {}

  async ejecutarComando(comando: ComandoGuardarSesion): Promise<string> {
    if (comando.tipo === 'insert') {
      const { docenteId, productoId, fecha, grupo, estudiantes, duracion, satisfaccion, aprendizajes, dificultades, reutilizaria } = comando.datos;
      
      const res = await this.client.query<{ id: string }>(
        `INSERT INTO game_sessions (
          institutional_teacher_id, product_id, session_date, group_name, student_count, 
          duration_minutes, teacher_satisfaction, key_learnings, difficulties, would_reuse, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now()
        ) RETURNING id`,
        [docenteId, productoId, fecha, grupo, estudiantes, duracion, satisfaccion, aprendizajes, dificultades, reutilizaria]
      );
      
      return res.rows[0]!.id;
    }
    throw new Error(`Comando no soportado: ${comando.tipo}`);
  }

  async listar(usuarioId: string, filtro: FiltroSesiones): Promise<ResultadoPaginado<HistorialSesion>> {
    const page = filtro.pagina && filtro.pagina > 0 ? filtro.pagina : 1;
    const limit = filtro.limite && filtro.limite > 0 ? filtro.limite : 20;
    const offset = (page - 1) * limit;

    const values: unknown[] = [usuarioId];
    let where = 'WHERE it.user_id = $1';

    if (filtro.productoId) {
      values.push(filtro.productoId);
      where += ` AND gs.product_id = $${values.length}`;
    }

    const countQuery = `
      SELECT COUNT(*)::int as total 
      FROM game_sessions gs
      JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
      ${where}
    `;
    const countResult = await this.client.query<{ total: number }>(countQuery, values);
    const totalItems = countResult.rows[0]?.total ?? 0;
    const totalPaginas = Math.ceil(totalItems / limit);

    const dataQuery = `
      SELECT gs.id, gs.session_date, gs.product_id, p.name AS product_name, gs.group_name,
             gs.student_count, gs.duration_minutes, gs.teacher_satisfaction, gs.key_learnings
      FROM game_sessions gs
      JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
      JOIN products p ON p.id = gs.product_id
      ${where}
      ORDER BY gs.session_date DESC, gs.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const dataValues = [...values, limit, offset];
    const dataResult = await this.client.query<{
      id: string;
      session_date: Date;
      product_id: string;
      product_name: string;
      group_name: string;
      student_count: number;
      duration_minutes: number;
      teacher_satisfaction: number;
      key_learnings: string;
    }>(dataQuery, dataValues);

    const items: HistorialSesion[] = dataResult.rows.map(row => ({
      id: row.id,
      fecha: row.session_date,
      productoId: row.product_id,
      nombreProducto: row.product_name,
      grupo: row.group_name,
      estudiantes: row.student_count,
      duracionMinutos: row.duration_minutes,
      satisfaccion: row.teacher_satisfaction,
      aprendizajes: row.key_learnings
    }));

    return {
      items,
      totalItems,
      totalPaginas,
      paginaActual: page,
    };
  }

  /** CU-30 A9: detalle completo de una sesión propia. */
  async detalle(usuarioId: string, sesionId: string): Promise<DetalleSesion | null> {
    const r = await this.client.query<{
      id: string;
      session_date: Date;
      product_id: string;
      product_name: string;
      group_name: string;
      student_count: number;
      duration_minutes: number;
      teacher_satisfaction: number;
      key_learnings: string;
      difficulties: string | null;
      would_reuse: boolean;
      created_at: Date;
    }>(
      `SELECT gs.id, gs.session_date, gs.product_id, p.name AS product_name, gs.group_name,
              gs.student_count, gs.duration_minutes, gs.teacher_satisfaction, gs.key_learnings,
              gs.difficulties, gs.would_reuse, gs.created_at
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
         JOIN products p ON p.id = gs.product_id
        WHERE it.user_id = $1 AND gs.id = $2`,
      [usuarioId, sesionId],
    );
    const fila = r.rows[0];
    if (!fila) return null; // A9: sesión ajena o inexistente → 404

    return {
      id: fila.id,
      fecha: fila.session_date,
      productoId: fila.product_id,
      nombreProducto: fila.product_name,
      grupo: fila.group_name,
      estudiantes: fila.student_count,
      duracionMinutos: fila.duration_minutes,
      satisfaccion: fila.teacher_satisfaction,
      aprendizajes: fila.key_learnings,
      dificultades: fila.difficulties,
      reutilizaria: fila.would_reuse,
      registradaEn: fila.created_at,
    };
  }

  // ─── CU-31: Reportes de uso institucional ──────────────────────────────────

  /** CU-31 corte "por juego": Σ sesiones, docentes distintos, alumnos, minutos, última sesión. */
  async reportePorJuego(institucionId: string, filtro: FiltroReporte): Promise<FilaReporteJuego[]> {
    const { where, params } = this.construirFiltroReporte(institucionId, filtro);

    const r = await this.client.query<{
      product_id: string;
      name: string;
      total_sesiones: number;
      docentes_distintos: number;
      alumnos_alcanzados: number;
      minutos_totales: number;
      ultima_sesion: Date | null;
      satisfaccion_promedio: string;
    }>(
      `SELECT p.id AS product_id, p.name,
              COUNT(*)::int AS total_sesiones,
              COUNT(DISTINCT it.user_id)::int AS docentes_distintos,
              COALESCE(SUM(gs.student_count), 0)::int AS alumnos_alcanzados,
              COALESCE(SUM(gs.duration_minutes), 0)::int AS minutos_totales,
              MAX(gs.session_date) AS ultima_sesion,
              AVG(gs.teacher_satisfaction)::numeric(3,2) AS satisfaccion_promedio
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
         JOIN products p ON p.id = gs.product_id
        ${where}
        GROUP BY p.id, p.name
        ORDER BY total_sesiones DESC`,
      params,
    );

    return r.rows.map((f) => ({
      productoId: f.product_id,
      nombreProducto: f.name,
      totalSesiones: f.total_sesiones,
      docentesDistintos: f.docentes_distintos,
      alumnosAlcanzados: f.alumnos_alcanzados,
      minutosTotales: f.minutos_totales,
      ultimaSesion: f.ultima_sesion,
      satisfaccionPromedio: Number(f.satisfaccion_promedio),
    }));
  }

  /** CU-31 corte "por docente": Σ sesiones, juegos distintos, alumnos, minutos. */
  async reportePorDocente(institucionId: string, filtro: FiltroReporte): Promise<FilaReporteDocente[]> {
    const { where, params } = this.construirFiltroReporte(institucionId, filtro);

    const r = await this.client.query<{
      user_id: string;
      full_name: string;
      total_sesiones: number;
      juegos_distintos: number;
      alumnos_alcanzados: number;
      minutos_totales: number;
      satisfaccion_promedio: string;
    }>(
      `SELECT it.user_id, u.full_name,
              COUNT(*)::int AS total_sesiones,
              COUNT(DISTINCT gs.product_id)::int AS juegos_distintos,
              COALESCE(SUM(gs.student_count), 0)::int AS alumnos_alcanzados,
              COALESCE(SUM(gs.duration_minutes), 0)::int AS minutos_totales,
              AVG(gs.teacher_satisfaction)::numeric(3,2) AS satisfaccion_promedio
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
         JOIN users u ON u.id = it.user_id
        ${where}
        GROUP BY it.user_id, u.full_name
        ORDER BY total_sesiones DESC`,
      params,
    );

    return r.rows.map((f) => ({
      docenteId: f.user_id,
      nombreDocente: f.full_name,
      totalSesiones: f.total_sesiones,
      juegosDistintos: f.juegos_distintos,
      alumnosAlcanzados: f.alumnos_alcanzados,
      minutosTotales: f.minutos_totales,
      satisfaccionPromedio: Number(f.satisfaccion_promedio),
    }));
  }

  /** CU-31 RN-005: evolución mensual de sesiones, mismo filtro que el reporte. */
  async serieTemporalReporte(institucionId: string, filtro: FiltroReporte): Promise<FilaSerieTemporal[]> {
    const { where, params } = this.construirFiltroReporte(institucionId, filtro);

    const r = await this.client.query<{ periodo: string; sesiones: number }>(
      `SELECT to_char(date_trunc('month', gs.session_date), 'YYYY-MM') AS periodo,
              COUNT(*)::int AS sesiones
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
        ${where}
        GROUP BY date_trunc('month', gs.session_date)
        ORDER BY date_trunc('month', gs.session_date)`,
      params,
    );
    return r.rows;
  }

  /** CU-31 RN-006: top de términos más frecuentes en `key_learnings`, mismo filtro. */
  async nubeDePalabras(
    institucionId: string,
    filtro: FiltroReporte,
    limite: number,
  ): Promise<PalabraFrecuente[]> {
    const { where, params } = this.construirFiltroReporte(institucionId, filtro);

    const r = await this.client.query<{ key_learnings: string }>(
      `SELECT gs.key_learnings
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
        ${where}`,
      params,
    );
    return tokenizarAprendizajes(r.rows.map((f) => f.key_learnings), limite);
  }

  /** CU-31 RN-004: KPIs agregados del reporte, mismo filtro que el corte por juego/docente. */
  async kpisReporte(institucionId: string, filtro: FiltroReporte): Promise<KpisReporte> {
    const { where, params } = this.construirFiltroReporte(institucionId, filtro);

    const r = await this.client.query<{
      total_sesiones: number;
      alumnos_alcanzados: number;
      satisfaccion_promedio: string | null;
      juegos_en_uso: number;
    }>(
      `SELECT COUNT(*)::int AS total_sesiones,
              COALESCE(SUM(gs.student_count), 0)::int AS alumnos_alcanzados,
              AVG(gs.teacher_satisfaction)::numeric(3,2) AS satisfaccion_promedio,
              COUNT(DISTINCT gs.product_id)::int AS juegos_en_uso
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
        ${where}`,
      params,
    );
    const f = r.rows[0]!;
    return {
      totalSesiones: f.total_sesiones,
      alumnosAlcanzados: f.alumnos_alcanzados,
      satisfaccionPromedio: f.satisfaccion_promedio !== null ? Number(f.satisfaccion_promedio) : 0,
      juegosEnUso: f.juegos_en_uso,
    };
  }

  /** CU-31 A8: detalle de un juego. null si no hay sesiones de ese producto en la institución. */
  async detalleJuego(
    institucionId: string,
    productoId: string,
    filtro: FiltroReporte,
  ): Promise<DetalleReporteJuego | null> {
    const filtroForzado: FiltroReporte = { ...filtro, productoId };
    const { where, params } = this.construirFiltroReporte(institucionId, filtroForzado);

    const agregado = await this.client.query<{
      name: string;
      total_sesiones: number;
      alumnos_alcanzados: number;
      satisfaccion_promedio: string;
    }>(
      `SELECT p.name,
              COUNT(*)::int AS total_sesiones,
              COALESCE(SUM(gs.student_count), 0)::int AS alumnos_alcanzados,
              AVG(gs.teacher_satisfaction)::numeric(3,2) AS satisfaccion_promedio
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
         JOIN products p ON p.id = gs.product_id
        ${where}
        GROUP BY p.name`,
      params,
    );
    const fila = agregado.rows[0];
    if (!fila) return null; // A8: sin sesiones de este producto en la institución → 404

    const [distribucion, sesiones, nubePalabras] = await Promise.all([
      this.distribucionSatisfaccion(where, params),
      this.client
        .query<{
          session_date: Date;
          user_id: string;
          full_name: string;
          group_name: string;
          student_count: number;
          duration_minutes: number;
          teacher_satisfaction: number;
        }>(
          `SELECT gs.session_date, it.user_id, u.full_name, gs.group_name,
                  gs.student_count, gs.duration_minutes, gs.teacher_satisfaction
             FROM game_sessions gs
             JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
             JOIN users u ON u.id = it.user_id
            ${where}
            ORDER BY gs.session_date DESC`,
          params,
        )
        .then((r) =>
          r.rows.map(
            (f): SesionDelJuego => ({
              fecha: f.session_date,
              docenteId: f.user_id,
              nombreDocente: f.full_name,
              grupo: f.group_name,
              estudiantes: f.student_count,
              duracionMinutos: f.duration_minutes,
              satisfaccion: f.teacher_satisfaction,
            }),
          ),
        ),
      this.nubeDePalabras(institucionId, filtroForzado, LIMITE_NUBE_PALABRAS_DETALLE),
    ]);

    return {
      productoId,
      nombreProducto: fila.name,
      totalSesiones: fila.total_sesiones,
      alumnosAlcanzados: fila.alumnos_alcanzados,
      satisfaccionPromedio: Number(fila.satisfaccion_promedio),
      distribucionSatisfaccion: distribucion,
      sesiones,
      nubePalabras,
    };
  }

  /** CU-31 A9: detalle de un docente. null si no hay sesiones de ese docente en la institución. */
  async detalleDocente(
    institucionId: string,
    docenteId: string,
    filtro: FiltroReporte,
  ): Promise<DetalleReporteDocente | null> {
    const filtroForzado: FiltroReporte = { ...filtro, docenteId };
    const { where, params } = this.construirFiltroReporte(institucionId, filtroForzado);

    const agregado = await this.client.query<{
      full_name: string;
      email: string;
      total_sesiones: number;
      alumnos_alcanzados: number;
    }>(
      `SELECT u.full_name, u.email,
              COUNT(*)::int AS total_sesiones,
              COALESCE(SUM(gs.student_count), 0)::int AS alumnos_alcanzados
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
         JOIN users u ON u.id = it.user_id
        ${where}
        GROUP BY u.full_name, u.email`,
      params,
    );
    const fila = agregado.rows[0];
    if (!fila) return null; // A9: sin sesiones de este docente en la institución → 404

    const [distribucionJuegos, sesiones] = await Promise.all([
      this.client
        .query<{ product_id: string; name: string; sesiones: number }>(
          `SELECT p.id AS product_id, p.name, COUNT(*)::int AS sesiones
             FROM game_sessions gs
             JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
             JOIN products p ON p.id = gs.product_id
            ${where}
            GROUP BY p.id, p.name
            ORDER BY sesiones DESC`,
          params,
        )
        .then((r) =>
          r.rows.map(
            (f): ItemDistribucionJuego => ({ productoId: f.product_id, nombreProducto: f.name, sesiones: f.sesiones }),
          ),
        ),
      this.client
        .query<{
          session_date: Date;
          product_id: string;
          name: string;
          group_name: string;
          student_count: number;
          duration_minutes: number;
          teacher_satisfaction: number;
        }>(
          `SELECT gs.session_date, gs.product_id, p.name, gs.group_name,
                  gs.student_count, gs.duration_minutes, gs.teacher_satisfaction
             FROM game_sessions gs
             JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
             JOIN products p ON p.id = gs.product_id
            ${where}
            ORDER BY gs.session_date DESC`,
          params,
        )
        .then((r) =>
          r.rows.map(
            (f): SesionDelDocente => ({
              fecha: f.session_date,
              productoId: f.product_id,
              nombreProducto: f.name,
              grupo: f.group_name,
              estudiantes: f.student_count,
              duracionMinutos: f.duration_minutes,
              satisfaccion: f.teacher_satisfaction,
            }),
          ),
        ),
    ]);

    return {
      docenteId,
      nombreDocente: fila.full_name,
      email: fila.email,
      totalSesiones: fila.total_sesiones,
      alumnosAlcanzados: fila.alumnos_alcanzados,
      distribucionJuegos,
      sesiones,
    };
  }

  /** Cuenta sesiones por cada valor de satisfacción (1 a 5), completando los que no aparecen con 0. */
  private async distribucionSatisfaccion(where: string, params: unknown[]): Promise<ItemDistribucionSatisfaccion[]> {
    const r = await this.client.query<{ estrellas: number; cantidad: number }>(
      `SELECT gs.teacher_satisfaction AS estrellas, COUNT(*)::int AS cantidad
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
        ${where}
        GROUP BY gs.teacher_satisfaction`,
      params,
    );
    const porEstrella = new Map(r.rows.map((f) => [f.estrellas, f.cantidad]));
    return ([1, 2, 3, 4, 5] as const).map((estrellas) => ({
      estrellas,
      cantidad: porEstrella.get(estrellas) ?? 0,
    }));
  }

  /** CU-32 PI-04: cuenta rápida para validar tope antes de exportar. */
  /** CU-32 paso 10.2: listado completo de sesiones individuales para la hoja "Sesiones"/PDF. */
  async listarSesionesReporte(institucionId: string, filtro: FiltroReporte): Promise<SesionReporteCompleta[]> {
    const { where, params } = this.construirFiltroReporte(institucionId, filtro);

    const r = await this.client.query<{
      session_date: Date;
      product_name: string;
      full_name: string;
      group_name: string;
      student_count: number;
      duration_minutes: number;
      teacher_satisfaction: number;
      key_learnings: string;
    }>(
      `SELECT gs.session_date, p.name AS product_name, u.full_name, gs.group_name,
              gs.student_count, gs.duration_minutes, gs.teacher_satisfaction, gs.key_learnings
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
         JOIN products p ON p.id = gs.product_id
         JOIN users u ON u.id = it.user_id
        ${where}
        ORDER BY gs.session_date DESC`,
      params,
    );
    return r.rows.map((f) => ({
      fecha: f.session_date,
      nombreProducto: f.product_name,
      nombreDocente: f.full_name,
      grupo: f.group_name,
      estudiantes: f.student_count,
      duracionMinutos: f.duration_minutes,
      satisfaccion: f.teacher_satisfaction,
      aprendizajes: f.key_learnings,
    }));
  }

  /** CU-32 PI-04: conteo de sesiones individuales para validar el tope (5000) antes de exportar. */
  async contarSesionesReporte(institucionId: string, filtro: FiltroReporte): Promise<number> {
    const { where, params } = this.construirFiltroReporte(institucionId, filtro);
    const r = await this.client.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
        ${where}`,
      params,
    );
    return r.rows[0]?.total ?? 0;
  }

  // ─── CU-33: Métricas del Dashboard Pedagógico ─────────────────────────────

  async metricasDashboard(
    institucionId: string,
    desde: Date,
    hasta: Date,
  ): Promise<MetricasDashboard> {
    // Periodo anterior: offset igual al rango seleccionado hacia atrás
    const rangoMs = hasta.getTime() - desde.getTime();
    const desdeAnterior = new Date(desde.getTime() - rangoMs);
    const hastaAnterior = desde;

    // KPIs del periodo actual
    const kpiActual = await this.kpis(institucionId, desde, hasta);
    // KPIs del periodo anterior (para variaciones)
    const kpiAnterior = await this.kpis(institucionId, desdeAnterior, hastaAnterior);

    // Serie temporal semanal
    const serieSemanal = await this.serieSemanal(institucionId, desde, hasta);

    // Top 5 juegos y top 5 docentes
    const [topJuegos, topDocentes] = await Promise.all([
      this.topJuegos(institucionId, desde, hasta),
      this.topDocentes(institucionId, desde, hasta),
    ]);

    return {
      sesiones: kpiActual.sesiones,
      sesionesAnterior: kpiAnterior.sesiones,
      docentesActivos: kpiActual.docentesActivos,
      docentesActivosAnterior: kpiAnterior.docentesActivos,
      alumnosAlcanzados: kpiActual.alumnosAlcanzados,
      alumnosAlcanzadosAnterior: kpiAnterior.alumnosAlcanzados,
      minutosDeJuego: kpiActual.minutosDeJuego,
      minutosDeJuegoAnterior: kpiAnterior.minutosDeJuego,
      serieSemanal,
      topJuegos,
      topDocentes,
    };
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────

  private construirFiltroReporte(
    institucionId: string,
    filtro: FiltroReporte,
  ): { where: string; params: unknown[] } {
    const params: unknown[] = [institucionId];
    let where = 'WHERE it.institution_id = $1';

    if (filtro.desde !== undefined) {
      params.push(filtro.desde);
      where += ` AND gs.session_date >= $${params.length}`;
    }
    if (filtro.hasta !== undefined) {
      params.push(filtro.hasta);
      where += ` AND gs.session_date <= $${params.length}`;
    }
    if (filtro.productoId !== undefined) {
      params.push(filtro.productoId);
      where += ` AND gs.product_id = $${params.length}`;
    }
    if (filtro.docenteId !== undefined) {
      params.push(filtro.docenteId);
      where += ` AND it.user_id = $${params.length}`;
    }

    return { where, params };
  }

  private async kpis(
    institucionId: string,
    desde: Date,
    hasta: Date,
  ): Promise<{ sesiones: number; docentesActivos: number; alumnosAlcanzados: number; minutosDeJuego: number }> {
    const r = await this.client.query<{
      sesiones: number;
      docentes_activos: number;
      alumnos_alcanzados: number;
      minutos_de_juego: number;
    }>(
      `SELECT COUNT(*)::int AS sesiones,
              COUNT(DISTINCT it.user_id)::int AS docentes_activos,
              COALESCE(SUM(gs.student_count), 0)::int AS alumnos_alcanzados,
              COALESCE(SUM(gs.duration_minutes), 0)::int AS minutos_de_juego
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
        WHERE it.institution_id = $1
          AND gs.session_date >= $2
          AND gs.session_date <= $3`,
      [institucionId, desde, hasta],
    );
    const f = r.rows[0]!;
    return {
      sesiones: f.sesiones,
      docentesActivos: f.docentes_activos,
      alumnosAlcanzados: f.alumnos_alcanzados,
      minutosDeJuego: f.minutos_de_juego,
    };
  }

  private async serieSemanal(
    institucionId: string,
    desde: Date,
    hasta: Date,
  ): Promise<{ semana: string; sesiones: number }[]> {
    const r = await this.client.query<{ semana: string; sesiones: number }>(
      `SELECT to_char(date_trunc('week', gs.session_date), 'IYYY-"W"IW') AS semana,
              COUNT(*)::int AS sesiones
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
        WHERE it.institution_id = $1
          AND gs.session_date >= $2
          AND gs.session_date <= $3
        GROUP BY date_trunc('week', gs.session_date)
        ORDER BY date_trunc('week', gs.session_date)`,
      [institucionId, desde, hasta],
    );
    return r.rows;
  }

  private async topJuegos(
    institucionId: string,
    desde: Date,
    hasta: Date,
  ): Promise<{ productoId: string; nombre: string; sesiones: number }[]> {
    const r = await this.client.query<{ product_id: string; name: string; sesiones: number }>(
      `SELECT p.id AS product_id, p.name, COUNT(*)::int AS sesiones
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
         JOIN products p ON p.id = gs.product_id
        WHERE it.institution_id = $1
          AND gs.session_date >= $2
          AND gs.session_date <= $3
        GROUP BY p.id, p.name
        ORDER BY sesiones DESC
        LIMIT 5`,
      [institucionId, desde, hasta],
    );
    return r.rows.map((f) => ({ productoId: f.product_id, nombre: f.name, sesiones: f.sesiones }));
  }

  private async topDocentes(
    institucionId: string,
    desde: Date,
    hasta: Date,
  ): Promise<{ docenteId: string; nombre: string; sesiones: number }[]> {
    const r = await this.client.query<{ user_id: string; full_name: string; sesiones: number }>(
      `SELECT it.user_id, u.full_name, COUNT(*)::int AS sesiones
         FROM game_sessions gs
         JOIN institutional_teachers it ON it.id = gs.institutional_teacher_id
         JOIN users u ON u.id = it.user_id
        WHERE it.institution_id = $1
          AND gs.session_date >= $2
          AND gs.session_date <= $3
        GROUP BY it.user_id, u.full_name
        ORDER BY sesiones DESC
        LIMIT 5`,
      [institucionId, desde, hasta],
    );
    return r.rows.map((f) => ({ docenteId: f.user_id, nombre: f.full_name, sesiones: f.sesiones }));
  }
}

