/**
 * 🗄️ REPOSITORIO DE INVITACIONES A AULAS
 *
 * Encapsula el acceso a datos para las invitaciones de aulas, permitiendo
 * operaciones de creación, actualización y consulta enfocadas en los tokens
 * enviados a estudiantes.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassroomInvitation, InvitationStatus } from '../classroom-invitation.entity';
import { IClassroomInvitationRepository, CreateInvitationData } from '../interfaces';
import { ResourceNotFoundException } from '../../../common/exceptions/business.exception';

@Injectable()
export class ClassroomInvitationRepository implements IClassroomInvitationRepository {
  constructor(
    @InjectRepository(ClassroomInvitation)
    private readonly repository: Repository<ClassroomInvitation>,
  ) {}

  async createOrUpdatePending(data: CreateInvitationData): Promise<ClassroomInvitation> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existing = await this.repository.findOne({
      where: {
        classroomId: data.classroomId,
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
    });

    if (existing) {
      existing.token = data.token;
      existing.expiresAt = data.expiresAt ?? existing.expiresAt ?? null;
      existing.invitedById = data.invitedById;
      existing.message = data.message ?? existing.message ?? null;
      existing.metadata = data.metadata ?? existing.metadata ?? null;
      existing.sentAt = new Date();
      existing.revokedAt = null;
      return this.repository.save(existing);
    }

    const invitation = this.repository.create({
      classroomId: data.classroomId,
      email: normalizedEmail,
      token: data.token,
      invitedById: data.invitedById,
      expiresAt: data.expiresAt ?? null,
      message: data.message ?? null,
      metadata: data.metadata ?? null,
      sentAt: new Date(),
      status: InvitationStatus.PENDING,
    });

    return this.repository.save(invitation);
  }

  async findByToken(token: string): Promise<ClassroomInvitation | null> {
    return this.repository.findOne({
      where: { token: token.trim() },
      relations: ['classroom', 'classroom.teacher'],
    });
  }

  async findPendingByEmail(classroomId: string, email: string): Promise<ClassroomInvitation | null> {
    return this.repository.findOne({
      where: {
        classroomId,
        email: email.trim().toLowerCase(),
        status: InvitationStatus.PENDING,
      },
    });
  }

  async listByClassroom(classroomId: string): Promise<ClassroomInvitation[]> {
    return this.repository.find({
      where: { classroomId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(invitationId: string): Promise<ClassroomInvitation | null> {
    return this.repository.findOne({
      where: { id: invitationId },
      relations: ['classroom', 'classroom.teacher'],
    });
  }

  async save(invitation: ClassroomInvitation): Promise<ClassroomInvitation> {
    return this.repository.save(invitation);
  }

  async updateStatus(
    invitationId: string,
    status: InvitationStatus,
    payload: Partial<ClassroomInvitation> = {},
  ): Promise<ClassroomInvitation> {
    const invitation = await this.repository.findOne({ where: { id: invitationId } });

    if (!invitation) {
      throw new ResourceNotFoundException('Invitación', invitationId);
    }

    invitation.status = status;

    if (payload.acceptedById !== undefined) {
      invitation.acceptedById = payload.acceptedById;
    }

    if (payload.acceptedAt !== undefined) {
      invitation.acceptedAt = payload.acceptedAt;
    }

    if (payload.revokedAt !== undefined) {
      invitation.revokedAt = payload.revokedAt;
    }

    if (payload.message !== undefined) {
      invitation.message = payload.message;
    }

    if (payload.metadata !== undefined) {
      invitation.metadata = payload.metadata;
    }

    return this.repository.save(invitation);
  }
}
