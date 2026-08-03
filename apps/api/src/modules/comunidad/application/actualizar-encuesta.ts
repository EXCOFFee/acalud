import { EncuestaActivaNoEditable, EncuestaAdminNoEncontrada, NivelEducativoInvalido } from '../domain/errores';
import type { UnidadDeTrabajoComunidadAdmin } from '../domain/ports/comunidad-admin.uow';
import type { DatosEncuesta, EncuestaAdmin } from '../domain/encuesta-admin';

export interface ActualizarEncuestaInput extends DatosEncuesta {
  adminId: string;
}

/** CU-20 A2: edición de encuesta existente. RN-005: sólo si está inactiva (no `active`). */
export class ActualizarEncuesta {
  constructor(private readonly uow: UnidadDeTrabajoComunidadAdmin) {}

  async ejecutar(id: string, input: ActualizarEncuestaInput): Promise<EncuestaAdmin> {
    return this.uow.transaccion(async (repos) => {
      const actual = await repos.encuestas.obtener(id);
      if (actual === null) throw new EncuestaAdminNoEncontrada();
      if (actual.status === 'active') throw new EncuestaActivaNoEditable(); // A2.2/A2.3

      if (input.targetLevelId !== null) {
        const existe = await repos.encuestas.existeNivel(input.targetLevelId);
        if (!existe) throw new NivelEducativoInvalido();
      }

      const encuesta = await repos.encuestas.actualizar(id, input);
      if (encuesta === null) throw new EncuestaAdminNoEncontrada();

      await repos.auditoria.registrar({
        tipo: 'update',
        sujetoTipo: 'poll',
        sujetoId: encuesta.id,
        actorId: input.adminId,
        datos: { question: encuesta.question, opciones: encuesta.opciones.length },
      });

      return encuesta;
    });
  }
}
