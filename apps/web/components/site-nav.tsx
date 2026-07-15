import Link from 'next/link';

/** Barra superior de las páginas públicas (catálogo, ficha). */
export function SiteNav() {
  return (
    <header className="nav">
      <Link className="marca" href="/" style={{ textDecoration: 'none' }}>
        <span className="marca__ficha" aria-hidden="true" />
        Acalud
      </Link>
      <div className="nav__acciones">
        <Link className="boton boton--fantasma" href="/catalogo">
          Catálogo
        </Link>
        <Link className="boton boton--fantasma" href="/carrito">
          Carrito
        </Link>
        <Link className="boton boton--primario" href="/login">
          Ingresar
        </Link>
      </div>
    </header>
  );
}

const EMOJI_AREA: Record<string, string> = {
  Matemática: '🔢',
  Lengua: '📖',
  'Ciencias Naturales': '🔬',
  'Ciencias Sociales': '🗺️',
  Programación: '🤖',
};

/** Emoji representativo del área (placeholder visual mientras no hay imágenes cargadas). */
export function emojiArea(area: string | null): string {
  return (area && EMOJI_AREA[area]) || '🎲';
}

/** Precio en pesos argentinos, sin centavos. */
export function precioARS(valor: number): string {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}
