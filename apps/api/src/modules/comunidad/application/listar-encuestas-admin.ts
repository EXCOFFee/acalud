import type { UnidadDeTrabajoComunidadAdmin } from '../domain/ports/comunidad-admin.uow';
import type { EncuestaAdminResumen } from '../domain/encuesta-admin';

/** CU-20 p4: listado admin con estado, fecha de creación y total de votos. */
export class ListarEncuestasAdmin {
  constructor(private readonly uow: UnidadDeTrabajoComunidadAdmin) {}

  async ejecutar(): Promise<EncuestaAdminResumen[]> {
    return this.uow.transaccion((repos) => repos.encuestas.listar());
  }
}
