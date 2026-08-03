'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type TipoToast = 'ok' | 'error' | 'info';

interface ToastItem {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

interface ToastContextValue {
  notificar: (mensaje: string, tipo?: TipoToast) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURACION_MS = 4500;

/** Monta el stack de notificaciones transitorias. Envuelve `<body>` una sola vez, en el layout raíz. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const contador = useRef(0);

  const cerrar = useCallback((id: number) => {
    setItems((actual) => actual.filter((t) => t.id !== id));
  }, []);

  const notificar = useCallback(
    (mensaje: string, tipo: TipoToast = 'info') => {
      const id = ++contador.current;
      setItems((actual) => [...actual, { id, tipo, mensaje }]);
      setTimeout(() => cerrar(id), DURACION_MS);
    },
    [cerrar],
  );

  return (
    <ToastContext.Provider value={{ notificar }}>
      {children}
      <div className="toasts" role="region" aria-label="Notificaciones">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tipo}`} role={t.tipo === 'error' ? 'alert' : 'status'}>
            <span>{t.mensaje}</span>
            <button
              type="button"
              className="toast__cerrar"
              onClick={() => cerrar(t.id)}
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** `notificar('Agregado al carrito', 'ok')` desde cualquier componente cliente bajo el provider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
