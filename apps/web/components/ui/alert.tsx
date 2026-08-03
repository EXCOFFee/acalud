import type { ReactNode } from 'react';

export function Alerta({ tipo, children }: { tipo: 'error' | 'ok' | 'aviso'; children: ReactNode }) {
  return (
    <div className={`alerta alerta--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
