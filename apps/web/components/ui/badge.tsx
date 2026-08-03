import type { ReactNode } from 'react';

type VarianteInsignia = 'default' | 'ok' | 'off' | 'neutra' | 'marca';

/** Insignia corta (envuelve `.chip`): estado, categoría, conteo. */
export function Insignia({
  variante = 'default',
  children,
}: {
  variante?: VarianteInsignia;
  children: ReactNode;
}) {
  const clase = variante === 'default' ? 'chip' : `chip chip--${variante}`;
  return <span className={clase}>{children}</span>;
}
