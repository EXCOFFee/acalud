import { ProductoAdminNoEncontrado } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { DemoAdmin } from '../domain/demo-admin';

export interface AsignarDemoInput {
  productId: string;
  configJson: Record<string, unknown>;
  adminId: string;
}

/** CU-19 A8.3-A8.10: asigna (crea o actualiza) la demo de un producto. */
export class AsignarDemo {
  constructor(private readonly uow: UnidadDeTrabajoCatalogoAdmin) {}

  async ejecutar(input: AsignarDemoInput): Promise<DemoAdmin> {
    return this.uow.transaccion(async (repos) => {
      const existe = await repos.productos.existeProducto(input.productId);
      if (!existe) throw new ProductoAdminNoEncontrado();

      const demo = await repos.demos.upsert(input.productId, input.configJson);

      // A8.9: no distingue alta de edición en el log; ambas son "asignar demo".
      await repos.auditoria.registrar({
        tipo: 'update',
        sujetoTipo: 'demo',
        sujetoId: demo.id,
        actorId: input.adminId,
        datos: { product_id: input.productId },
      });

      return demo;
    });
  }
}
