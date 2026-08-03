import { EncuestaAdminNoEncontrada } from '../domain/errores';
import type { UnidadDeTrabajoComunidadAdmin } from '../domain/ports/comunidad-admin.uow';
import type { EncuestaAdmin } from '../domain/encuesta-admin';

/** CU-20 A1: activa o desactiva (toggle draft↔active). */
export class AlternarEstadoEncuesta {
  constructor(private readonly uow: UnidadDeTrabajoComunidadAdmin) {}

  async ejecutar(id: string, adminId: string): Promise<EncuestaAdmin> {
    return this.uow.transaccion(async (repos) => {
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
