import { ExportExcedeLimite, SinPermisosDeEncargado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { FiltroReporte } from '../domain/ports/sesiones.repository';

/** PI-04: tope de exportación. */
const TOPE_FILAS = 5000;

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/**
 * CU-32 · Exportar reporte (CSV).
 *
 * Genera un CSV con los datos del reporte de CU-31 respetando PI-04.
 * Generación síncrona: se entrega completo o falla con 422/500.
 * El nombre del archivo incluye institución + rango + timestamp (directiva IA).
 *
 * Nota: en v1 se exporta CSV para evitar dependencias externas. XLSX/PDF se
 * incorporarán cuando se aprueben las dependencias correspondientes.
 */
export class ExportarReporte {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(
    institucionId: string,
    usuarioId: string,
    corte: 'juego' | 'docente',
    filtro: FiltroReporte,
  ): Promise<ExportResult> {
    return this.uow.transaccion(async (repos) => {
      // PRE: solo encargado
      const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
      if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();

      // PI-04: validar tope antes de cargar los datos
      const total = await repos.sesiones.contarFilasReporte(institucionId, corte, filtro);
      if (total > TOPE_FILAS) throw new ExportExcedeLimite(total);

      // Obtener datos
      const filas =
        corte === 'juego'
          ? await repos.sesiones.reportePorJuego(institucionId, filtro)
          : await repos.sesiones.reportePorDocente(institucionId, filtro);

      // Generar CSV
      const csv = generarCSV(corte, filas);

      // Nombre del archivo: directiva IA (institución + rango + timestamp)
      const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const desde = filtro.desde ? filtro.desde.toISOString().slice(0, 10) : 'inicio';
      const hasta = filtro.hasta ? filtro.hasta.toISOString().slice(0, 10) : 'hoy';
      const filename = `reporte_${corte}_${desde}_${hasta}_${ts}.csv`;

      return {
        buffer: Buffer.from(csv, 'utf-8'),
        filename,
        contentType: 'text/csv; charset=utf-8',
      };
    });
  }
}

function generarCSV(corte: 'juego' | 'docente', filas: unknown[]): string {
  if (corte === 'juego') {
    const cabeceras = 'Producto,Sesiones,Docentes Distintos,Alumnos Alcanzados,Minutos Totales,Última Sesión';
    const lineas = (filas as Array<{
      nombreProducto: string;
      totalSesiones: number;
      docentesDistintos: number;
      alumnosAlcanzados: number;
      minutosTotales: number;
      ultimaSesion: Date | null;
    }>).map((f) =>
      [
        escaparCSV(f.nombreProducto),
        f.totalSesiones,
        f.docentesDistintos,
        f.alumnosAlcanzados,
        f.minutosTotales,
        f.ultimaSesion?.toISOString() ?? '',
      ].join(','),
    );
    return [cabeceras, ...lineas].join('\n');
  }

  const cabeceras = 'Docente,Sesiones,Juegos Distintos,Alumnos Alcanzados,Minutos Totales';
  const lineas = (filas as Array<{
    nombreDocente: string;
    totalSesiones: number;
    juegosDistintos: number;
    alumnosAlcanzados: number;
    minutosTotales: number;
  }>).map((f) =>
    [
      escaparCSV(f.nombreDocente),
      f.totalSesiones,
      f.juegosDistintos,
      f.alumnosAlcanzados,
      f.minutosTotales,
    ].join(','),
  );
  return [cabeceras, ...lineas].join('\n');
}

/** Escapa un valor para CSV: si contiene comas, comillas o saltos de línea, lo envuelve en comillas. */
function escaparCSV(valor: string): string {
  if (/[,"\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}
