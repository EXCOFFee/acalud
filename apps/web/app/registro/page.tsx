'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { Alerta, Campo } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

const LONGITUD_MIN = 12;

export default function RegistroPage() {
  const [datos, setDatos] = useState({ email: '', contrasena: '', nombre: '', apellido: '' });
  const [error, setError] = useState<string | null>(null);
  const [errorContra, setErrorContra] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  const set =
    (campo: keyof typeof datos) =>
    (e: ChangeEvent<HTMLInputElement>): void =>
      setDatos((d) => ({ ...d, [campo]: e.target.value }));

  async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setErrorContra(null);
    if (datos.contrasena.length < LONGITUD_MIN) {
      setErrorContra(`Al menos ${LONGITUD_MIN} caracteres.`);
      return;
    }
    setCargando(true);
    try {
      await api.registro(datos);
      setListo(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) setErrorContra(err.problema.detail ?? 'Revisá la contraseña.');
        else if (err.status === 429) setError('Demasiados intentos. Probá de nuevo en un rato.');
        else setError('No pudimos crear la cuenta. Intentá otra vez.');
      } else {
        setError('No pudimos conectar. Revisá tu conexión.');
      }
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <AuthShell
        titulo="Revisá tu correo"
        bajada="Te enviamos un enlace para verificar la cuenta."
        pie={
          <>
            ¿Ya la verificaste? <Link href="/login">Ingresá</Link>
          </>
        }
      >
        <Alerta tipo="ok">
          Si el email es válido, vas a recibir instrucciones para activar tu cuenta de docente.
        </Alerta>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo="Crear cuenta"
      bajada="Empezá a comprar juegos y sumate a la comunidad docente."
      pie={
        <>
          ¿Ya tenés cuenta? <Link href="/login">Ingresá</Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate>
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
          <Campo
            id="nombre"
            etiqueta="Nombre"
            autoComplete="given-name"
            required
            value={datos.nombre}
            onChange={set('nombre')}
          />
          <Campo
            id="apellido"
            etiqueta="Apellido"
            autoComplete="family-name"
            required
            value={datos.apellido}
            onChange={set('apellido')}
          />
        </div>
        <Campo
          id="email"
          etiqueta="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="vos@escuela.edu.ar"
          value={datos.email}
          onChange={set('email')}
        />
        <Campo
          id="contrasena"
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={LONGITUD_MIN}
          ayuda="Al menos 12 caracteres. Elegí una frase que recuerdes."
          error={errorContra ?? undefined}
          value={datos.contrasena}
          onChange={set('contrasena')}
        />
        <button className="boton boton--primario boton--bloque" type="submit" disabled={cargando}>
          {cargando ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  );
}
