'use client';

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

interface DialogoProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  acciones?: ReactNode;
  /** `ancho`: para contenido que necesita más espacio (embeds, formularios grandes). */
  ancho?: 'normal' | 'ancho';
}

/**
 * Modal accesible sobre `<dialog>` nativo: foco atrapado, Escape y backdrop los resuelve el
 * navegador (sin librería de terceros). `onCancel` intercepta el Escape para que el cierre
 * siempre pase por `onCerrar` y el estado del padre quede consistente.
 */
export function Dialogo({ abierto, onCerrar, titulo, children, acciones, ancho = 'normal' }: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (abierto && !el.open) el.showModal();
    if (!abierto && el.open) el.close();
  }, [abierto]);

  function alHacerClicEnFondo(e: MouseEvent<HTMLDialogElement>): void {
    if (e.target === e.currentTarget) onCerrar();
  }

  return (
    <dialog
      ref={ref}
      className={ancho === 'ancho' ? 'dialogo dialogo--ancho' : 'dialogo'}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={alHacerClicEnFondo}
    >
      <div className="dialogo__cuerpo">
        <div className="dialogo__cabecera">
          <h2 className="dialogo__titulo" id={idTitulo}>
            {titulo}
          </h2>
          <button type="button" className="dialogo__cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
        {acciones ? <div className="dialogo__acciones">{acciones}</div> : null}
      </div>
    </dialog>
  );
}
