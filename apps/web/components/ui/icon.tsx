import type { SVGProps } from 'react';

interface IconoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Set de íconos propio, en línea (sin librería) — mismo estilo que `IconoOjo` de `field.tsx`:
 * viewBox 24×24, trazo `currentColor`, 1.75px, esquinas redondeadas. Reemplaza los emojis usados
 * como ícono en toda la app (ver docs del rediseño): cada emoji tenía un rol funcional (estado
 * vacío, categoría, acceso de menú), nunca decorativo puro.
 */
function base(props: IconoProps) {
  const { size = 24, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };
}

export function IconoDado(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoCarpeta(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.2l1.6 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Z" />
    </svg>
  );
}

export function IconoDocumento(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3.5h7.5L19 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14.2 3.5V8H19" />
      <path d="M8.5 12.5h7M8.5 15.8h7M8.5 9.3h3" />
    </svg>
  );
}

export function IconoUrna(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 10 12 4l7.5 6" />
      <path d="M5 10.5h14V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.5Z" />
      <path d="M12 8.5v6M9 12l3 2.5 3-2.5" />
    </svg>
  );
}

export function IconoBombilla(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 18.5h6M9.8 21h4.4" />
      <path d="M12 3.5a5.8 5.8 0 0 0-3.3 10.6c.6.44 1 1.16 1 1.94v.46h4.6v-.46c0-.78.4-1.5 1-1.94A5.8 5.8 0 0 0 12 3.5Z" />
    </svg>
  );
}

export function IconoCandado(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.8" />
      <path d="M8 10.5V7.8a4 4 0 1 1 8 0v2.7" />
    </svg>
  );
}

export function IconoEscuela(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 21 8l-9 4.5L3 8Z" />
      <path d="M7 10.3V16c0 1.4 2.2 2.7 5 2.7s5-1.3 5-2.7v-5.7" />
      <path d="M21 8v6.5" />
    </svg>
  );
}

export function IconoPaquete(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8Z" />
      <path d="M4 8l8 4.5L20 8M12 12.5V21" />
    </svg>
  );
}

export function IconoCarrito(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 4.5h2l2.3 11.2a1.6 1.6 0 0 0 1.57 1.3h7.66a1.6 1.6 0 0 0 1.57-1.3l1.4-7.7H6.4" />
      <circle cx="10" cy="20" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoUsuarios(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c0-2.9 2.5-5 5.5-5s5.5 2.1 5.5 5" />
      <path d="M16 5.3c1.5.4 2.6 1.7 2.6 3.2s-1.1 2.8-2.6 3.2M20.5 19.5c0-2.4-1.7-4.3-4-4.9" />
    </svg>
  );
}

export function IconoGraficoBarras(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20.5h16" />
      <rect x="5.5" y="13" width="3.4" height="7.5" rx="0.8" />
      <rect x="10.3" y="8.5" width="3.4" height="12" rx="0.8" />
      <rect x="15.1" y="4.5" width="3.4" height="16" rx="0.8" />
    </svg>
  );
}

export function IconoGraficoLinea(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20.5h16" />
      <path d="M4.5 16.5 9.5 11l4 3.2 6-7.2" />
      <path d="M15.7 6.5H19.5v3.8" />
    </svg>
  );
}

export function IconoNotas(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.8h9.2L19 7.6V19.2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1Z" />
      <path d="M14.6 3.8v3.8H19" />
      <path d="M15.8 12.3 11 17l-2.3.6.6-2.3 4.8-4.7a1.1 1.1 0 0 1 1.7 1.4Z" />
    </svg>
  );
}

export function IconoAjustes(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6M17.8 17.8l-1.6-1.6M7.8 7.8 6.2 6.2" />
    </svg>
  );
}

export function IconoEdificio(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 20.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15" />
      <path d="M13 10.5h5a1 1 0 0 1 1 1v9" />
      <path d="M19.5 20.5h-16" />
      <path d="M7.5 8h2M7.5 11.5h2M7.5 15h2M15.5 14h1.5M15.5 17h1.5" />
    </svg>
  );
}

