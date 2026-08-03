import type { HTMLAttributes, ReactNode } from 'react';

export function Tarjeta({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const clase = ['tarjeta', className].filter(Boolean).join(' ');
  return (
    <div className={clase} {...rest}>
      {children}
    </div>
  );
}

/** Fila clave/valor dentro de una `Tarjeta` (ver `.dato` en `globals.css`). */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="dato">
      <span className="dato__k">{etiqueta}</span>
      <span className="dato__v">{children}</span>
    </div>
  );
}
