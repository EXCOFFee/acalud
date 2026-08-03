import type { UnidadDeTrabajoPropuestas } from '../domain/ports/propuestas.uow';
import type { FiltroPropuestasAdmin, PropuestaResumenAdmin } from '../domain/propuesta';

/** CU-21 p4-p8 / A7/A8/A9: listado admin con filtro por estado, búsqueda y orden por fecha. */
export class ListarPropuestasAdmin {
  constructor(private readonly uow: UnidadDeTrabajoPropuestas) {}

  async ejecutar(filtro: FiltroPropuestasAdmin): Promise<PropuestaResumenAdmin[]> {
    return this.uow.transaccion((repos) => repos.propuestas.listarAdmin(filtro));
  }
}
