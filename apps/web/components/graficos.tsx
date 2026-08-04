'use client';

import type { PalabraFrecuente } from '@/lib/api';

/**
 * Gráficos hechos a mano con SVG/CSS nativo, sin librería de charting — mismo criterio en todo
 * el proyecto (ver /institucion/dashboard y /institucion/reportes). Compartido entre CU-31 y
 * CU-33: ambas páginas muestran las mismas formas de gráfico (barras, línea, nube de palabras).
 */

export function BarraHorizontal({
  etiqueta,
  valor,
  maximo,
  sufijo = '',
  onClick,
}: {
  etiqueta: string;
  valor: number;
  maximo: number;
  sufijo?: string;
  onClick?: () => void;
}) {
  const porcentaje = maximo > 0 ? Math.max(4, Math.round((valor / maximo) * 100)) : 0;
  const barra = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
        <span>{etiqueta}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {valor}
          {sufijo}
        </span>
      </div>
      <div style={{ background: 'var(--superficie-2)', borderRadius: '999px', height: '0.6rem', overflow: 'hidden' }}>
        <div style={{ width: `${porcentaje}%`, height: '100%', background: 'var(--marca)', borderRadius: '999px' }} />
      </div>
    </>
  );
  return (
    <li style={{ listStyle: 'none' }}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer', minHeight: '2.75rem' }}
          aria-label={`Ver detalle de ${etiqueta}`}
        >
          {barra}
        </button>
      ) : (
        barra
      )}
    </li>
  );
}

export interface PuntoEvolucion {
  etiqueta: string;
  valor: number;
}

/** Línea de evolución — SVG nativo. `maximoFijo` para escalas conocidas (ej: satisfacción 1-5). */
export function GraficoEvolucion({
  puntos,
  descripcion,
  maximoFijo,
}: {
  puntos: PuntoEvolucion[];
  descripcion: string;
  maximoFijo?: number;
}) {
  const alto = 100;
  const ancho = 480;
  const maximo = maximoFijo ?? Math.max(1, ...puntos.map((p) => p.valor));
  const pasoX = puntos.length > 1 ? ancho / (puntos.length - 1) : 0;
  const coords = puntos.map((p, i) => ({
    x: i * pasoX,
    y: alto - (p.valor / maximo) * (alto - 16),
  }));
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto + 20}`}
      role="img"
      aria-label={descripcion}
      style={{ width: '100%', height: 'auto', maxWidth: `${ancho}px` }}
    >
      <polyline points={polyline} fill="none" stroke="var(--marca)" strokeWidth={2} />
      {coords.map((c, i) => (
        <g key={puntos[i]!.etiqueta}>
          <circle cx={c.x} cy={c.y} r={3} fill="var(--marca)" />
          <text x={c.x} y={alto + 14} fontSize={9} textAnchor="middle" fill="var(--tinta-suave)">
            {puntos[i]!.etiqueta.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Nube de palabras — lista con tamaño de fuente proporcional a la frecuencia (texto, accesible por default). */
export function NubeDePalabras({ palabras }: { palabras: PalabraFrecuente[] }) {
  const frecuenciaMax = Math.max(1, ...palabras.map((p) => p.frecuencia));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline' }}>
      {palabras.map((p) => {
        const tamanio = 0.8 + (p.frecuencia / frecuenciaMax) * 1.1; // 0.8rem–1.9rem
        return (
          <span
            key={p.palabra}
            style={{ fontSize: `${tamanio}rem`, color: 'var(--marca)', fontWeight: 600 }}
            title={`${p.frecuencia} mención${p.frecuencia === 1 ? '' : 'es'}`}
          >
            {p.palabra}
          </span>
        );
      })}
    </div>
  );
}
