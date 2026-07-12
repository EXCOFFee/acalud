'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { Alerta, Campo } from '@/components/ui';
import { api } from '@/lib/api';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.recuperar(email);
      setListo(true); // respuesta idéntica exista o no el email (anti-enumeración)
    } catch {
      setError('No pudimos conectar. Revisá tu conexión.');
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <AuthShell
        titulo="Revisá tu correo"
        bajada="Si el email está registrado, te enviamos instrucciones."
        pie={<Link href="/login">Volver a ingresar</Link>}
      >
        <Alerta tipo="ok">
          Te enviamos un enlace para elegir una contraseña nueva. Vence en 30 minutos.
        </Alerta>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo="Recuperar contraseña"
      bajada="Te enviamos un enlace para volver a entrar."
      pie={
        <>
          ¿La recordaste? <Link href="/login">Ingresá</Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate>
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
        <Campo
          id="email"
          etiqueta="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="vos@escuela.edu.ar"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
        <button className="boton boton--primario boton--bloque" type="submit" disabled={cargando}>
          {cargando ? 'Enviando…' : 'Enviar instrucciones'}
        </button>
      </form>
    </AuthShell>
  );
}
