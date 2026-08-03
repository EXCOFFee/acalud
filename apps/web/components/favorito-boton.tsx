'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

type TipoFavoritable = 'producto' | 'recurso' | 'editorial';

const CAMPO: Record<TipoFavoritable, 'producto_id' | 'recurso_id' | 'editorial_id'> = {
  producto: 'producto_id',
  recurso: 'recurso_id',
  editorial: 'editorial_id',
};

interface BotonFavoritoProps {
  tipo: TipoFavoritable;
  itemId: string;
  /** `null` = no guardado. El padre resuelve este valor a partir de `api.misFavoritos()`. */
  favoritoId: string | null;
  onCambio: (favoritoId: string | null) => void;
}

/**
 * CU-18 · Toggle de favorito (RN-004/RN-005: el ícono refleja el estado y alterna guardar/quitar
 * con el mismo botón). RN-008: requiere sesión — sin ella, redirige a login preservando la
 * página actual (A1/A6) en vez de intentar la operación.
 */
export function BotonFavorito({ tipo, itemId, favoritoId, onCambio }: BotonFavoritoProps) {
  const router = useRouter();
  const { notificar } = useToast();
  const [ocupado, setOcupado] = useState(false);

  async function alHacerClic(): Promise<void> {
    setOcupado(true);
    try {
      if (favoritoId === null) {
        const r = await api.guardarFavorito(CAMPO[tipo], itemId);
        onCambio(r.id);
        notificar('¡Guardado en favoritos!', 'ok');
      } else {
        await api.quitarFavorito(favoritoId);
        onCambio(null);
        notificar('Favorito eliminado.', 'ok');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/login?volver=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        notificar('Este elemento ya está en tus favoritos.', 'info');
      } else {
        notificar('No pudimos actualizar tus favoritos. Probá de nuevo.', 'error');
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button
      type="button"
      className="favorito-boton"
      onClick={alHacerClic}
      disabled={ocupado}
      aria-pressed={favoritoId !== null}
      aria-label={favoritoId !== null ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      title={favoritoId !== null ? 'Quitar de favoritos' : 'Guardar en favoritos'}
    >
      {favoritoId !== null ? '★' : '☆'}
    </button>
  );
}
