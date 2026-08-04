import { ProductoRelacionadoInvalido, RecursoAdminNoEncontrado } from '../domain/errores';
import type { UnidadDeTrabajoCatalogoAdmin } from '../domain/ports/catalogo-admin.uow';
import type { DatosRecurso, RecursoAdmin } from '../domain/recurso-admin';
import type { StorageProvider } from '../../../platform/storage/storage-provider.port';

const BUCKET_RECURSOS = 'recursos';

export interface ActualizarRecursoInput extends DatosRecurso {
  adminId: string;
}

/** CU-19 A9.3: edición de recurso existente. */
export class ActualizarRecurso {
  constructor(
    private readonly uow: UnidadDeTrabajoCatalogoAdmin,
    private readonly storage: StorageProvider,
  ) {}

  async ejecutar(id: string, input: ActualizarRecursoInput): Promise<RecursoAdmin> {
    const { recurso, pdfAnterior } = await this.uow.transaccion(async (repos) => {
      if (input.productId !== null) {
        const existe = await repos.productos.existeProducto(input.productId);
        if (!existe) throw new ProductoRelacionadoInvalido();
      }

      const anterior = await repos.recursos.buscarPorId(id);
      const actualizado = await repos.recursos.actualizar(id, input);
      if (actualizado === null) throw new RecursoAdminNoEncontrado();

      await repos.auditoria.registrar({
        tipo: 'update',
        sujetoTipo: 'resource',
        sujetoId: actualizado.id,
        actorId: input.adminId,
        datos: { title: actualizado.title, type: actualizado.type },
      });

      // Solo si el recurso YA era 'pdf': para ese tipo `url` siempre es un path de nuestro
      // bucket (nunca una URL externa pegada a mano, a diferencia de 'link') — ver
      // descargar-recurso.ts, que trata `url` como path incondicionalmente cuando type='pdf'.
      const pdfPrevio = anterior && anterior.type === 'pdf' ? anterior.url : null;
      return { recurso: actualizado, pdfAnterior: pdfPrevio };
    });

    if (pdfAnterior && pdfAnterior !== recurso.url) {
      void this.storage.eliminarArchivo(BUCKET_RECURSOS, pdfAnterior).catch(() => undefined);
    }

    return recurso;
  }
}
