/**
 * 📬 ENTIDAD DE INVITACIONES A AULAS
 *
 * Responsable de representar y persistir las invitaciones enviadas a estudiantes
 * para un aula determinada. Cada registro contiene el token único asociado,
 * el correo invitado, el estado de la invitación y metadatos de auditoría.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, Length } from 'class-validator';
import { Classroom } from './classroom.entity';
import { User } from '../users/user.entity';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('classroom_invitations')
@Index('idx_classroom_invitation_classroom_email', ['classroomId', 'email'])
@Index('idx_classroom_invitation_token', ['token'], { unique: true })
export class ClassroomInvitation {
  @ApiProperty({ description: 'Identificador único de la invitación' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID del aula asociado' })
  @Column('uuid')
  classroomId: string;

  @ApiProperty({ description: 'ID del usuario que generó la invitación', required: false })
  @Column('uuid', { nullable: true })
  invitedById?: string | null;

  @ApiProperty({ description: 'ID del usuario que aceptó la invitación', required: false })
  @Column('uuid', { nullable: true })
  acceptedById?: string | null;

  @ApiProperty({ description: 'Correo electrónico del estudiante invitado' })
  @Column()
  @IsEmail({}, { message: 'El correo de invitación debe ser válido' })
  email: string;

  @ApiProperty({ description: 'Token único de la invitación' })
  @Column({ unique: true })
  @Length(10, 120, { message: 'El token de invitación debe tener entre 10 y 120 caracteres' })
  token: string;

  @ApiProperty({ enum: InvitationStatus, default: InvitationStatus.PENDING })
  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  @IsEnum(InvitationStatus, { message: 'El estado de la invitación no es válido' })
  status: InvitationStatus;

  @ApiProperty({ description: 'Fecha de expiración del token', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt?: Date | null;

  @ApiProperty({ description: 'Fecha en que se envió la invitación', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true })
  sentAt?: Date | null;

  @ApiProperty({ description: 'Fecha en que se aceptó la invitación', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true })
  acceptedAt?: Date | null;

  @ApiProperty({ description: 'Fecha en que se revocó la invitación', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true })
  revokedAt?: Date | null;

  @ApiProperty({ description: 'Mensaje personalizado enviado al estudiante', required: false })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  message?: string | null;

  @ApiProperty({ description: 'Metadatos adicionales de la invitación', required: false })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => Classroom, classroom => classroom.invitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy?: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acceptedById' })
  acceptedBy?: User | null;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail(): void {
    if (this.email) {
      this.email = this.email.trim().toLowerCase();
    }
    if (this.token) {
      this.token = this.token.trim();
    }
  }
}
