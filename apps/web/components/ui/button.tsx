import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

type VarianteBoton = 'primario' | 'fantasma' | 'peligro';

interface BotonBaseProps {
  variante?: VarianteBoton;
  bloque?: boolean;
  cargando?: boolean;
  children: ReactNode;
}

interface BotonProps extends BotonBaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BotonBaseProps> {
  href?: undefined;
}

interface BotonEnlaceProps extends BotonBaseProps {
  href: string;
  disabled?: boolean;
}

function clasesBoton(variante: VarianteBoton, bloque: boolean | undefined): string {
  return ['boton', `boton--${variante}`, bloque ? 'boton--bloque' : ''].filter(Boolean).join(' ');
}

/**
 * Botón del sistema de diseño (envuelve `.boton` de `globals.css`). Con `href` renderiza un
 * `next/link` en vez de un `<button>` — mismo look, semántica de navegación correcta.
 */
export function Boton({
  variante = 'primario',
  bloque,
  cargando,
  href,
  children,
  ...rest
}: BotonProps | BotonEnlaceProps) {
  const clase = clasesBoton(variante, bloque);
  const contenido = (
    <>
      {cargando ? <span className="boton__spinner" aria-hidden="true" /> : null}
      {children}
    </>
  );

  if (href !== undefined) {
    const { disabled } = rest as BotonEnlaceProps;
    if (disabled || cargando) {
      return (
        <span className={clase} aria-disabled="true">
          {contenido}
        </span>
      );
    }
    return (
      <Link href={href} className={clase}>
        {contenido}
      </Link>
    );
  }

  const { disabled, ...botonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={clase} disabled={disabled || cargando} {...botonRest}>
      {contenido}
    </button>
  );
}
