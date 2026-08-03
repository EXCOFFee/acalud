import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string | undefined;
}

export function Campo({ id, etiqueta, error, ayuda, ...rest }: CampoProps) {
  const idError = error ? `${id}-error` : undefined;
  const idAyuda = ayuda && !error ? `${id}-ayuda` : undefined;
  const descrito = [idError, idAyuda].filter(Boolean).join(' ');

  return (
    <div className="campo">
      <label className="campo__label" htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        className="campo__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={descrito || undefined}
        {...rest}
      />
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
