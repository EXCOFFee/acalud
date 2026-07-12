'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { Alerta, Campo } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

const LONGITUD_MIN = 12;

export default function RestablecerPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorContra, setErrorContra] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'));
  }, []);

  async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setErrorContra(null);
    if (!token) {
      setError('El enlace es inválido o venció. Pedí uno nuevo.');
      return;
    }
    if (contrasena.length < LONGITUD_MIN) {
      setErrorContra(`Al menos ${LONGITUD_MIN} caracteres.`);
      return;
    }
    setCargando(true);
    try {
      await api.restablecer(token, contrasena);
      setListo(true);
      setTimeout(() => router.replace('/login'), 1800);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 410)
          setError('El enlace es inválido o venció. Pedí uno nuevo desde "recuperar".');
        else if (err.status === 422)
          setErrorContra(err.problema.detail ?? 'Elegí una contraseña más segura.');
        else setError('No pudimos actualizar la contraseña. Intentá otra vez.');
      } else {
        setError('No pudimos conectar. Revisá tu conexión.');
      }
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <AuthShell
        titulo="¡Contraseña actualizada!"
        bajada="Te llevamos a ingresar…"
        pie={<Link href="/login">Ir a ingresar</Link>}
      >
        <Alerta tipo="ok">
          Cambiamos tu contraseña y cerramos las otras sesiones. Ingresá con la nueva.
        </Alerta>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo="Elegí una contraseña nueva"
      bajada="Con esto recuperás el acceso a tu cuenta."
      pie={
        <>
          ¿El enlace venció? <Link href="/recuperar">Pedí otro</Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate>
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
        <Campo
          id="contrasena"
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={LONGITUD_MIN}
          ayuda="Al menos 12 caracteres. Elegí una frase que recuerdes."
          error={errorContra ?? undefined}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        <button className="boton boton--primario boton--bloque" type="submit" disabled={cargando}>
          {cargando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthShell>
  );
}
