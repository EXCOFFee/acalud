import { ProductoRelacionadoInvalido, RecursoAdminNoEncontrado } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { DatosRecurso, RecursoAdmin } from '../domain/recurso-admin';

export interface ActualizarRecursoInput extends DatosRecurso {
  adminId: string;
}

/** CU-19 A9.3: edición de recurso existente. */
export class ActualizarRecurso {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(id: string, input: ActualizarRecursoInput): Promise<RecursoAdmin> {
    return this.uow.transaccion(async (repos) => {
      if (input.productId !== null) {
        const existe = await repos.productos.existeProducto(input.productId);
        if (!existe) throw new ProductoRelacionadoInvalido();
      }

      const recurso = await repos.recursos.actualizar(id, input);
      if (recurso === null) throw new RecursoAdminNoEncontrado();

      await repos.auditoria.registrar({
        tipo: 'update',
        sujetoTipo: 'resource',
        sujetoId: recurso.id,
        actorId: input.adminId,
        datos: { title: recurso.title, type: recurso.type },
      });

      return recurso;
    });
  }
}
