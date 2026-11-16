import { EncuestaAdminNoEncontrada, EncuestaConVotos, EncuestaFinalizada } from '../domain/errores';
import type { UnidadDeTrabajoComunidadAdmin } from '../domain/ports/comunidad-admin.uow';
import type { EncuestaAdmin } from '../domain/encuesta-admin';

/** CU-20 A1: activa o desactiva (toggle draft↔active). */
export class AlternarEstadoEncuesta {
  constructor(private readonly uow: UnidadDeTrabajoComunidadAdmin) {}

  async ejecutar(id: string, adminId: string): Promise<EncuestaAdmin> {
    return this.uow.transaccion(async (repos) => {
      // D4: una activa con votos no vuelve a borrador (ahí podría editarse y perder los votos).
      const actual = await repos.encuestas.obtener(id);
      if (actual === null) throw new EncuestaAdminNoEncontrada();
      // D3: finalizar es definitivo — antes el toggle sobre una 'closed' respondía 200 sin hacer nada.
      if (actual.status === 'closed') throw new EncuestaFinalizada();
      if (actual.status === 'active' && (await repos.encuestas.contarVotos(id)) > 0) {
        throw new EncuestaConVotos();
      }

      const encuesta = await repos.encuestas.alternarEstado(id);
      if (encuesta === null) throw new EncuestaAdminNoEncontrada();

      await repos.auditoria.registrar({
        tipo: encuesta.status === 'active' ? 'activate' : 'deactivate',
        sujetoTipo: 'poll',
        sujetoId: encuesta.id,
        actorId: adminId,
      });

      return encuesta;
    });
  }
}
