// ============================================================================
// SERVICIO DE INVITACIONES A AULAS
// ============================================================================
// Provee utilidades para validar y consumir invitaciones desde el frontend.

import { httpClient, HttpError } from '../http.service';
import type {
  ClassroomInvitation,
  InvitationConsumptionResult,
  InvitationDispatchResult,
  InvitationValidationResult,
} from '../../types';

interface SendInvitationOptions {
  message?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export class ClassroomInvitationService {
  private static instance: ClassroomInvitationService;

  public static getInstance(): ClassroomInvitationService {
    if (!ClassroomInvitationService.instance) {
      ClassroomInvitationService.instance = new ClassroomInvitationService();
    }
    return ClassroomInvitationService.instance;
  }

  private constructor() {}

  async listInvitations(classroomId: string): Promise<ClassroomInvitation[]> {
    try {
      return await httpClient.get<ClassroomInvitation[]>(`/classrooms/${classroomId}/invitations`);
    } catch (error) {
      throw this.mapHttpError(error, 'No se pudieron cargar las invitaciones del aula.');
    }
  }

  async sendInvitations(
    classroomId: string,
    emails: string[],
    options: SendInvitationOptions = {},
  ): Promise<InvitationDispatchResult> {
    try {
      return await httpClient.post<InvitationDispatchResult>(`/classrooms/${classroomId}/invitations`, {
        emails,
        message: options.message,
        redirectUrl: options.redirectUrl,
        metadata: options.metadata,
      });
    } catch (error) {
      throw this.mapHttpError(error, 'No se pudieron enviar las invitaciones solicitadas.');
    }
  }

  async validateToken(token: string): Promise<InvitationValidationResult> {
    const normalizedToken = token.trim();
    try {
      return await httpClient.get<InvitationValidationResult>(
        `/classrooms/invitations/validate?token=${encodeURIComponent(normalizedToken)}`,
      );
    } catch (error) {
      throw this.mapHttpError(error, 'No pudimos validar la invitación. Intenta nuevamente más tarde.');
    }
  }

  async consumeInvitation(token: string, email: string): Promise<InvitationConsumptionResult> {
    try {
      return await httpClient.post<InvitationConsumptionResult>('/classrooms/invitations/consume', {
        token: token.trim(),
        email: email.trim().toLowerCase(),
      });
    } catch (error) {
      throw this.mapHttpError(error, 'No fue posible aceptar la invitación.');
    }
  }

  async resendInvitation(
    classroomId: string,
    invitationId: string,
    options: { message?: string; redirectUrl?: string } = {},
  ): Promise<ClassroomInvitation> {
    try {
      return await httpClient.post<ClassroomInvitation>(
        `/classrooms/${classroomId}/invitations/${invitationId}/resend`,
        {
          message: options.message,
          redirectUrl: options.redirectUrl,
        },
      );
    } catch (error) {
      throw this.mapHttpError(error, 'No se pudo reenviar la invitación seleccionada.');
    }
  }

  async revokeInvitation(classroomId: string, invitationId: string): Promise<ClassroomInvitation> {
    try {
      return await httpClient.delete<ClassroomInvitation>(
        `/classrooms/${classroomId}/invitations/${invitationId}`,
      );
    } catch (error) {
      throw this.mapHttpError(error, 'No se pudo revocar la invitación seleccionada.');
    }
  }

  private mapHttpError(error: unknown, fallback: string): Error {
    if (error instanceof HttpError) {
      const message = typeof error.message === 'string' && error.message.trim().length > 0
        ? error.message
        : fallback;
      return new Error(message);
    }
    return new Error(fallback);
  }
}
