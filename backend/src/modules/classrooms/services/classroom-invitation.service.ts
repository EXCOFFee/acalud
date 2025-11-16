/**
 * 🤝 SERVICIO DE INVITACIONES A AULAS
 *
 * Gestiona el ciclo de vida de las invitaciones enviadas a estudiantes para
 * unirse a un aula: generación de tokens, envío de correos, validación y
 * consumo de invitaciones.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EmailService } from '../../auth/services/email.service';
import { CLASSROOM_TOKENS } from '../tokens';
import {
  IClassroomInvitationService,
  IClassroomInvitationRepository,
  IClassroomRepository,
  IPermissionValidator,
  InvitationDispatchItem,
  InvitationDispatchResult,
  InvitationValidationResult,
  InvitationConsumptionResult,
  SendInvitationsOptions,
  ClassroomInvitation,
} from '../interfaces';
import {
  ValidationException,
  ResourceNotFoundException,
} from '../../../common/exceptions/business.exception';
import { InvitationStatus as InvitationStatusEnum } from '../classroom-invitation.entity';

@Injectable()
export class ClassroomInvitationService implements IClassroomInvitationService {
  private readonly logger = new Logger(ClassroomInvitationService.name);
  private readonly INVITATION_EXPIRATION_DAYS = 14;
  private readonly MAX_INVITATIONS_PER_REQUEST = 20;
  private readonly FALLBACK_FRONTEND_URL = process.env.FRONTEND_BASE_URL
    || process.env.FRONTEND_APP_URL
    || process.env.APP_URL
    || 'http://localhost:5173';

  constructor(
    @Inject(CLASSROOM_TOKENS.IClassroomRepository)
    private readonly classroomRepository: IClassroomRepository,
    @Inject(CLASSROOM_TOKENS.IPermissionValidator)
    private readonly permissionValidator: IPermissionValidator,
    @Inject(CLASSROOM_TOKENS.IClassroomInvitationRepository)
    private readonly invitationRepository: IClassroomInvitationRepository,
    private readonly emailService: EmailService,
  ) {}

  async sendInvitations(
    classroomId: string,
    teacherId: string,
    emails: string[],
    options: SendInvitationsOptions = {},
  ): Promise<InvitationDispatchResult> {
    await this.permissionValidator.validateCanModifyClassroom(classroomId, teacherId);

    const classroom = await this.classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new ResourceNotFoundException('Aula', classroomId);
    }

    const normalizedEmails = this.normalizeEmails(emails);
    if (normalizedEmails.length === 0) {
      return { classroomId, requested: 0, processed: [] };
    }

    const processed: InvitationDispatchItem[] = [];
    const enrolledEmails = new Set(
      (classroom.students || [])
        .map(student => student.email?.trim().toLowerCase())
        .filter(Boolean) as string[],
    );
    const pendingInvites = new Set(classroom.invitedStudentEmails || []);

    for (const email of normalizedEmails) {
      if (!this.isValidEmail(email)) {
        processed.push({ email, token: '', status: 'skipped', reason: 'invalid_email' });
        continue;
      }

      if (enrolledEmails.has(email)) {
        processed.push({ email, token: '', status: 'skipped', reason: 'already_enrolled' });
        pendingInvites.delete(email);
        continue;
      }

      const expiresAt = this.calculateExpirationDate();
      const token = this.generateToken();

      await this.invitationRepository.createOrUpdatePending({
        classroomId,
        email,
        token,
        invitedById: teacherId,
        expiresAt,
        message: options.message,
        metadata: options.metadata,
      });

      pendingInvites.add(email);

      const inviteLink = this.buildInviteLink(token, classroomId, options.redirectUrl);
      const teacherName = classroom.teacher?.name
        || `${classroom.teacher?.firstName ?? ''} ${classroom.teacher?.lastName ?? ''}`.trim()
        || 'Docente AcaLud';

      let emailSent = false;
      try {
        emailSent = await this.emailService.sendClassroomInvitationEmail({
          email,
          classroomName: classroom.name,
          teacherName,
          inviteLink,
          expiresAt,
          message: options.message,
        });
      } catch (error) {
        this.logger.warn(`No se pudo enviar el correo de invitación a ${email}: ${error.message}`);
      }

      processed.push({
        email,
        token,
        expiresAt,
        status: emailSent ? 'sent' : 'queued',
      });
    }

    await this.classroomRepository.update(classroomId, {
      invitedStudentEmails: Array.from(pendingInvites),
    });

    return {
      classroomId,
      requested: normalizedEmails.length,
      processed,
    };
  }

  async listInvitations(classroomId: string, requesterId: string): Promise<ClassroomInvitation[]> {
    await this.permissionValidator.validateCanModifyClassroom(classroomId, requesterId);

    const classroom = await this.classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new ResourceNotFoundException('Aula', classroomId);
    }

    return this.invitationRepository.listByClassroom(classroomId);
  }

  async validateInvitationToken(token: string): Promise<InvitationValidationResult> {
    const trimmedToken = token.trim();
    const invitation = await this.invitationRepository.findByToken(trimmedToken);

    if (!invitation) {
      return {
        valid: false,
        status: InvitationStatusEnum.REVOKED,
        token: trimmedToken,
        reason: 'not_found',
      };
    }

    if (invitation.status !== InvitationStatusEnum.PENDING) {
      return {
        valid: false,
        status: invitation.status,
        token: trimmedToken,
        email: invitation.email,
        classroom: this.buildClassroomSnapshot(invitation),
        expiresAt: invitation.expiresAt ?? null,
        reason: invitation.status === InvitationStatusEnum.ACCEPTED ? 'already_accepted' : 'revoked',
      };
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await this.invitationRepository.updateStatus(invitation.id, InvitationStatusEnum.EXPIRED, {
        revokedAt: new Date(),
      });

      return {
        valid: false,
        status: InvitationStatusEnum.EXPIRED,
        token: trimmedToken,
        email: invitation.email,
        classroom: this.buildClassroomSnapshot(invitation),
        expiresAt: invitation.expiresAt,
        reason: 'expired',
      };
    }

    return {
      valid: true,
      status: InvitationStatusEnum.PENDING,
      token: trimmedToken,
      email: invitation.email,
      classroom: this.buildClassroomSnapshot(invitation),
      expiresAt: invitation.expiresAt ?? null,
      message: invitation.message ?? undefined,
    };
  }

  async consumeInvitationToken(
    token: string,
    userId: string,
    email: string,
  ): Promise<InvitationConsumptionResult> {
    const validation = await this.validateInvitationToken(token);

    if (!validation.valid || validation.status !== InvitationStatusEnum.PENDING || !validation.email) {
      throw new ValidationException(
        'Invitación inválida',
        { invitationToken: [validation.reason ?? 'La invitación no es válida.'] },
        '/auth/register',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (validation.email.toLowerCase() !== normalizedEmail) {
      throw new ValidationException(
        'El token no corresponde al correo proporcionado',
        { invitationToken: ['El correo asociado a la invitación es diferente al proporcionado.'] },
        '/auth/register',
      );
    }

    const invitation = await this.invitationRepository.findByToken(token.trim());
    if (!invitation) {
      throw new ResourceNotFoundException('Invitación', token);
    }

    if (invitation.status !== InvitationStatusEnum.PENDING) {
      throw new ValidationException(
        'Invitación no disponible',
        { invitationToken: ['La invitación ya fue utilizada o revocada.'] },
        '/auth/register',
      );
    }

    const classroom = await this.classroomRepository.findById(invitation.classroomId);
    if (!classroom) {
      throw new ResourceNotFoundException('Aula', invitation.classroomId);
    }

    await this.invitationRepository.updateStatus(invitation.id, InvitationStatusEnum.ACCEPTED, {
      acceptedById: userId,
      acceptedAt: new Date(),
    });

    await this.classroomRepository.addStudent(classroom.id, userId);

    const remainingInvites = new Set(classroom.invitedStudentEmails || []);
    remainingInvites.delete(invitation.email);

    await this.classroomRepository.update(classroom.id, {
      invitedStudentEmails: Array.from(remainingInvites),
    });

    return {
      status: InvitationStatusEnum.ACCEPTED,
      classroomId: classroom.id,
      studentId: userId,
      email: normalizedEmail,
    };
  }

  async resendInvitation(
    classroomId: string,
    invitationId: string,
    requesterId: string,
    options: SendInvitationsOptions = {},
  ): Promise<ClassroomInvitation> {
    await this.permissionValidator.validateCanModifyClassroom(classroomId, requesterId);

    const invitation = await this.invitationRepository.findById(invitationId);

    if (!invitation || invitation.classroomId !== classroomId) {
      throw new ResourceNotFoundException('Invitación', invitationId);
    }

    if (invitation.status === InvitationStatusEnum.ACCEPTED) {
      throw new ValidationException(
        'La invitación ya fue aceptada',
        { invitation: ['No es posible reenviar invitaciones que ya fueron aceptadas.'] },
        `/classrooms/${classroomId}`,
      );
    }

    const classroom = invitation.classroom
      ?? await this.classroomRepository.findById(classroomId);

    if (!classroom) {
      throw new ResourceNotFoundException('Aula', classroomId);
    }

    invitation.classroom = classroom;

    const expiresAt = this.calculateExpirationDate();
    const token = this.generateToken();

    invitation.token = token;
    invitation.status = InvitationStatusEnum.PENDING;
    invitation.expiresAt = expiresAt;
    invitation.sentAt = new Date();
    invitation.revokedAt = null;
    invitation.invitedById = requesterId;
    invitation.message = options.message ?? invitation.message ?? null;
    invitation.metadata = options.metadata ?? invitation.metadata ?? null;

    await this.invitationRepository.save(invitation);

    const invitedEmails = new Set(classroom.invitedStudentEmails || []);
    invitedEmails.add(invitation.email);
    await this.classroomRepository.update(classroom.id, {
      invitedStudentEmails: Array.from(invitedEmails),
    });

    const inviteLink = this.buildInviteLink(token, classroomId, options.redirectUrl);
    const teacherName = classroom.teacher?.name
      || `${classroom.teacher?.firstName ?? ''} ${classroom.teacher?.lastName ?? ''}`.trim()
      || 'Docente AcaLud';

    try {
      await this.emailService.sendClassroomInvitationEmail({
        email: invitation.email,
        classroomName: classroom.name,
        teacherName,
        inviteLink,
        expiresAt,
        message: invitation.message ?? undefined,
      });
    } catch (error) {
      this.logger.warn(`No se pudo reenviar el correo de invitación a ${invitation.email}: ${error.message}`);
    }

    return invitation;
  }

  async revokeInvitation(
    classroomId: string,
    invitationId: string,
    requesterId: string,
  ): Promise<ClassroomInvitation> {
    await this.permissionValidator.validateCanModifyClassroom(classroomId, requesterId);

    const invitation = await this.invitationRepository.findById(invitationId);

    if (!invitation || invitation.classroomId !== classroomId) {
      throw new ResourceNotFoundException('Invitación', invitationId);
    }

    if (invitation.status === InvitationStatusEnum.ACCEPTED) {
      throw new ValidationException(
        'La invitación ya fue aceptada',
        { invitation: ['No es posible revocar invitaciones que ya fueron aceptadas.'] },
        `/classrooms/${classroomId}`,
      );
    }

    const updatedInvitation = await this.invitationRepository.updateStatus(
      invitation.id,
      InvitationStatusEnum.REVOKED,
      { revokedAt: new Date() },
    );

    const classroom = await this.classroomRepository.findById(classroomId);
    if (classroom) {
      const invitedEmails = new Set(classroom.invitedStudentEmails || []);
      invitedEmails.delete(invitation.email);
      await this.classroomRepository.update(classroom.id, {
        invitedStudentEmails: Array.from(invitedEmails),
      });
      updatedInvitation.classroom = classroom;
    }

    return updatedInvitation;
  }

  private normalizeEmails(emails: string[]): string[] {
    if (!emails || emails.length === 0) {
      return [];
    }

    const unique: string[] = [];
    const set = new Set<string>();

    for (const rawEmail of emails) {
      if (!rawEmail) {
        continue;
      }
      const normalized = rawEmail.trim().toLowerCase();
      if (!normalized || set.has(normalized)) {
        continue;
      }
      set.add(normalized);
      unique.push(normalized);
      if (unique.length >= this.MAX_INVITATIONS_PER_REQUEST) {
        break;
      }
    }

    return unique;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateToken(): string {
    return randomBytes(24).toString('hex');
  }

  private calculateExpirationDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRATION_DAYS);
    return expiresAt;
  }

  private buildInviteLink(token: string, classroomId: string, overrideUrl?: string): string {
    const baseUrl = overrideUrl || this.FALLBACK_FRONTEND_URL;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}&classroom=${encodeURIComponent(classroomId)}`;
  }

  private buildClassroomSnapshot(invitation: ClassroomInvitation) {
    const teacherName = invitation.classroom?.teacher?.name
      || `${invitation.classroom?.teacher?.firstName ?? ''} ${invitation.classroom?.teacher?.lastName ?? ''}`.trim()
      || undefined;

    return invitation.classroom
      ? {
          id: invitation.classroom.id,
          name: invitation.classroom.name,
          subject: invitation.classroom.subject,
          grade: invitation.classroom.grade,
          teacherName,
        }
      : undefined;
  }
}
