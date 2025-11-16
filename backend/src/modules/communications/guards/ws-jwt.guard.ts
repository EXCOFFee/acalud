/**
 * 🔐 GUARD JWT PARA WEBSOCKET - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Guard que protege las conexiones WebSocket con autenticación JWT:
 * - Validación de tokens en handshake
 * - Soporte para tokens en headers y auth
 * - Manejo de errores de autenticación
 * - Logging de eventos de seguridad
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de autenticar WebSocket
 * - OCP: Extensible para nuevas validaciones
 * - LSP: Implementa CanActivate correctamente
 * - ISP: Interface específica para WebSocket guards
 * - DIP: Depende de abstracciones JWT
 */

import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

/**
 * Guard para proteger conexiones WebSocket con JWT
 * 
 * @description Este guard valida tokens JWT en conexiones WebSocket,
 * permitiendo solo usuarios autenticados conectarse al gateway.
 * 
 * El token puede venir en:
 * - `client.handshake.auth.token`
 * - `client.handshake.headers.authorization` (Bearer token)
 * 
 * @example
 * ```typescript
 * // En el cliente JavaScript
 * const socket = io('ws://localhost:3000/communications', {
 *   auth: { token: 'your-jwt-token' }
 * });
 * 
 * // O usando headers
 * const socket = io('ws://localhost:3000/communications', {
 *   extraHeaders: {
 *     authorization: 'Bearer your-jwt-token'
 *   }
 * });
 * ```
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  /**
   * Logger para eventos de seguridad
   */
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Determina si la conexión WebSocket puede activarse
   * 
   * @param context - Contexto de ejecución de NestJS
   * @returns Promise<boolean> - true si está autenticado, false si no
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // 🔍 Obtener el cliente WebSocket del contexto
      const client: Socket = context.switchToWs().getClient<Socket>();

      // 🎫 Extraer token del handshake
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        this.logger.warn(`🚫 WebSocket: Token no encontrado - Socket: ${client.id}`);
        return false;
      }

      // ✅ Verificar y decodificar el token
      const payload = await this.jwtService.verifyAsync(token);

      if (!payload) {
        this.logger.warn(`🚫 WebSocket: Token inválido - Socket: ${client.id}`);
        return false;
      }

      // 📝 Extraer información del usuario del payload
      const userId = payload.sub || payload.userId;
      const email = payload.email;

      if (!userId) {
        this.logger.warn(`🚫 WebSocket: Payload sin userId - Socket: ${client.id}`);
        return false;
      }

      // 💾 Guardar información del usuario en el contexto del socket
      // Esto será utilizado posteriormente en el gateway
      client.data = {
        ...client.data,
        userId,
        email,
        tokenPayload: payload,
      };

      this.logger.debug(`✅ WebSocket: Usuario autenticado - UserID: ${userId}, Socket: ${client.id}`);
      return true;

    } catch (error) {
      // 🚨 Log de errores de autenticación para seguridad
      this.logger.error(`❌ WebSocket: Error de autenticación - ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Extrae el token JWT del handshake del WebSocket
   * 
   * @param client - Cliente WebSocket
   * @returns string | null - Token JWT o null si no se encuentra
   * 
   * @private
   */
  private extractTokenFromHandshake(client: Socket): string | null {
    try {
      // 🔍 Buscar token en auth object
      let token = client.handshake.auth?.token;

      // 🔍 Si no está en auth, buscar en headers Authorization
      if (!token) {
        const authHeader = client.handshake.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7); // Remover 'Bearer '
        }
      }

      // 🔍 Buscar en query parameters como fallback
      if (!token) {
        token = client.handshake.query?.token as string;
      }

      return token || null;

    } catch (error) {
      this.logger.error(`❌ Error extrayendo token del handshake: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Valida el formato básico del token JWT
   * 
   * @param token - Token a validar
   * @returns boolean - true si tiene formato válido
   * 
   * @private
   */
  private isValidTokenFormat(token: string): boolean {
    // 🔍 Un JWT básico debe tener 3 partes separadas por puntos
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Crea un mensaje de error detallado para logging
   * 
   * @param client - Cliente WebSocket
   * @param reason - Razón del rechazo
   * @returns string - Mensaje formateado
   * 
   * @private
   */
  private createErrorMessage(client: Socket, reason: string): string {
    return `WebSocket Auth Failed - Socket: ${client.id}, IP: ${client.handshake.address}, Reason: ${reason}`;
  }
}