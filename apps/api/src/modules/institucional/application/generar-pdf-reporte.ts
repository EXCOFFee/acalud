import PDFDocument from 'pdfkit';
import { ALTO_PAGINA, ANCHO_PAGINA, COLOR_MARCA, COLOR_TEXTO_SUAVE, graficoBarras, graficoLinea, MARGEN, piePagina } from './pdf-primitivas';
import type {
  FilaReporteDocente,
  FilaReporteJuego,
  FilaSerieTemporal,
  KpisReporte,
  PalabraFrecuente,
} from '../domain/ports/sesiones.repository';

export interface DatosReporteParaExportar {
  institucionNombre: string;
  filtros: { desde?: string; hasta?: string };
  kpis: KpisReporte;
  filasJuego: FilaReporteJuego[];
  filasDocente: FilaReporteDocente[];
  serieTemporal: FilaSerieTemporal[];
  nubePalabras: PalabraFrecuente[];
}

const MAX_ITEMS_GRAFICO = 10;

/**
 * CU-32 paso 10.1: PDF con encabezado, resumen ejecutivo, gráficos (barras/línea dibujados como
 * vectores propios, sin headless-browser), tabla de docentes, nube de palabras y pie de página.
 */
export async function generarPdfReporte(datos: DatosReporteParaExportar): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGEN, compress: false, size: 'LETTER' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = MARGEN;
    const avanzar = (alto: number): void => {
      y += alto;
      if (y > ALTO_PAGINA - MARGEN - 60) {
        piePagina(doc);
        doc.addPage();
        y = MARGEN;
      }
    };

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.fontSize(20).fillColor('#000').text('Reporte de uso institucional', MARGEN, y);
    y += 28;
    doc.fontSize(11).fillColor(COLOR_TEXTO_SUAVE).text(datos.institucionNombre, MARGEN, y);
    y += 16;
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, MARGEN, y);
    y += 16;
    const rangoTexto = `Período: ${datos.filtros.desde ?? 'sin definir'} a ${datos.filtros.hasta ?? 'hoy'}`;
    doc.text(rangoTexto, MARGEN, y);
    y += 30;

    // ── Resumen ejecutivo (KPIs) ────────────────────────────────────────────
    doc.fontSize(14).fillColor('#000').text('Resumen', MARGEN, y);
    y += 20;
    doc.fontSize(10).fillColor(COLOR_TEXTO_SUAVE);
    const kpiLineas = [
      `Total de sesiones: ${datos.kpis.totalSesiones}`,
      `Alumnos alcanzados: ${datos.kpis.alumnosAlcanzados}`,
      `Satisfacción promedio: ${datos.kpis.satisfaccionPromedio} / 5`,
      `Juegos en uso: ${datos.kpis.juegosEnUso}`,
    ];
    for (const linea of kpiLineas) {
      doc.text(linea, MARGEN, y);
      y += 14;
    }
    y += 16;

    // ── Gráfico: sesiones por juego ─────────────────────────────────────────
    if (datos.filasJuego.length > 0) {
      doc.fontSize(14).fillColor('#000').text('Sesiones por juego', MARGEN, y);
      y += 20;
      y = graficoBarras(
        doc,
        y,
        datos.filasJuego.slice(0, MAX_ITEMS_GRAFICO).map((f) => ({ etiqueta: f.nombreProducto, valor: f.totalSesiones })),
      );
      y += 20;
    }

    // ── Gráfico: satisfacción promedio por juego ────────────────────────────
    if (datos.filasJuego.length > 0) {
      doc.fontSize(14).fillColor('#000').text('Satisfacción promedio por juego', MARGEN, y);
      y += 20;
      y = graficoBarras(
        doc,
        y,
        datos.filasJuego
          .slice(0, MAX_ITEMS_GRAFICO)
          .map((f) => ({ etiqueta: f.nombreProducto, valor: f.satisfaccionPromedio })),
        5,
      );
      y += 20;
    }

    // ── Gráfico: evolución temporal ──────────────────────────────────────────
    if (datos.serieTemporal.length > 1) {
      doc.fontSize(14).fillColor('#000').text('Evolución de sesiones por mes', MARGEN, y);
      y += 20;
      y = graficoLinea(
        doc,
        y,
        datos.serieTemporal.map((s) => ({ etiqueta: s.periodo, valor: s.sesiones })),
      );
      y += 20;
    }

    // ── Tabla de docentes ────────────────────────────────────────────────────
    if (datos.filasDocente.length > 0) {
      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Docentes', MARGEN, y);
      y += 20;
      doc.fontSize(9).fillColor(COLOR_TEXTO_SUAVE);
      for (const d of datos.filasDocente) {
        doc.text(
          `${d.nombreDocente} — ${d.totalSesiones} sesiones, ${d.alumnosAlcanzados} alumnos, satisfacción ${d.satisfaccionPromedio}/5`,
          MARGEN,
          y,
        );
        y += 13;
        avanzar(0);
      }
      y += 16;
    }

    // ── Nube de palabras (lista con tamaño proporcional a la frecuencia) ────
    if (datos.nubePalabras.length > 0) {
      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Aprendizajes clave más mencionados', MARGEN, y);
      y += 24;
      const frecuenciaMax = Math.max(...datos.nubePalabras.map((p) => p.frecuencia));
      let x = MARGEN;
      for (const p of datos.nubePalabras) {
        const tamanio = 9 + Math.round((p.frecuencia / frecuenciaMax) * 14); // 9-23pt
        doc.fontSize(tamanio).fillColor(COLOR_MARCA);
        const ancho = doc.widthOfString(p.palabra) + 14;
        if (x + ancho > MARGEN + ANCHO_PAGINA) {
          x = MARGEN;
          y += tamanio + 8;
          avanzar(0);
        }
        doc.text(p.palabra, x, y);
        x += ancho;
      }
      y += 30;
    }

    piePagina(doc);
    doc.end();
  });
}
