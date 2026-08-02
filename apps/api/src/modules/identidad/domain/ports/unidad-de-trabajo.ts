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
  sujetoId: string; // audit_log.entity_id es NOT NULL: todo evento apunta a una entidad
  actorId?: string | null;
  datos?: Record<string, unknown>;
  ip?: string | null;
}
export interface AuditoriaPort {
  registrar(evento: EventoAuditoria): Promise<void>;
}

export type TipoTokenDeUso = 'verificacion_email' | 'recuperacion_password' | 'cambio_email';

export interface TokenDeUsoNuevo {
  cuentaId: string;
  tipo: TipoTokenDeUso;
  tokenHash: string;
  expiraEn: Date;
  emailNuevo?: string | null;
}

export interface TokenVigente {
  id: string;
  cuentaId: string;
}

export interface TokenRepository {
  crear(token: TokenDeUsoNuevo): Promise<void>;
  /** Busca un token no usado y no vencido por su hash y tipo (CU-E02). */
  buscarVigentePorHash(
    tokenHash: string,
    tipo: TipoTokenDeUso,
    ahora: Date,
  ): Promise<TokenVigente | null>;
  marcarUsado(id: string): Promise<void>;
  /** Invalida los tokens vigentes de un tipo para una cuenta (CU-E01: al emitir uno nuevo). */
  invalidarVigentesPorCuenta(cuentaId: string, tipo: TipoTokenDeUso): Promise<void>;
}

/**
 * Repos de ESTE bounded context ligados a una transacción. La Unit of Work es por módulo
 * (ADR-002): un `ReposTransaccionales` compartido entre contextos obligaría a cada módulo a
 * conocer el interior del otro, que es exactamente lo que la regla de fronteras prohíbe.
 */
export interface ReposTransaccionales {
  cuentas: CuentaRepository;
  sesiones: SesionRepository;
  tokens: TokenRepository;
  outbox: OutboxPort;
  auditoria: AuditoriaPort;
}

export interface UnidadDeTrabajo {
  transaccion<T>(fn: (repos: ReposTransaccionales) => Promise<T>): Promise<T>;
}

export const UNIDAD_DE_TRABAJO = Symbol('UnidadDeTrabajo');
