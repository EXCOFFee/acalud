import { ProductoRelacionadoInvalido } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { DatosRecurso, RecursoAdmin } from '../domain/recurso-admin';

export interface CrearRecursoInput extends DatosRecurso {
  adminId: string;
}

/** CU-19 A9.4-A9.9: alta de recurso. */
export class CrearRecurso {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(input: CrearRecursoInput): Promise<RecursoAdmin> {
    return this.uow.transaccion(async (repos) => {
      if (input.productId !== null) {
        const existe = await repos.productos.existeProducto(input.productId);
        if (!existe) throw new ProductoRelacionadoInvalido();
      }

      const recurso = await repos.recursos.crear(input);

      await repos.auditoria.registrar({
        tipo: 'create',
        sujetoTipo: 'resource',
        sujetoId: recurso.id,
        actorId: input.adminId,
        datos: { title: recurso.title, type: recurso.type },
      });

      return recurso;
    });
  }
}
