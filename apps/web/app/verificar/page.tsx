'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { Alerta } from '@/components/ui';
import { api } from '@/lib/api';

export default function VerificarPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<'verificando' | 'ok' | 'error'>('verificando');
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
      .verificar(token)
      .then(() => {
        setEstado('ok');
        setTimeout(() => router.replace('/cuenta'), 1500);
      })
      .catch(() => setEstado('error'));
  }, [router]);

  return (
    <AuthShell
      titulo={estado === 'ok' ? '¡Cuenta verificada!' : 'Verificando tu cuenta'}
      bajada={estado === 'ok' ? 'Te llevamos a tu cuenta…' : 'Un momento.'}
      pie={<Link href="/login">Ir a ingresar</Link>}
    >
      {estado === 'verificando' ? (
        <p style={{ color: 'var(--tinta-suave)' }}>Validando el enlace…</p>
      ) : null}
      {estado === 'ok' ? (
        <Alerta tipo="ok">Tu cuenta quedó activada. Ya podés comprar juegos y acceder a todo.</Alerta>
      ) : null}
      {estado === 'error' ? (
        <Alerta tipo="error">
          El enlace es inválido o venció. Pedí uno nuevo desde <Link href="/login">ingresar</Link>.
        </Alerta>
      ) : null}
    </AuthShell>
  );
}
