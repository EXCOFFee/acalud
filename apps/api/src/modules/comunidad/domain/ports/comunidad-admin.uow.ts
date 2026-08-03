import type { EncuestasAdminRepository } from './encuestas-admin.repository';

/** Auditoría propia del BC (RN-007/RNF-002, CU-20). Cada contexto declara la suya: ADR-002. */
export interface AuditoriaComunidad {
  registrar(evento: {
    tipo: 'create' | 'update' | 'activate' | 'deactivate' | 'delete';
    sujetoTipo: 'poll';
    sujetoId: string;
    actorId: string;
    datos?: Record<string, unknown>;
  }): Promise<void>;
}

export interface ReposComunidadAdmin {
  encuestas: EncuestasAdminRepository;
  auditoria: AuditoriaComunidad;
}

/** Unit of Work del ABM de comunidad: commit total o rollback total (ADR-002). */
export interface UnidadDeTrabajoComunidadAdmin {
  transaccion<T>(fn: (repos: ReposComunidadAdmin) => Promise<T>): Promise<T>;
}

export const UOW_COMUNIDAD_ADMIN = Symbol('UnidadDeTrabajoComunidadAdmin');
