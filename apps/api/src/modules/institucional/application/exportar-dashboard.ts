import { generarExcelDashboard } from './generar-excel-dashboard';
import { generarPdfDashboard } from './generar-pdf-dashboard';
import { ArchivoExcedeTamano, SinPermisosDeEncargado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { FiltroDashboard } from '../domain/ports/sesiones.repository';

export type FormatoExportacion = 'excel' | 'pdf';

/** RNF-002 (CU-32, mismo criterio para el dashboard): tamaño máximo del archivo exportado. */
const TOPE_BYTES = 10 * 1024 * 1024;

const CONTENT_TYPE: Record<FormatoExportacion, string> = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};
const EXTENSION: Record<FormatoExportacion, string> = { excel: 'xlsx', pdf: 'pdf' };

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/**
 * CU-33 A9 · Exportar el dashboard pedagógico (Excel o PDF, mismo modal de CU-32). A diferencia
 * de CU-32, el dashboard no expone el detalle sesión-por-sesión (son agregados/top 5), así que
 * no aplica PI-04 — solo el tope de tamaño del archivo.
 */
export class ExportarDashboard {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(
    institucionId: string,
    usuarioId: string,
    desde: Date,
    hasta: Date,
    filtro: FiltroDashboard,
    formato: FormatoExportacion,
  ): Promise<ExportResult> {
    return this.uow.transaccion(async (repos) => {
      const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
      if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();

      const [institucionNombre, m] = await Promise.all([
        repos.instituciones.buscarNombre(institucionId),
        repos.sesiones.metricasDashboard(institucionId, desde, hasta, filtro),
      ]);

      const filtrosDTO = { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) };
      const kpis = {
        sesiones: m.sesiones,
        docentesActivos: m.docentesActivos,
        alumnosAlcanzados: m.alumnosAlcanzados,
        minutosDeJuego: m.minutosDeJuego,
        satisfaccionPromedio: m.satisfaccionPromedio,
        tasaReutilizacion: m.tasaReutilizacion,
      };

      const buffer =
        formato === 'pdf'
          ? await generarPdfDashboard({
              institucionNombre: institucionNombre ?? 'Institución',
              filtros: filtrosDTO,
              kpis,
              distribucionSatisfaccion: m.distribucionSatisfaccion,
              distribucionDiaSemana: m.distribucionDiaSemana,
              topJuegos: m.topJuegos,
              topDocentes: m.topDocentes,
              serieMensual: m.serieMensual,
              nubePalabras: m.nubePalabras,
              dificultadesFrecuentes: m.dificultadesFrecuentes,
            })
          : await generarExcelDashboard({
              institucionNombre: institucionNombre ?? 'Institución',
              filtros: filtrosDTO,
              kpis,
              topJuegos: m.topJuegos,
              topDocentes: m.topDocentes,
              nubePalabras: m.nubePalabras,
              dificultadesFrecuentes: m.dificultadesFrecuentes,
            });
      if (buffer.byteLength > TOPE_BYTES) throw new ArchivoExcedeTamano();

      const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const nombreArchivo = sanearNombreArchivo(institucionNombre ?? 'institucion');
      const filename = `Dashboard_Pedagogico_${nombreArchivo}_${ts}.${EXTENSION[formato]}`;

      return { buffer, filename, contentType: CONTENT_TYPE[formato] };
    });
  }
}

/** Nombre de institución → seguro para nombre de archivo (sin espacios ni caracteres especiales). */
function sanearNombreArchivo(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}