export function IconoBuzonVacio(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.8 8.5 12 4l8.2 4.5v9.3a1.2 1.2 0 0 1-1.2 1.2H5a1.2 1.2 0 0 1-1.2-1.2V8.5Z" />
      <path d="m3.8 8.5 6 4.7a3.4 3.4 0 0 0 4.4 0l6-4.7" />
    </svg>
  );
}

export function IconoAlerta(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.8 21 19.5H3Z" />
      <path d="M12 10v3.3" />
      <circle cx="12" cy="16.6" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconoFavorito({ relleno, ...props }: IconoProps & { relleno?: boolean }) {
  return (
    <svg {...base(props)} fill={relleno ? 'currentColor' : 'none'}>
      <path d="M12 19.3 5.8 15c-1.9-1.3-2.8-3.7-1.9-5.9.9-2.3 3.5-3.2 5.5-1.9L12 8.9l2.6-1.7c2-1.3 4.6-.4 5.5 1.9.9 2.2 0 4.6-1.9 5.9L12 19.3Z" />
    </svg>
  );
}

export function IconoNumeros(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 4.5v6M4 7.5h4" />
      <path d="M15 4.5h4.2L15.3 10a3.3 3.3 0 0 1 3.9 3.2c0 2-1.7 3.3-3.9 3.3-1.4 0-2.6-.5-3.3-1.4" />
      <path d="M4.2 19.5c0-1.8 1.4-2.7 2.9-2.7s2.9.8 2.9 2.2c0 .8-.5 1.3-1.1 1.7l-3 2h4.2" />
    </svg>
  );
}

export function IconoLibro(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 6.3c-1.4-1.1-3.4-1.8-6-1.8-.7 0-1.3.6-1.3 1.3v11.6c0 .8.6 1.3 1.3 1.3 2.6 0 4.6.7 6 1.8 1.4-1.1 3.4-1.8 6-1.8.7 0 1.3-.5 1.3-1.3V5.8c0-.7-.6-1.3-1.3-1.3-2.6 0-4.6.7-6 1.8Z" />
      <path d="M12 6.3v13" />
    </svg>
  );
}

export function IconoMicroscopio(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 20.5h9M6.5 20.5h-1" />
      <path d="M11.2 16.5 8.3 19a1.6 1.6 0 0 1-2.2 0 1.5 1.5 0 0 1 0-2.2l2.5-2.5" />
      <path d="M12.5 4.5 10 7l6.2 6.2a2 2 0 0 0 2.8 0 2 2 0 0 0 0-2.8L12.5 4.5Z" />
      <path d="m14 6 2.5 2.5" />
    </svg>
  );
}

export function IconoMapa(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4.8 4.5 6.5v13L9 17.7l6 2.3 4.5-1.7v-13L15 6.6l-6-1.8Z" />
      <path d="M9 4.8v13M15 6.6v13" />
    </svg>
  );
}

export function IconoChip(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="7" width="10" height="10" rx="1.6" />
      <path d="M9.7 9.7h4.6v4.6H9.7ZM9 3.5v2M12 3.5v2M15 3.5v2M9 18.5v2M12 18.5v2M15 18.5v2M3.5 9h2M3.5 12h2M3.5 15h2M18.5 9h2M18.5 12h2M18.5 15h2" />
    </svg>
  );
}

export function IconoCerrar(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" />
    </svg>
  );
}

export function IconoBuscar(props: IconoProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m19.5 19.5-4-4" />
    </svg>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
};

/**
 * Firma visual: calificación como cara de dado (1-5 pips) en vez de estrellas de texto — un
 * gesto específico del dominio (juegos de mesa), no el rating por defecto que generaría
 * cualquier IA. `valor` se redondea al entero más cercano entre 1 y 5.
 */
export function PipsDado({
  valor,
  size = 18,
  etiqueta,
}: {
  valor: number;
  size?: number;
  etiqueta?: string;
}) {
  const v = Math.max(1, Math.min(5, Math.round(valor)));
  const pips = PIPS[v] ?? PIPS[1]!;
  return (
    <span
      role="img"
      aria-label={etiqueta ?? `${valor} de 5`}
      style={{ display: 'inline-flex', verticalAlign: 'middle' }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <rect x="4" y="4" width="92" height="92" rx="18" fill="none" stroke="currentColor" strokeWidth="6" />
        {pips.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" fill="currentColor" />
        ))}
      </svg>
    </span>
  );
}
