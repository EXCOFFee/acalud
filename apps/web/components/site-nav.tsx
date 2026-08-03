'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Boton, Dialogo } from '@/components/ui';
import { api } from '@/lib/api';

/**
 * Barra superior de toda la app (páginas públicas y autenticadas). Sabe si hay sesión iniciada
 * (CU-002/CU-004 vía `GET /me`) para mostrar "Cerrar sesión" en vez de "Ingresar" — CU-003
 * RN-001: el logout tiene que poder hacerse desde cualquier página donde el usuario esté logueado.
 */
export function SiteNav() {
  const router = useRouter();
  const [logueado, setLogueado] = useState<boolean | null>(null); // null = todavía no se sabe
  const [confirmando, setConfirmando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    let vivo = true;
    api
      .me()
      .then(() => vivo && setLogueado(true))
      .catch(() => vivo && setLogueado(false));
    return () => {
      vivo = false;
    };
  }, []);

  async function confirmarSalida(): Promise<void> {
    setSaliendo(true);
    try {
      await api.logout(); // A2/A4: si el backend falla, igual se completa el logout local
    } finally {
      setConfirmando(false);
      setSaliendo(false);
      router.push('/'); // RN-006: siempre a home, nunca deja al usuario en una página autenticada
    }
  }

  return (
    <>
      <header className="nav">
        <Link className="marca" href="/" style={{ textDecoration: 'none' }}>
          <span className="marca__ficha" aria-hidden="true" />
          Acalud
        </Link>
        <div className="nav__acciones">
          <Link className="boton boton--fantasma" href="/catalogo">
            Catálogo
          </Link>
          <Link className="boton boton--fantasma" href="/editoriales">
            Editoriales
          </Link>
          <Link className="boton boton--fantasma" href="/encuestas">
            Encuestas
          </Link>
          <Link className="boton boton--fantasma" href="/propuestas">
            Proponer un juego
          </Link>
          <Link className="boton boton--fantasma" href="/carrito">
            Carrito
          </Link>
          {logueado ? (
            <>
              <Link className="boton boton--fantasma" href="/cuenta">
                Mi cuenta
              </Link>
              <Boton variante="primario" onClick={() => setConfirmando(true)}>
                Cerrar sesión
              </Boton>
            </>
          ) : logueado === false ? (
            <Boton variante="primario" href="/login">
              Ingresar
            </Boton>
          ) : null}
        </div>
      </header>

      <Dialogo
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
        titulo="¿Cerrar sesión?"
        acciones={
          <>
            <Boton variante="fantasma" onClick={() => setConfirmando(false)} disabled={saliendo}>
              No, cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarSalida} cargando={saliendo}>
              Sí, cerrar sesión
            </Boton>
          </>
        }
      >
        <p>Vas a salir de tu cuenta en este dispositivo.</p>
      </Dialogo>
    </>
  );
}

const EMOJI_AREA: Record<string, string> = {
  Matemática: '🔢',
  Lengua: '📖',
  'Ciencias Naturales': '🔬',
  'Ciencias Sociales': '🗺️',
  Programación: '🤖',
};

/** Emoji representativo del área (placeholder visual mientras no hay imágenes cargadas). */
export function emojiArea(area: string | null): string {
  return (area && EMOJI_AREA[area]) || '🎲';
}

/** Precio en pesos argentinos, sin centavos. */
export function precioARS(valor: number): string {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}
