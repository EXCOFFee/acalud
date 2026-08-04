'use client';

import { useState, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string | undefined;
}

/** Ojo abierto (visible) / tachado (oculto) — sin librería de íconos, coherente con el resto. */
function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado ? <line x1="2" y1="2" x2="22" y2="22" /> : null}
    </svg>
  );
}

export function Campo({ id, etiqueta, error, ayuda, type, ...rest }: CampoProps) {
  const [mostrar, setMostrar] = useState(false);
  const idError = error ? `${id}-error` : undefined;
  const idAyuda = ayuda && !error ? `${id}-ayuda` : undefined;
  const descrito = [idError, idAyuda].filter(Boolean).join(' ');
  const esContrasena = type === 'password';

  const input = (
    <input
      id={id}
      type={esContrasena ? (mostrar ? 'text' : 'password') : type}
      className="campo__input"
      aria-invalid={error ? true : undefined}
      aria-describedby={descrito || undefined}
      {...rest}
    />
  );

  return (
    <div className="campo">
      <label className="campo__label" htmlFor={id}>
        {etiqueta}
      </label>
      {esContrasena ? (
        <div className="campo__envoltorio-contrasena">
          {input}
          <button
            type="button"
            className="campo__alternar-contrasena"
            onClick={() => setMostrar((v) => !v)}
            aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={mostrar}
          >
            <IconoOjo tachado={!mostrar} />
          </button>
        </div>
      ) : (
        input
      )}
      {idAyuda ? (
        <span className="campo__ayuda" id={idAyuda}>
          {ayuda}
        </span>
      ) : null}
      {error ? (
        <span className="campo__error" id={idError}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

interface SelectorProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string | undefined;
}

/** Select con el mismo tratamiento de label/error/ayuda que `Campo`. */
export function Selector({ id, etiqueta, error, ayuda, children, ...rest }: SelectorProps) {
  const idError = error ? `${id}-error` : undefined;
  const idAyuda = ayuda && !error ? `${id}-ayuda` : undefined;
  const descrito = [idError, idAyuda].filter(Boolean).join(' ');

  return (
    <div className="campo">
      <label className="campo__label" htmlFor={id}>
        {etiqueta}
      </label>
      <select
        id={id}
        className="campo__select"
        aria-invalid={error ? true : undefined}
        aria-describedby={descrito || undefined}
        {...rest}
      >
        {children}
      </select>
      {idAyuda ? (
        <span className="campo__ayuda" id={idAyuda}>
          {ayuda}
        </span>
      ) : null}
      {error ? (
        <span className="campo__error" id={idError}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
