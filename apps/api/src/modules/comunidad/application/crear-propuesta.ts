import { MateriaInvalida, NivelEducativoInvalido, PropuestaDuplicada } from '../domain/errores';
import type { UnidadDeTrabajoPropuestas } from '../domain/ports/propuestas.uow';
import type { DatosPropuesta, Propuesta } from '../domain/propuesta';

export interface CrearPropuestaInput extends DatosPropuesta {
  userId: string;
  autorNombre: string;
}

/** CU-15 · Enviar Propuesta de Juego (flujo principal + A3/A8; RN-005 notifica al equipo editorial). */
export class CrearPropuesta {
  constructor(private readonly uow: UnidadDeTrabajoPropuestas) {}

  async ejecutar(input: CrearPropuestaInput): Promise<Propuesta> {
    return this.uow.transaccion(async (repos) => {
      if (input.subjectId !== null) {
        const existe = await repos.propuestas.existeMateria(input.subjectId);
        if (!existe) throw new MateriaInvalida(); // A8
      }
      if (input.targetLevelId !== null) {
        const existe = await repos.propuestas.existeNivel(input.targetLevelId);
        if (!existe) throw new NivelEducativoInvalido();
      }

      // A3 / RN-006 / D-51: heurística simple (mismo usuario + mismo título en 24 h).
      const duplicada = await repos.propuestas.existeDuplicadaReciente(input.userId, input.title);
      if (duplicada) throw new PropuestaDuplicada();

      const propuesta = await repos.propuestas.crear(input.userId, input);

      await repos.auditoria.registrar({
        tipo: 'create',
        sujetoTipo: 'proposal',
        sujetoId: propuesta.id,
        actorId: input.userId,
        datos: { title: propuesta.title },
      });

      // RN-005: el equipo editorial son los usuarios admin, notificados por tablero y email.
      const admins = await repos.propuestas.listarAdministradores();
      for (const admin of admins) {
        await repos.notificaciones.crear({
          destinatarioId: admin.id,
          tipo: 'nueva_propuesta',
          titulo: 'Nueva propuesta de juego',
          mensaje: `${input.autorNombre} envió una propuesta: "${propuesta.title}".`,
          entidadTipo: 'proposal',
          entidadId: propuesta.id,
        });
        await repos.outbox.encolar({
          tipo: 'propuesta-recibida',
          destinatario: admin.email,
          payload: { docente: input.autorNombre, titulo: propuesta.title },
        });
      }

      return propuesta;
    });
  }
}
