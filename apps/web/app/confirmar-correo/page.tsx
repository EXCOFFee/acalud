'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { Alerta } from '@/components/ui';
import { api } from '@/lib/api';

/** CU-34 (pasos 14-25): confirma el testigo enviado al correo nuevo (link de `cambio_email_verificacion`). */
export default function ConfirmarCorreoPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<'confirmando' | 'ok' | 'error'>('confirmando');
  const corrido = useRef(false);

  useEffect(() => {
    if (corrido.current) return; // el token es de un solo uso: evita la doble ejecución
    corrido.current = true;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setEstado('error');
      return;
    }
    api
      .confirmarCambioCorreo(token)
      .then(() => {
        setEstado('ok');
        setTimeout(() => router.replace('/cuenta'), 1800);
      })
      .catch(() => setEstado('error'));
  }, [router]);

  return (
    <AuthShell
      titulo={estado === 'ok' ? '¡Correo actualizado!' : 'Confirmando tu nuevo correo'}
      bajada={estado === 'ok' ? 'Te llevamos a tu cuenta…' : 'Un momento.'}
      pie={<Link href="/cuenta">Ir a mi cuenta</Link>}
    >
      {estado === 'confirmando' ? (
        <p style={{ color: 'var(--tinta-suave)' }}>Validando el enlace…</p>
      ) : null}
      {estado === 'ok' ? (
        <Alerta tipo="ok">A partir de ahora, usá este correo para iniciar sesión.</Alerta>
      ) : null}
      {estado === 'error' ? (
        <Alerta tipo="error">
          El enlace es inválido o venció. Pedí un nuevo cambio de correo desde{' '}
          <Link href="/cuenta">tu cuenta</Link>.
        </Alerta>
      ) : null}
    </AuthShell>
  );
}
