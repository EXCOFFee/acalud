function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return h;
}

// 6 posiciones posibles (layout de cara de dado) — cada producto usa un subconjunto
// determinístico según su id/nombre, para que la miniatura sin foto no sea un emoji genérico.
const POSICIONES: [number, number][] = [
  [22, 22],
  [78, 22],
  [22, 50],
  [78, 50],
  [22, 78],
  [78, 78],
];

/**
 * Miniatura de producto sin imagen propia: en vez de un emoji gigante de placeholder, dibuja un
 * patrón de pips determinístico (a partir del id/nombre) sobre el degradé de marca — cada
 * producto tiene una "cara" distinta pero estable entre cargas.
 */
export function TileProducto({ semilla }: { semilla: string }) {
  const h = hash(semilla);
  const cantidad = 2 + (h % 4); // 2 a 5 pips
  const centro = 50;
  const rotacion = (h % 24) - 12; // -12° a 11°, variación sutil

  return (
    <svg viewBox="0 0 100 100" width="46%" height="46%" style={{ opacity: 0.85 }} aria-hidden="true">
      <g transform={`rotate(${rotacion} ${centro} ${centro})`}>
        <rect x="6" y="6" width="88" height="88" rx="16" fill="none" stroke="#fff" strokeWidth="4" opacity="0.9" />
        {POSICIONES.slice(0, cantidad).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="7.5" fill="#fff" />
        ))}
      </g>
    </svg>
  );
}
