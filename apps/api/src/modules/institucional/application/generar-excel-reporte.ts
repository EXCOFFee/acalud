import ExcelJS from 'exceljs';
import type {
  FilaReporteDocente,
  FilaReporteJuego,
  KpisReporte,
  PalabraFrecuente,
  SesionReporteCompleta,
} from '../domain/ports/sesiones.repository';

export interface DatosReporteParaExportar {
  institucionNombre: string;
  filtros: { desde?: string; hasta?: string };
  kpis: KpisReporte;
  filasJuego: FilaReporteJuego[];
  filasDocente: FilaReporteDocente[];
  nubePalabras: PalabraFrecuente[];
  sesiones: SesionReporteCompleta[];
}

/**
 * CU-32 paso 10.2: libro de Excel con las 5 hojas que pide el CU — Resumen, Sesiones, Docentes,
 * Juegos y Aprendizajes. Se genera en memoria (sin archivos temporales), consistente con
 * "el backend guarda el archivo generado... o lo genera en memoria" del propio CU.
 */
export async function generarExcelReporte(datos: DatosReporteParaExportar): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Acalud';
  libro.created = new Date();

  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [
    { header: 'Campo', key: 'campo', width: 28 },
    { header: 'Valor', key: 'valor', width: 40 },
  ];
  resumen.addRows([
    { campo: 'Institución', valor: datos.institucionNombre },
    { campo: 'Fecha de generación', valor: new Date().toLocaleString('es-AR') },
    { campo: 'Filtro — desde', valor: datos.filtros.desde ?? 'Sin filtro' },
    { campo: 'Filtro — hasta', valor: datos.filtros.hasta ?? 'Sin filtro' },
    { campo: 'Total de sesiones', valor: datos.kpis.totalSesiones },
    { campo: 'Alumnos alcanzados', valor: datos.kpis.alumnosAlcanzados },
    { campo: 'Satisfacción promedio', valor: datos.kpis.satisfaccionPromedio },
    { campo: 'Juegos en uso', valor: datos.kpis.juegosEnUso },
  ]);
  resumen.getRow(1).font = { bold: true };

  const sesiones = libro.addWorksheet('Sesiones');
  sesiones.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Juego', key: 'juego', width: 26 },
    { header: 'Docente', key: 'docente', width: 26 },
    { header: 'Grupo', key: 'grupo', width: 12 },
    { header: 'Estudiantes', key: 'estudiantes', width: 12 },
    { header: 'Duración (min)', key: 'duracion', width: 14 },
    { header: 'Satisfacción', key: 'satisfaccion', width: 12 },
    { header: 'Aprendizajes clave', key: 'aprendizajes', width: 60 },
  ];
  for (const s of datos.sesiones) {
    sesiones.addRow({
      fecha: s.fecha.toISOString().slice(0, 10),
      juego: s.nombreProducto,
      docente: s.nombreDocente,
      grupo: s.grupo,
      estudiantes: s.estudiantes,
      duracion: s.duracionMinutos,
      satisfaccion: s.satisfaccion,
      aprendizajes: s.aprendizajes,
    });
  }
  sesiones.getRow(1).font = { bold: true };

  const docentes = libro.addWorksheet('Docentes');
  docentes.columns = [
    { header: 'Docente', key: 'docente', width: 28 },
    { header: 'Sesiones', key: 'sesiones', width: 12 },
    { header: 'Juegos distintos', key: 'juegos', width: 16 },
    { header: 'Alumnos alcanzados', key: 'alumnos', width: 18 },
    { header: 'Minutos totales', key: 'minutos', width: 16 },
    { header: 'Satisfacción promedio', key: 'satisfaccion', width: 20 },
  ];
  for (const d of datos.filasDocente) {
    docentes.addRow({
      docente: d.nombreDocente,
      sesiones: d.totalSesiones,
      juegos: d.juegosDistintos,
      alumnos: d.alumnosAlcanzados,
      minutos: d.minutosTotales,
      satisfaccion: d.satisfaccionPromedio,
    });
  }
  docentes.getRow(1).font = { bold: true };

  const juegos = libro.addWorksheet('Juegos');
  juegos.columns = [
    { header: 'Juego', key: 'juego', width: 28 },
    { header: 'Sesiones', key: 'sesiones', width: 12 },
    { header: 'Docentes distintos', key: 'docentes', width: 16 },
    { header: 'Alumnos alcanzados', key: 'alumnos', width: 18 },
    { header: 'Minutos totales', key: 'minutos', width: 16 },
    { header: 'Satisfacción promedio', key: 'satisfaccion', width: 20 },
  ];
  for (const j of datos.filasJuego) {
    juegos.addRow({
      juego: j.nombreProducto,
      sesiones: j.totalSesiones,
      docentes: j.docentesDistintos,
      alumnos: j.alumnosAlcanzados,
      minutos: j.minutosTotales,
      satisfaccion: j.satisfaccionPromedio,
    });
  }
  juegos.getRow(1).font = { bold: true };

  const aprendizajes = libro.addWorksheet('Aprendizajes');
  aprendizajes.columns = [
    { header: 'Palabra', key: 'palabra', width: 24 },
    { header: 'Frecuencia', key: 'frecuencia', width: 14 },
  ];
  for (const p of datos.nubePalabras) aprendizajes.addRow({ palabra: p.palabra, frecuencia: p.frecuencia });
  aprendizajes.getRow(1).font = { bold: true };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
