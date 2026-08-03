interface PaginacionProps {
  pagina: number;
  tamanio: number;
  total: number;
  onCambiar: (pagina: number) => void;
}

/** No renderiza nada si todo entra en una sola página. */
export function Paginacion({ pagina, tamanio, total, onCambiar }: PaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanio));
  if (totalPaginas <= 1) return null;

  return (
    <nav className="paginacion" aria-label="Paginación">
      <button
        className="boton boton--fantasma"
        type="button"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        ← Anterior
      </button>
      <span>
        Página {pagina} de {totalPaginas}
      </span>
      <button
        className="boton boton--fantasma"
        type="button"
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        Siguiente →
      </button>
    </nav>
  );
}
