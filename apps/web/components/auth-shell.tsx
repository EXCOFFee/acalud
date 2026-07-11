import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';

interface AuthShellProps {
  titulo: string;
  bajada: string;
  children: ReactNode;
  pie: ReactNode;
}

const tokens: Array<{ left: string; bottom: string; color: string }> = [
  { left: '16%', bottom: '20%', color: 'var(--acento)' },
  { left: '38%', bottom: '36%', color: '#fbf7ee' },
  { left: '60%', bottom: '28%', color: 'var(--acento)' },
  { left: '82%', bottom: '50%', color: '#fbf7ee' },
];

/**
 * Marco de las pantallas de autenticación: panel de marca con el "tablero" (la firma
 * visual: grilla + fichas que marcan un camino) y el formulario a la derecha.
 */
export function AuthShell({ titulo, bajada, children, pie }: AuthShellProps) {
  return (
    <div className="auth">
      <aside className="auth__panel">
        <div className="tablero" aria-hidden="true">
          {tokens.map((t, i) => (
            <span
              key={i}
              className="tablero__token"
              style={{ left: t.left, bottom: t.bottom, background: t.color } as CSSProperties}
            />
          ))}
        </div>
        <Link href="/" className="marca">
          <span className="marca__ficha" aria-hidden="true" />
          Acalud
        </Link>
        <div className="auth__lema">
          <h2>Del tablero al aula, con datos.</h2>
          <p>Juegos educativos para docentes e instituciones — y la medición de su uso real en clase.</p>
        </div>
      </aside>

      <main className="auth__form">
        <div className="auth__caja">
          <h1 className="auth__titulo">{titulo}</h1>
          <p className="auth__bajada">{bajada}</p>
          {children}
          <p className="auth__pie">{pie}</p>
        </div>
      </main>
    </div>
  );
}
