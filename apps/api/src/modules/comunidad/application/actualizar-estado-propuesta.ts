import { PropuestaNoEncontrada, RevisionSinCambios, TransicionEstadoInvalida } from '../domain/errores';
import type { UnidadDeTrabajoPropuestas } from '../domain/ports/propuestas.uow';
import type { EstadoPropuesta, Propuesta } from '../domain/propuesta';

export interface ActualizarEstadoPropuestaInput {
  status: EstadoPropuesta;
  feedback: string | null;
  adminId: string;
}

const ETIQUETA_ESTADO: Record<EstadoPropuesta, string> = {
  pending: 'Pendiente de revisión',
  reviewed: 'Revisada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

/**
 * CU-21 · Revisar Propuestas de Juegos (flujo principal + A1/A2/A3; RN-008 impide volver a
 * pending desde approved/rejected). Notifica siempre al docente autor (incluso si sólo cambió
 * el feedback: A1.8 continúa hasta el paso de notificación del flujo principal).
 */
export class ActualizarEstadoPropuesta {
  constructor(private readonly uow: UnidadDeTrabajoPropuestas) {}

  async ejecutar(id: string, input: ActualizarEstadoPropuestaInput): Promise<Propuesta> {
    return this.uow.transaccion(async (repos) => {
      const actual = await repos.propuestas.obtenerAdmin(id);
      if (actual === null) throw new PropuestaNoEncontrada(); // A4

      // RN-008: una vez aprobada o rechazada, no puede volver a pendiente.
      if (input.status === 'pending' && (actual.status === 'approved' || actual.status === 'rejected')) {
        throw new TransicionEstadoInvalida();
      }

      // A3: ni el estado ni el feedback cambiaron — nada que guardar.
      const feedbackNuevo = input.feedback?.trim() || null;
      if (input.status === actual.status && feedbackNuevo === actual.adminFeedback) {
        throw new RevisionSinCambios();
      }

      const propuesta = await repos.propuestas.actualizarEstado(id, input.status, feedbackNuevo);
      if (propuesta === null) throw new PropuestaNoEncontrada();

      await repos.auditoria.registrar({
        tipo: input.status !== actual.status ? 'status_change' : 'feedback_added',
        sujetoTipo: 'proposal',
        sujetoId: propuesta.id,
        actorId: input.adminId,
        datos: { old_status: actual.status, new_status: propuesta.status },
      });

      // RN-005 (CU-21): el docente autor se entera del cambio por tablero y por email.
      await repos.notificaciones.crear({
        destinatarioId: actual.userId,
        tipo: 'propuesta_revisada',
        titulo: 'Tu propuesta fue revisada',
        mensaje: `Tu propuesta "${propuesta.title}" pasó a estado "${ETIQUETA_ESTADO[propuesta.status]}".`,
        entidadTipo: 'proposal',
        entidadId: propuesta.id,
      });
      await repos.outbox.encolar({
        tipo: 'propuesta-revisada',
        destinatario: actual.autorEmail,
        payload: {
          nombre: actual.autorNombre,
          titulo: propuesta.title,
          estado: ETIQUETA_ESTADO[propuesta.status],
          feedback: propuesta.adminFeedback ?? '',
        },
      });

      return propuesta;
    });
  }
}
