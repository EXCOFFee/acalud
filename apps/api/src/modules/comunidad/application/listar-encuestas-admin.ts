import { EncuestaAdminNoEncontrada } from '../domain/errores';
import type { UnidadDeTrabajoComunidadAdmin } from '../domain/ports/comunidad-admin.uow';
import type { EncuestaAdmin, EncuestaAdminResumen } from '../domain/encuesta-admin';

/** CU-20 p4: listado admin con estado, fecha de creación y total de votos. */
export class ListarEncuestasAdmin {
  constructor(private readonly uow: UnidadDeTrabajoComunidadAdmin) {}

  async ejecutar(): Promise<EncuestaAdminResumen[]> {
    return this.uow.transaccion((repos) => repos.encuestas.listar());
  }

  /** CU-20 A2: detalle completo (pregunta, nivel, opciones), para precargar el form de edición. */
  async detalle(id: string): Promise<EncuestaAdmin> {
    return this.uow.transaccion(async (repos) => {
      const encuesta = await repos.encuestas.obtener(id);
      if (encuesta === null) throw new EncuestaAdminNoEncontrada();
      return encuesta;
    });
  }
}
