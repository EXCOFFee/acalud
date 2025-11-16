/**
 * Auditoría de cambios realizados sobre los perfiles de usuario.
 * Registra qué campos se modifican, quién ejecuta la acción y mantiene
 * snapshots antes y después para facilitar revisiones posteriores.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Operaciones que pueden generar eventos de auditoría.
 */
export enum ProfileAuditOperation {
  PROFILE_CREATED = 'PROFILE_CREATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  STATS_UPDATED = 'STATS_UPDATED',
}

/**
 * Representa un evento de auditoría sobre el perfil de un usuario.
 */
@Entity('user_profile_audits')
@Index(['userId'])
@Index(['operation'])
export class UserProfileAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'actor_user_id', nullable: true })
  actorUserId?: string;

  @Column({ type: 'enum', enum: ProfileAuditOperation })
  operation: ProfileAuditOperation;

  @Column({ type: 'jsonb', nullable: true })
  snapshotBefore?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  snapshotAfter?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  changes?: Record<string, { previous: unknown; current: unknown }> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
