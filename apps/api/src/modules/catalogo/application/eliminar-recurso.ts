import { RecursoAdminNoEncontrado } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';

/** CU-19 A9.3: baja de recurso. Física (A9 no define baja lógica, a diferencia de RNF-008 en productos). */
export class EliminarRecurso {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(id: string, adminId: string): Promise<void> {
    return this.uow.transaccion(async (repos) => {
      const eliminado = await repos.recursos.eliminar(id);
      if (!eliminado) throw new RecursoAdminNoEncontrado();

      await repos.auditoria.registrar({
        tipo: 'delete',
        sujetoTipo: 'resource',
        sujetoId: id,
        actorId: adminId,
      });
    });
  }
}
