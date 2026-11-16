import { JuegoNoEncontrado } from '../domain/errores';
import type { JuegoDetalle } from '../domain/juego';
import type { CatalogoRepository } from '../domain/ports/catalogo.repository';
import type { RecursosAutorizacionPort } from '../domain/ports/recursos-autorizacion.port';

/**
 * CU-006 · Ver ficha de un juego publicado. Juego inexistente/no publicado → 404.
 *
 * CU-09: `recursos[].desbloqueado` depende de quién mira. El repositorio solo marca los libres;
 * si hay sesión y el usuario tiene derecho al juego (compra pagada o licencia institucional
 * asignada), se desbloquean también los licenciados. El derecho se resuelve con el MISMO puerto
 * que usa `DescargarRecurso`, para que la ficha y la descarga nunca discrepen.
 */
export class VerJuego {
  constructor(
    private readonly repo: CatalogoRepository,
    private readonly autorizacion: RecursosAutorizacionPort,
  ) {}

  async ejecutar(id: string, usuarioId: string | null = null): Promise<JuegoDetalle> {
    const juego = await this.repo.verPublicado(id);
    if (juego === null) throw new JuegoNoEncontrado();

    const hayBloqueados = juego.recursos.some((r) => !r.desbloqueado);
    // Una sola verificación por ficha: todos los recursos son del mismo juego (sin N+1). Sin
    // sesión o sin nada bloqueado, ni se consulta.
    if (usuarioId === null || !hayBloqueados) return juego;
    if (!(await this.autorizacion.tieneDerechoAlJuego(usuarioId, juego.id))) return juego;

    return { ...juego, recursos: juego.recursos.map((r) => ({ ...r, desbloqueado: true })) };
  }
}
