import PDFDocument from 'pdfkit';
import { ALTO_PAGINA, ANCHO_PAGINA, COLOR_MARCA, COLOR_TEXTO_SUAVE, graficoBarras, graficoLinea, MARGEN, piePagina } from './pdf-primitivas';
import type {
  FilaDistribucionDiaSemana,
  FilaReporteDocente,
  FilaReporteJuego,
  FilaSerieTemporal,
  ItemDistribucionSatisfaccion,
  PalabraFrecuente,
} from '../domain/ports/sesiones.repository';

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
  distribucionSatisfaccion: ItemDistribucionSatisfaccion[];
  distribucionDiaSemana: FilaDistribucionDiaSemana[];
  topJuegos: FilaReporteJuego[];
  topDocentes: FilaReporteDocente[];
  serieMensual: FilaSerieTemporal[];
  nubePalabras: PalabraFrecuente[];
  dificultadesFrecuentes: PalabraFrecuente[];
}

const NOMBRE_DIA: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

/** Dibuja una lista de palabras con tamaño proporcional a la frecuencia, devuelve el `y` final. */
function nubeTexto(doc: PDFKit.PDFDocument, yInicial: number, palabras: PalabraFrecuente[]): number {
  const frecuenciaMax = Math.max(...palabras.map((p) => p.frecuencia));
  let x = MARGEN;
  let y = yInicial;
  for (const p of palabras) {
    const tamanio = 9 + Math.round((p.frecuencia / frecuenciaMax) * 14); // 9-23pt
    doc.fontSize(tamanio).fillColor(COLOR_MARCA);
    const ancho = doc.widthOfString(p.palabra) + 14;
    if (x + ancho > MARGEN + ANCHO_PAGINA) {
      x = MARGEN;
      y += tamanio + 8;
    }
    doc.text(p.palabra, x, y);
    x += ancho;
  }
  return y + 30;
}

/**
 * CU-33 A9: PDF con el dashboard pedagógico completo — mismas primitivas de dibujo que CU-32
 * (`pdf-primitivas.ts`), sin headless-browser.
 */
export async function generarPdfDashboard(datos: DatosDashboardParaExportar): Promise<Buffer> {
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
    doc.fontSize(20).fillColor('#000').text('Dashboard pedagógico', MARGEN, y);
    y += 28;
    doc.fontSize(11).fillColor(COLOR_TEXTO_SUAVE).text(datos.institucionNombre, MARGEN, y);
    y += 16;
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, MARGEN, y);
    y += 16;
    doc.text(`Período: ${datos.filtros.desde ?? 'sin definir'} a ${datos.filtros.hasta ?? 'hoy'}`, MARGEN, y);
    y += 30;

    // ── KPIs ────────────────────────────────────────────────────────────────
    doc.fontSize(14).fillColor('#000').text('Resumen', MARGEN, y);
    y += 20;
    doc.fontSize(10).fillColor(COLOR_TEXTO_SUAVE);
    const kpiLineas = [
      `Total de sesiones: ${datos.kpis.sesiones}`,
      `Docentes activos: ${datos.kpis.docentesActivos}`,
      `Alumnos alcanzados: ${datos.kpis.alumnosAlcanzados}`,
      `Minutos de juego: ${datos.kpis.minutosDeJuego}`,
      `Satisfacción promedio: ${datos.kpis.satisfaccionPromedio} / 5`,
      `Tasa de reutilización: ${datos.kpis.tasaReutilizacion}%`,
    ];
    for (const linea of kpiLineas) {
      doc.text(linea, MARGEN, y);
      y += 14;
    }
    y += 16;

    // ── Distribución de satisfacción ─────────────────────────────────────────
    doc.fontSize(14).fillColor('#000').text('Distribución de satisfacción', MARGEN, y);
    y += 20;
    y = graficoBarras(
      doc,
      y,
      datos.distribucionSatisfaccion.map((d) => ({ etiqueta: `${d.estrellas} ★`, valor: d.cantidad })),
    );
    y += 20;

    // ── Sesiones / satisfacción por juego ────────────────────────────────────
    if (datos.topJuegos.length > 0) {
      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Sesiones por juego', MARGEN, y);
      y += 20;
      y = graficoBarras(
        doc,
        y,
        datos.topJuegos.map((f) => ({ etiqueta: f.nombreProducto, valor: f.totalSesiones })),
      );
      y += 20;

      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Satisfacción promedio por juego', MARGEN, y);
      y += 20;
      y = graficoBarras(
        doc,
        y,
        datos.topJuegos.map((f) => ({ etiqueta: f.nombreProducto, valor: f.satisfaccionPromedio })),
        5,
      );
      y += 20;
    }

    // ── Evolución de sesiones y de satisfacción ──────────────────────────────
    if (datos.serieMensual.length > 1) {
      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Evolución de sesiones por mes', MARGEN, y);
      y += 20;
      y = graficoLinea(
        doc,
        y,
        datos.serieMensual.map((s) => ({ etiqueta: s.periodo, valor: s.sesiones })),
      );
      y += 20;

      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Evolución de satisfacción por mes', MARGEN, y);
      y += 20;
      y = graficoLinea(
        doc,
        y,
        datos.serieMensual.map((s) => ({ etiqueta: s.periodo, valor: s.satisfaccionPromedio })),
        5,
      );
      y += 20;
    }

    // ── Sesiones por día de la semana ────────────────────────────────────────
    avanzar(0);
    doc.fontSize(14).fillColor('#000').text('Sesiones por día de la semana', MARGEN, y);
    y += 20;
    y = graficoBarras(
      doc,
      y,
      datos.distribucionDiaSemana.map((d) => ({ etiqueta: NOMBRE_DIA[d.diaSemana]!, valor: d.sesiones })),
    );
    y += 20;

    // ── Docentes ──────────────────────────────────────────────────────────────
    if (datos.topDocentes.length > 0) {
      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Docentes activos', MARGEN, y);
      y += 20;
      doc.fontSize(9).fillColor(COLOR_TEXTO_SUAVE);
      for (const d of datos.topDocentes) {
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

    // ── Nube de palabras y dificultades ──────────────────────────────────────
    if (datos.nubePalabras.length > 0) {
      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Aprendizajes clave más mencionados', MARGEN, y);
      y += 24;
      y = nubeTexto(doc, y, datos.nubePalabras);
    }

    if (datos.dificultadesFrecuentes.length > 0) {
      avanzar(0);
      doc.fontSize(14).fillColor('#000').text('Dificultades más frecuentes', MARGEN, y);
      y += 24;
      y = nubeTexto(doc, y, datos.dificultadesFrecuentes);
    }

    piePagina(doc);
    doc.end();
  });
}
