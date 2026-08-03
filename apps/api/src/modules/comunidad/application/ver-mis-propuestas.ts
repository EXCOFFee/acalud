import type { UnidadDeTrabajoPropuestas } from '../domain/ports/propuestas.uow';
import type { PropuestaResumen } from '../domain/propuesta';

/** CU-15 p2 / RN-004: el docente ve el estado de sus propuestas enviadas. */
export class VerMisPropuestas {
  constructor(private readonly uow: UnidadDeTrabajoPropuestas) {}

  async ejecutar(userId: string): Promise<PropuestaResumen[]> {
    return this.uow.transaccion((repos) => repos.propuestas.listarPropias(userId));
  }
}
