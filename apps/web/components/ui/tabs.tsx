'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface DefPestana {
  id: string;
  etiqueta: string;
  contenido: ReactNode;
}

interface TabsProps {
  pestanas: DefPestana[];
  inicial?: string;
}

/** Tablist ARIA con navegación por flechas (roving tabindex), sin librerías externas. */
export function Tabs({ pestanas, inicial }: TabsProps) {
  const [activa, setActiva] = useState(inicial ?? pestanas[0]?.id ?? '');
  const base = useId();
  const refsBotones = useRef<Array<HTMLButtonElement | null>>([]);

  function alPresionarTecla(e: KeyboardEvent<HTMLButtonElement>, indice: number): void {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const siguiente =
      e.key === 'ArrowRight' ? (indice + 1) % pestanas.length : (indice - 1 + pestanas.length) % pestanas.length;
    const destino = pestanas[siguiente];
    if (!destino) return;
    setActiva(destino.id);
    refsBotones.current[siguiente]?.focus();
  }

  return (
    <div>
      <div className="tabs__lista" role="tablist">
        {pestanas.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => {
              refsBotones.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${p.id}`}
            aria-selected={activa === p.id}
            aria-controls={`${base}-panel-${p.id}`}
            className="tabs__boton"
            tabIndex={activa === p.id ? 0 : -1}
            onClick={() => setActiva(p.id)}
            onKeyDown={(e) => alPresionarTecla(e, i)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>
      {pestanas.map((p) =>
        p.id === activa ? (
          <div
            key={p.id}
            className="tabs__panel"
            role="tabpanel"
            id={`${base}-panel-${p.id}`}
            aria-labelledby={`${base}-tab-${p.id}`}
            tabIndex={0}
          >
            {p.contenido}
          </div>
        ) : null,
      )}
    </div>
  );
}
