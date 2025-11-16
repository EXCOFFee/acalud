// ============================================================================
// 🔐 SERVICIO DE RECUPERACIÓN DE CONTRASEÑA - ACALUD
// ============================================================================
// Centraliza las peticiones al backend para solicitar, validar y aplicar
// recuperaciones de contraseña.

import { httpClient, HttpError } from './http.service';

interface PasswordRecoveryResponse<TData = undefined> {
  success: boolean;
  message: string;
  data?: TData;
}

export interface PasswordRecoveryRequestPayload {
  email: string;
}

export interface PasswordTokenValidationData {
  userId: string;
  email: string;
  expiresAt: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export class PasswordRecoveryService {
  private static instance: PasswordRecoveryService;

  public static getInstance(): PasswordRecoveryService {
    if (!PasswordRecoveryService.instance) {
      PasswordRecoveryService.instance = new PasswordRecoveryService();
    }
    return PasswordRecoveryService.instance;
  }

  private constructor() {}

  async requestPasswordReset(payload: PasswordRecoveryRequestPayload): Promise<PasswordRecoveryResponse> {
    return httpClient.post<PasswordRecoveryResponse, PasswordRecoveryRequestPayload>(
      '/auth/password/request-reset',
      payload,
    );
  }

  async validateToken(token: string): Promise<PasswordRecoveryResponse<PasswordTokenValidationData>> {
    return httpClient.post<PasswordRecoveryResponse<PasswordTokenValidationData>, { token: string }>(
      '/auth/password/validate-token',
      { token },
    );
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<PasswordRecoveryResponse<{ userId: string }>> {
    return httpClient.post<PasswordRecoveryResponse<{ userId: string }>, ResetPasswordPayload>(
      '/auth/password/reset',
      payload,
    );
  }
}

export const passwordRecoveryService = PasswordRecoveryService.getInstance();
export type PasswordRecoveryError = HttpError;
