import { generarExcelReporte } from './generar-excel-reporte';
import { ArchivoExcedeTamano, ExportExcedeLimite, SinDatosParaExportar, SinPermisosDeEncargado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { FiltroReporte } from '../domain/ports/sesiones.repository';

/** PI-04: tope de exportación (sesiones individuales). */
const TOPE_SESIONES = 5000;
/** RNF-002 (CU-32): tamaño máximo del archivo exportado. */
const TOPE_BYTES = 10 * 1024 * 1024;
const LIMITE_NUBE_PALABRAS = 30;

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/**
 * CU-32 · Exportar reporte (Excel). Genera un libro con las 5 hojas que pide el CU respetando
 * PI-04 (tope de sesiones) y RNF-002 (tope de tamaño). Generación síncrona: se entrega completo
 * o falla con 404/422/413/500. El PDF llega en la próxima unidad.
 */
export class ExportarReporte {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(institucionId: string, usuarioId: string, filtro: FiltroReporte): Promise<ExportResult> {
    return this.uow.transaccion(async (repos) => {
      const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
      if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();

      // PI-04: validar tope antes de cargar el detalle completo de sesiones.
      const totalSesiones = await repos.sesiones.contarSesionesReporte(institucionId, filtro);
      if (totalSesiones > TOPE_SESIONES) throw new ExportExcedeLimite(totalSesiones);
      if (totalSesiones === 0) throw new SinDatosParaExportar(); // CU-32 A2

      const [institucionNombre, kpis, filasJuego, filasDocente, nubePalabras, sesiones] = await Promise.all([
        repos.instituciones.buscarNombre(institucionId),
        repos.sesiones.kpisReporte(institucionId, filtro),
        repos.sesiones.reportePorJuego(institucionId, filtro),
        repos.sesiones.reportePorDocente(institucionId, filtro),
        repos.sesiones.nubeDePalabras(institucionId, filtro, LIMITE_NUBE_PALABRAS),
        repos.sesiones.listarSesionesReporte(institucionId, filtro),
      ]);

      const buffer = await generarExcelReporte({
        institucionNombre: institucionNombre ?? 'Institución',
        filtros: {
          ...(filtro.desde !== undefined && { desde: filtro.desde.toISOString().slice(0, 10) }),
          ...(filtro.hasta !== undefined && { hasta: filtro.hasta.toISOString().slice(0, 10) }),
        },
        kpis,
        filasJuego,
        filasDocente,
        nubePalabras,
        sesiones,
      });
      if (buffer.byteLength > TOPE_BYTES) throw new ArchivoExcedeTamano(); // RNF-002/A3

      const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const nombreArchivo = sanearNombreArchivo(institucionNombre ?? 'institucion');
      const filename = `Reporte_Institucional_${nombreArchivo}_${ts}.xlsx`;

      return {
        buffer,
        filename,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
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
