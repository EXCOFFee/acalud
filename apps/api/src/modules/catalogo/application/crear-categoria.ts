import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { CategoriaAdmin } from '../domain/categoria-admin';

export interface CrearCategoriaInput {
  nombre: string;
  adminId: string;
}

/** CU-19 A7.4-A7.8: alta de categoría. */
export class CrearCategoria {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(input: CrearCategoriaInput): Promise<CategoriaAdmin> {
    return this.uow.transaccion(async (repos) => {
      const categoria = await repos.categorias.crear(input.nombre);

      await repos.auditoria.registrar({
        tipo: 'create',
        sujetoTipo: 'category',
        sujetoId: categoria.id,
        actorId: input.adminId,
        datos: { name: categoria.name },
      });

      return categoria;
    });
  }
}
