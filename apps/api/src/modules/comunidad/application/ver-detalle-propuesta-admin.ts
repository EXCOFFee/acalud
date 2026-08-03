import { PropuestaNoEncontrada } from '../domain/errores';
import type { UnidadDeTrabajoPropuestas } from '../domain/ports/propuestas.uow';
import type { PropuestaDetalleAdmin } from '../domain/propuesta';

/** CU-21 p9-p13. */
export class VerDetallePropuestaAdmin {
  constructor(private readonly uow: UnidadDeTrabajoPropuestas) {}

  async ejecutar(id: string): Promise<PropuestaDetalleAdmin> {
    const propuesta = await this.uow.transaccion((repos) => repos.propuestas.obtenerAdmin(id));
    if (propuesta === null) throw new PropuestaNoEncontrada(); // A4
    return propuesta;
  }
}
