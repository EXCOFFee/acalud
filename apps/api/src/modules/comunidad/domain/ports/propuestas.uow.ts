import type { PropuestasRepository } from './propuestas.repository';

/** Notificación en tablero (D-38: "email o dashboard"). El email va aparte, por el outbox. */
export interface NotificacionesComunidad {
  crear(notificacion: {
    destinatarioId: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    entidadTipo: string;
    entidadId: string;
  }): Promise<void>;
}

/** Cola de emails (RF-CU12-006/D-38): el envío no bloquea la transacción que lo origina. */
export interface OutboxComunidad {
  encolar(email: { tipo: string; destinatario: string; payload: Record<string, unknown> }): Promise<void>;
}

/** Auditoría propia del BC (RNF-002, CU-20/CU-21). Cada contexto declara la suya: ADR-002. */
export interface AuditoriaComunidadEventos {
  registrar(evento: {
    tipo: string;
    sujetoTipo: 'proposal';
    sujetoId: string;
    actorId: string;
    datos?: Record<string, unknown>;
  }): Promise<void>;
}

export interface ReposPropuestas {
  propuestas: PropuestasRepository;
  notificaciones: NotificacionesComunidad;
  outbox: OutboxComunidad;
  auditoria: AuditoriaComunidadEventos;
}

/** Unit of Work de propuestas: commit total o rollback total (ADR-002). */
export interface UnidadDeTrabajoPropuestas {
  transaccion<T>(fn: (repos: ReposPropuestas) => Promise<T>): Promise<T>;
}

export const UOW_PROPUESTAS = Symbol('UnidadDeTrabajoPropuestas');
