import type { ReactNode } from 'react';

/** Texto simple centrado, para esperas cortas dentro de listas/formularios. */
export function EstadoCarga({ children = 'Cargando…' }: { children?: ReactNode }) {
  return <p className="estado-carga">{children}</p>;
}

interface EstadoBaseProps {
  icono?: string;
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}

/** Lista/búsqueda sin resultados. */
export function EstadoVacio({ icono = '📭', titulo, children, accion }: EstadoBaseProps) {
  return (
    <div className="estado" role="status">
      <span className="estado__icono" aria-hidden="true">
        {icono}
      </span>
      <p className="estado__titulo">{titulo}</p>
      {children ? <p>{children}</p> : null}
      {accion ? <div className="estado__accion">{accion}</div> : null}
    </div>
  );
}

/** Falla de carga (red, servidor). */
export function EstadoError({ icono = '⚠️', titulo = 'Algo salió mal', children, accion }: EstadoBaseProps) {
  return (
    <div className="estado" role="alert">
      <span className="estado__icono" aria-hidden="true">
        {icono}
      </span>
      <p className="estado__titulo">{titulo}</p>
      {children ? <p>{children}</p> : null}
      {accion ? <div className="estado__accion">{accion}</div> : null}
    </div>
  );
}
