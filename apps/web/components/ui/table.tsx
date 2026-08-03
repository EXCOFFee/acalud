import type { ReactNode } from 'react';

export interface ColumnaTabla<T> {
  clave: string;
  encabezado: string;
  render: (fila: T) => ReactNode;
  alinear?: 'izquierda' | 'derecha';
}

interface TablaProps<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  claveFila: (fila: T) => string;
}

/** Tabla genérica con scroll horizontal propio (nunca desborda la página). */
export function Tabla<T>({ columnas, filas, claveFila }: TablaProps<T>) {
  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} style={c.alinear === 'derecha' ? { textAlign: 'right' } : undefined}>
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={claveFila(fila)}>
              {columnas.map((c) => (
                <td key={c.clave} style={c.alinear === 'derecha' ? { textAlign: 'right' } : undefined}>
                  {c.render(fila)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
