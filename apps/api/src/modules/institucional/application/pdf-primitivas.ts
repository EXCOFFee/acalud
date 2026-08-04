/**
 * Primitivas de dibujo compartidas entre los PDF de CU-32 (`generar-pdf-reporte.ts`) y CU-33
 * (`generar-pdf-dashboard.ts`) — vectores propios con `pdfkit`, sin headless-browser (ver
 * ADR-006-style: el free tier de Render ya corre la app completa con memoria acotada).
 */

export const MARGEN = 50;
export const ANCHO_PAGINA = 612 - MARGEN * 2; // Letter
export const ALTO_PAGINA = 792;
export const COLOR_MARCA = '#2f5d54';
export const COLOR_TEXTO_SUAVE = '#566661';

/** Barras horizontales — mismo criterio visual que el dashboard del frontend. */
export function graficoBarras(
  doc: PDFKit.PDFDocument,
  yInicial: number,
  items: { etiqueta: string; valor: number }[],
  maximoFijo?: number,
): number {
  const maximo = maximoFijo ?? Math.max(1, ...items.map((i) => i.valor));
  const altoBarra = 14;
  const espacio = 8;
  const anchoMaximoBarra = ANCHO_PAGINA - 160;
  let y = yInicial;

  doc.fontSize(9);
  for (const item of items) {
    const ancho = maximo > 0 ? Math.max(2, Math.round((item.valor / maximo) * anchoMaximoBarra)) : 0;
    doc.fillColor('#000').text(item.etiqueta, MARGEN, y, { width: 140, ellipsis: true });
    doc.rect(MARGEN + 145, y, ancho, altoBarra).fill(COLOR_MARCA);
    doc.fillColor('#000').text(String(item.valor), MARGEN + 145 + ancho + 6, y);
    y += altoBarra + espacio;
  }
  return y;
}

/** Línea que conecta cada punto (polyline manual) — `etiqueta` va debajo de cada punto. */
export function graficoLinea(
  doc: PDFKit.PDFDocument,
  yInicial: number,
  puntos: { etiqueta: string; valor: number }[],
  maximoFijo?: number,
): number {
  const alto = 100;
  const ancho = ANCHO_PAGINA;
  const maximo = maximoFijo ?? Math.max(1, ...puntos.map((p) => p.valor));
  const pasoX = puntos.length > 1 ? ancho / (puntos.length - 1) : 0;

  const coords = puntos.map((p, i) => ({
    x: MARGEN + i * pasoX,
    y: yInicial + alto - (p.valor / maximo) * alto,
  }));

  doc.strokeColor(COLOR_MARCA).lineWidth(2);
  doc.moveTo(coords[0]!.x, coords[0]!.y);
  for (const c of coords.slice(1)) doc.lineTo(c.x, c.y);
  doc.stroke();

  doc.fontSize(7).fillColor(COLOR_TEXTO_SUAVE);
  puntos.forEach((p, i) => {
    doc.circle(coords[i]!.x, coords[i]!.y, 2).fill(COLOR_MARCA);
    doc.text(p.etiqueta, coords[i]!.x - 10, yInicial + alto + 6);
  });

  return yInicial + alto + 20;
}

export function piePagina(doc: PDFKit.PDFDocument): void {
  doc
    .fontSize(8)
    .fillColor(COLOR_TEXTO_SUAVE)
    .text(`Reporte generado por Acalud - ${new Date().toLocaleDateString('es-AR')}`, MARGEN, ALTO_PAGINA - MARGEN, {
      width: ANCHO_PAGINA,
      align: 'center',
    });
}
