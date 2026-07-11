'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { Alerta, Campo } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [datos, setDatos] = useState({ email: '', contrasena: '' });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const set =
    (campo: keyof typeof datos) =>
    (e: ChangeEvent<HTMLInputElement>): void =>
      setDatos((d) => ({ ...d, [campo]: e.target.value }));

  async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.login(datos);
      router.push('/cuenta');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError('Email o contraseña incorrectos.');
        else if (err.status === 423)
          setError('Cuenta bloqueada temporalmente por seguridad. Probá en unos minutos.');
        else setError('No pudimos iniciar sesión. Intentá otra vez.');
      } else {
        setError('No pudimos conectar. Revisá tu conexión.');
      }
      setCargando(false);
    }
  }

  return (
    <AuthShell
      titulo="Ingresar"
      bajada="Volvé a tu cuenta de docente."
      pie={
        <>
          ¿No tenés cuenta? <Link href="/registro">Creá una</Link>
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
          value={datos.email}
          onChange={set('email')}
        />
        <Campo
          id="contrasena"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={datos.contrasena}
          onChange={set('contrasena')}
        />
        <button className="boton boton--primario boton--bloque" type="submit" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </AuthShell>
  );
}
