'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta } from '@/components/ui';
import { api, ApiError, type PerfilPropio } from '@/lib/api';

export default function CuentaPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');

  useEffect(() => {
    let vivo = true;
    api
      .me()
      .then((p) => {
        if (!vivo) return;
        setPerfil(p);
        setEstado('listo');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
        else if (vivo) setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [router]);

  async function salir(): Promise<void> {
    try {
      await api.logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <>
      <header className="nav">
        <Link href="/" className="marca">
          <span className="marca__ficha" aria-hidden="true" />
          Acalud
        </Link>
        <div className="nav__acciones">
          <button className="boton boton--fantasma" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="contenedor">
        {estado === 'cargando' ? (
          <p style={{ color: 'var(--tinta-suave)' }}>Cargando tu cuenta…</p>
        ) : null}

        {estado === 'error' ? (
          <Alerta tipo="error">
            No pudimos cargar tu cuenta. <Link href="/login">Volvé a ingresar</Link>.
          </Alerta>
        ) : null}

        {estado === 'listo' && perfil ? (
          <>
            <p className="eyebrow">Tu cuenta</p>
            <h1 style={{ fontSize: '2.2rem', margin: '0.2rem 0 1.4rem' }}>Hola, {perfil.nombre}</h1>
            {perfil.capacidades_limitadas ? (
              <Alerta tipo="aviso">
                Verificá tu email para habilitar compras y recursos licenciados.
              </Alerta>
            ) : null}
            <div className="tarjeta">
              <div className="dato">
                <span className="dato__k">Nombre</span>
                <span className="dato__v">
                  {perfil.nombre} {perfil.apellido}
                </span>
              </div>
              <div className="dato">
                <span className="dato__k">Email</span>
                <span className="dato__v">{perfil.email}</span>
              </div>
              <div className="dato">
                <span className="dato__k">Estado</span>
                <span className="dato__v">
                  {perfil.estado === 'verificada' ? 'Verificada' : 'Sin verificar'}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
