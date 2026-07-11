import type { CuentaRepository } from './cuenta.repository';
import type { SesionRepository } from './sesion.repository';

export interface EmailEncolado {
  tipo: string;
  destinatario: string;
  payload: Record<string, unknown>;
}
export interface OutboxPort {
  // El adapter genera el `email_id` (idempotencia del worker, CU-E05).
  encolar(email: EmailEncolado): Promise<void>;
}

export interface EventoAuditoria {
  tipo: string;
  sujetoTipo: string;
  sujetoId: string | null;
  actorId?: string | null;
  datos?: Record<string, unknown>;
  ip?: string | null;
}
export interface AuditoriaPort {
  registrar(evento: EventoAuditoria): Promise<void>;
}

export interface TokenDeUsoNuevo {
  cuentaId: string;
  tipo: 'verificacion_email' | 'recuperacion_password' | 'cambio_email';
  tokenHash: string;
  expiraEn: Date;
  emailNuevo?: string | null;
}
export interface TokenRepository {
  crear(token: TokenDeUsoNuevo): Promise<void>;
}

/** Repositorios y puertos de escritura disponibles dentro de una transacción (UoW, ADR-002). */
export interface ReposTransaccionales {
  cuentas: CuentaRepository;
  sesiones: SesionRepository;
  tokens: TokenRepository;
  outbox: OutboxPort;
  auditoria: AuditoriaPort;
}

/**
 * Unit of Work: ejecuta `fn` dentro de una única transacción de BD (commit total o rollback
 * total). Sin esto, el registro (cuenta + token + email + evento) no sería atómico.
 */
export interface UnidadDeTrabajo {
  transaccion<T>(fn: (repos: ReposTransaccionales) => Promise<T>): Promise<T>;
}
export const UNIDAD_DE_TRABAJO = Symbol('UnidadDeTrabajo');
