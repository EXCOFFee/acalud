import { EncuestaAdminNoEncontrada } from '../domain/errores';
import type { UnidadDeTrabajoComunidadAdmin } from '../domain/ports/comunidad-admin.uow';

/** CU-20 A3: baja de encuesta. Física, con cascada a opciones y respuestas (RN-006). */
export class EliminarEncuesta {
  constructor(private readonly uow: UnidadDeTrabajoComunidadAdmin) {}

  async ejecutar(id: string, adminId: string): Promise<void> {
    return this.uow.transaccion(async (repos) => {
      const eliminada = await repos.encuestas.eliminar(id);
      if (!eliminada) throw new EncuestaAdminNoEncontrada();

      await repos.auditoria.registrar({
        tipo: 'delete',
        sujetoTipo: 'poll',
        sujetoId: id,
        actorId: adminId,
      });
    });
  }
}
