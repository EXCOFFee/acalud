import type { ReactNode } from 'react';
import { IconoAlerta, IconoBuzonVacio } from './icon';

/** Texto simple centrado, para esperas cortas dentro de listas/formularios. `role="status"` para
 *  que un lector de pantalla anuncie el cambio (y el que sigue, cuando el contenido llega). */
export function EstadoCarga({ children = 'Cargando…' }: { children?: ReactNode }) {
  return (
    <p className="estado-carga" role="status">
      {children}
    </p>
  );
}

interface EstadoBaseProps {
  icono?: ReactNode;
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}

/** Lista/búsqueda sin resultados. */
export function EstadoVacio({ icono, titulo, children, accion }: EstadoBaseProps) {
  return (
    <div className="estado" role="status">
      <span className="estado__icono">{icono ?? <IconoBuzonVacio size={40} />}</span>
      <p className="estado__titulo">{titulo}</p>
      {children ? <p>{children}</p> : null}
      {accion ? <div className="estado__accion">{accion}</div> : null}
    </div>
  );
}

/** Falla de carga (red, servidor). */
export function EstadoError({ icono, titulo = 'Algo salió mal', children, accion }: EstadoBaseProps) {
  return (
    <div className="estado" role="alert">
      <span className="estado__icono">{icono ?? <IconoAlerta size={40} />}</span>
      <p className="estado__titulo">{titulo}</p>
      {children ? <p>{children}</p> : null}
      {accion ? <div className="estado__accion">{accion}</div> : null}
    </div>
  );
}
