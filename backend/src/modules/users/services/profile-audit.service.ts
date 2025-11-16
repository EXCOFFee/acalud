/**
 * Servicio dedicado a persistir eventos de auditoría del perfil.
 * Centraliza la lógica de registro para reutilizarla desde distintos puntos
 * del dominio (creación, actualización general y actualización de estadísticas).
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProfileAuditOperation,
  UserProfileAudit,
} from '../entities/user-profile-audit.entity';

export interface LogProfileChangeParams {
  userId: string;
  actorUserId?: string;
  operation: ProfileAuditOperation;
  snapshotBefore?: Record<string, unknown> | null;
  snapshotAfter?: Record<string, unknown> | null;
  changes?: Record<string, { previous: unknown; current: unknown }> | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class ProfileAuditService {
  private readonly logger = new Logger(ProfileAuditService.name);

  constructor(
    @InjectRepository(UserProfileAudit)
    private readonly auditRepository: Repository<UserProfileAudit>,
  ) {}

  /**
   * Registra un cambio sobre el perfil.
   */
  async logProfileChange(params: LogProfileChangeParams): Promise<UserProfileAudit> {
    if (!params.userId) {
      throw new Error('userId is required to log profile changes');
    }

    const auditEntry = this.auditRepository.create({
      userId: params.userId,
      actorUserId: params.actorUserId,
      operation: params.operation,
      snapshotBefore: params.snapshotBefore ?? null,
      snapshotAfter: params.snapshotAfter ?? null,
      changes: params.changes ?? null,
      metadata: params.metadata ?? null,
    });

    this.logger.debug(
      `Registrando auditoría de perfil (${params.operation}) para usuario ${params.userId}`,
    );

    return this.auditRepository.save(auditEntry);
  }
}
