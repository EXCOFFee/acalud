import { NivelEducativoInvalido } from '../domain/errores';
import type { UnidadDeTrabajoComunidadAdmin } from '../domain/ports/comunidad-admin.uow';
import type { DatosEncuesta, EncuestaAdmin } from '../domain/encuesta-admin';

export interface CrearEncuestaInput extends DatosEncuesta {
  adminId: string;
}

/** CU-20 p6-p20: alta de encuesta (arranca en `draft`, RN-004). */
export class CrearEncuesta {
  constructor(private readonly uow: UnidadDeTrabajoComunidadAdmin) {}

  async ejecutar(input: CrearEncuestaInput): Promise<EncuestaAdmin> {
    return this.uow.transaccion(async (repos) => {
      if (input.targetLevelId !== null) {
        const existe = await repos.encuestas.existeNivel(input.targetLevelId);
        if (!existe) throw new NivelEducativoInvalido();
      }

      const encuesta = await repos.encuestas.crear(input);

      await repos.auditoria.registrar({
        tipo: 'create',
        sujetoTipo: 'poll',
        sujetoId: encuesta.id,
        actorId: input.adminId,
        datos: { question: encuesta.question, opciones: encuesta.opciones.length },
      });

      return encuesta;
    });
  }
}
