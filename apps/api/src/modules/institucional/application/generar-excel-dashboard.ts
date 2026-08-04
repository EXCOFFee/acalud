import ExcelJS from 'exceljs';
import type { FilaReporteDocente, FilaReporteJuego, PalabraFrecuente } from '../domain/ports/sesiones.repository';

export interface DatosDashboardParaExportar {
  institucionNombre: string;
  filtros: { desde?: string; hasta?: string };
  kpis: {
    sesiones: number;
    docentesActivos: number;
    alumnosAlcanzados: number;
    minutosDeJuego: number;
    satisfaccionPromedio: number;
    tasaReutilizacion: number;
  };
  topJuegos: FilaReporteJuego[];
  topDocentes: FilaReporteDocente[];
  nubePalabras: PalabraFrecuente[];
  dificultadesFrecuentes: PalabraFrecuente[];
}

/**
 * CU-33 A9: libro de Excel con el dashboard — Resumen, Juegos, Docentes, Aprendizajes,
 * Dificultades. Mismo patrón que `generar-excel-reporte.ts` (CU-32).
 */
export async function generarExcelDashboard(datos: DatosDashboardParaExportar): Promise<Buffer> {
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
    { campo: 'Total de sesiones', valor: datos.kpis.sesiones },
    { campo: 'Docentes activos', valor: datos.kpis.docentesActivos },
    { campo: 'Alumnos alcanzados', valor: datos.kpis.alumnosAlcanzados },
    { campo: 'Minutos de juego', valor: datos.kpis.minutosDeJuego },
    { campo: 'Satisfacción promedio', valor: datos.kpis.satisfaccionPromedio },
    { campo: 'Tasa de reutilización (%)', valor: datos.kpis.tasaReutilizacion },
  ]);
  resumen.getRow(1).font = { bold: true };

  const juegos = libro.addWorksheet('Juegos');
  juegos.columns = [
    { header: 'Juego', key: 'juego', width: 28 },
    { header: 'Sesiones', key: 'sesiones', width: 12 },
    { header: 'Docentes distintos', key: 'docentes', width: 16 },
    { header: 'Alumnos alcanzados', key: 'alumnos', width: 18 },
    { header: 'Minutos totales', key: 'minutos', width: 16 },
    { header: 'Satisfacción promedio', key: 'satisfaccion', width: 20 },
    { header: 'Tasa de reutilización (%)', key: 'reutilizacion', width: 22 },
  ];
  for (const j of datos.topJuegos) {
    juegos.addRow({
      juego: j.nombreProducto,
      sesiones: j.totalSesiones,
      docentes: j.docentesDistintos,
      alumnos: j.alumnosAlcanzados,
      minutos: j.minutosTotales,
      satisfaccion: j.satisfaccionPromedio,
      reutilizacion: j.tasaReutilizacion,
    });
  }
  juegos.getRow(1).font = { bold: true };

  const docentes = libro.addWorksheet('Docentes');
  docentes.columns = [
    { header: 'Docente', key: 'docente', width: 28 },
    { header: 'Sesiones', key: 'sesiones', width: 12 },
    { header: 'Juegos distintos', key: 'juegos', width: 16 },
    { header: 'Alumnos alcanzados', key: 'alumnos', width: 18 },
    { header: 'Minutos totales', key: 'minutos', width: 16 },
    { header: 'Satisfacción promedio', key: 'satisfaccion', width: 20 },
    { header: 'Tasa de reutilización (%)', key: 'reutilizacion', width: 22 },
  ];
  for (const d of datos.topDocentes) {
    docentes.addRow({
      docente: d.nombreDocente,
      sesiones: d.totalSesiones,
      juegos: d.juegosDistintos,
      alumnos: d.alumnosAlcanzados,
      minutos: d.minutosTotales,
      satisfaccion: d.satisfaccionPromedio,
      reutilizacion: d.tasaReutilizacion,
    });
  }
  docentes.getRow(1).font = { bold: true };

  const aprendizajes = libro.addWorksheet('Aprendizajes');
  aprendizajes.columns = [
    { header: 'Palabra', key: 'palabra', width: 24 },
    { header: 'Frecuencia', key: 'frecuencia', width: 14 },
  ];
  for (const p of datos.nubePalabras) aprendizajes.addRow({ palabra: p.palabra, frecuencia: p.frecuencia });
  aprendizajes.getRow(1).font = { bold: true };

  const dificultades = libro.addWorksheet('Dificultades');
  dificultades.columns = [
    { header: 'Palabra', key: 'palabra', width: 24 },
    { header: 'Frecuencia', key: 'frecuencia', width: 14 },
  ];
  for (const p of datos.dificultadesFrecuentes) dificultades.addRow({ palabra: p.palabra, frecuencia: p.frecuencia });
  dificultades.getRow(1).font = { bold: true };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
