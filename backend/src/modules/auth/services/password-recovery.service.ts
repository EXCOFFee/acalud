/**
 * 🔐 SERVICIO DE RECUPERACIÓN DE CONTRASEÑA - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Servicio responsable de la lógica de recuperación de contraseñas:
 * - Generación de tokens seguros
 * - Validación de tokens
 * - Gestión de intentos fallidos
 * - Integración con servicio de email
 * - Auditoría de seguridad
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de recuperación de contraseñas
 * - OCP: Extensible para diferentes tipos de tokens
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Depende de abstracciones (repositories, email service)
 */

import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  BadRequestException,
  ConflictException,
  UnauthorizedException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { PasswordRecovery, TokenStatus, TokenType } from '../entities/password-recovery.entity';
import { User } from '../../users/user.entity';
import { EmailService } from './email.service';

/**
 * DTO para solicitud de recuperación de contraseña
 */
export interface PasswordRecoveryRequestDto {
  email: string;
  clientIp?: string;
  userAgent?: string;
}

/**
 * DTO para validación de token
 */
export interface TokenValidationDto {
  token: string;
  clientIp?: string;
  userAgent?: string;
}

/**
 * DTO para reseteo de contraseña
 */
export interface PasswordResetDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
  clientIp?: string;
  userAgent?: string;
}

/**
 * Interface para resultado de operaciones
 */
export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Interface para estadísticas de recuperación
 */
export interface RecoveryStatistics {
  totalRequests: number;
  pendingTokens: number;
  usedTokens: number;
  expiredTokens: number;
  failedAttempts: number;
  successfulResets: number;
  averageTimeToReset: number; // en minutos
}

/**
 * Servicio de recuperación de contraseñas
 * 
 * @description Este servicio maneja todo el flujo de recuperación de contraseñas,
 * desde la generación de tokens hasta el reseteo final, incluyendo medidas de seguridad
 * y auditoría completa.
 * 
 * @example
 * ```typescript
 * // Solicitar recuperación
 * const result = await passwordRecoveryService.requestPasswordReset({
 *   email: 'user@example.com',
 *   clientIp: '192.168.1.1'
 * });
 * 
 * // Resetear contraseña
 * const resetResult = await passwordRecoveryService.resetPassword({
 *   token: 'secure-token',
 *   newPassword: 'newSecurePassword123',
 *   confirmPassword: 'newSecurePassword123'
 * });
 * ```
 */
@Injectable()
export class PasswordRecoveryService {
  /**
   * Logger para registrar operaciones
   */
  private readonly logger = new Logger(PasswordRecoveryService.name);

  /**
   * Configuración del servicio
   */
  private readonly config = {
    tokenExpirationMinutes: 60, // 1 hora por defecto
    maxAttemptsPerHour: 3,
    maxAttemptsPerDay: 10,
    tokenLength: 64,
    saltRounds: 12,
  };

  constructor(
    @InjectRepository(PasswordRecovery)
    private readonly passwordRecoveryRepository: Repository<PasswordRecovery>,
    
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    // Configurar parámetros desde variables de entorno
    this.config.tokenExpirationMinutes = this.configService.get<number>('PASSWORD_RESET_EXPIRATION_MINUTES', 60);
    this.config.maxAttemptsPerHour = this.configService.get<number>('PASSWORD_RESET_MAX_ATTEMPTS_HOUR', 3);
    this.config.maxAttemptsPerDay = this.configService.get<number>('PASSWORD_RESET_MAX_ATTEMPTS_DAY', 10);
    
    this.logger.log('🔐 Servicio de recuperación de contraseña inicializado');
  }

  /**
   * Solicita la recuperación de contraseña para un usuario
   * 
   * @param requestData Datos de la solicitud
   * @returns Promise<OperationResult> Resultado de la operación
   * 
   * @throws NotFoundException Si el usuario no existe
   * @throws ConflictException Si hay demasiados intentos
   * 
   * @example
   * ```typescript
   * const result = await service.requestPasswordReset({
   *   email: 'usuario@example.com',
   *   clientIp: '192.168.1.1',
   *   userAgent: 'Mozilla/5.0...'
   * });
   * ```
   */
  async requestPasswordReset(requestData: PasswordRecoveryRequestDto): Promise<OperationResult> {
    this.logger.log(`🔐 Solicitud de recuperación para: ${requestData.email}`);

    try {
      // 1. Buscar usuario por email
      const user = await this.findUserByEmail(requestData.email);
      if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        this.logger.warn(`⚠️ Intento de recuperación para email inexistente: ${requestData.email}`);
        return {
          success: true,
          message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.'
        };
      }

      // 2. Verificar límites de intentos
      await this.checkRateLimits(user.id, requestData.clientIp);

      // 3. Invalidar tokens anteriores pendientes
      await this.invalidatePreviousTokens(user.id);

      // 4. Generar nuevo token
      const token = await this.generateSecureToken();
      
      // 5. Crear registro de recuperación
      const recovery = await this.createRecoveryRecord(user, token, requestData);

      // 6. Enviar email de recuperación
      const emailSent = await this.sendRecoveryEmail(user, token);

      if (emailSent) {
        this.logger.log(`✅ Recuperación iniciada exitosamente para: ${user.email}`);
        return {
          success: true,
          message: 'Se ha enviado un enlace de recuperación a tu email.',
          data: { tokenId: recovery.id }
        };
      } else {
        this.logger.error(`❌ Error enviando email de recuperación a: ${user.email}`);
        // Marcar el token como fallido
        await this.markTokenAsFailed(recovery.id);
        
        throw new BadRequestException('Error enviando email de recuperación. Intenta nuevamente.');
      }

    } catch (error) {
      this.logger.error(`❌ Error en solicitud de recuperación: ${error.message}`, error.stack);
      
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      
      return {
        success: false,
        message: 'Error procesando solicitud de recuperación.'
      };
    }
  }

  /**
   * Valida un token de recuperación
   * 
   * @param validationData Datos de validación
   * @returns Promise<OperationResult> Resultado de la validación
   * 
   * @throws BadRequestException Si el token es inválido
   * @throws UnauthorizedException Si el token está expirado o usado
   */
  async validateToken(validationData: TokenValidationDto): Promise<OperationResult> {
    this.logger.log(`🔍 Validando token de recuperación`);

    try {
      // 1. Buscar token en la base de datos
      const recovery = await this.findRecoveryByToken(validationData.token);
      
      if (!recovery) {
        this.logger.warn(`⚠️ Token no encontrado o inválido`);
        throw new BadRequestException('Token de recuperación inválido.');
      }

      // 2. Validar token usando el método de la entidad
      if (!recovery.isValid()) {
        this.logger.warn(`⚠️ Token inválido - Estado: ${recovery.status}, Expirado: ${recovery.isExpired()}`);
        
        // Incrementar intentos fallidos
        await this.incrementFailedAttempts(recovery, validationData.clientIp);
        
        throw new UnauthorizedException('Token de recuperación expirado o inválido.');
      }

      // 3. Verificar límites de intentos
      if (recovery.attemptCount >= 5) {
        this.logger.warn(`⚠️ Demasiados intentos fallidos para token: ${recovery.id}`);
        throw new UnauthorizedException('Demasiados intentos fallidos. Solicita un nuevo token.');
      }

      // 4. Registrar acceso exitoso
      await this.recordSuccessfulAccess(recovery, validationData.clientIp);

      this.logger.log(`✅ Token validado exitosamente`);
      
      return {
        success: true,
        message: 'Token válido.',
        data: {
          userId: recovery.user.id,
          email: recovery.user.email,
          expiresAt: recovery.expiresAt
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error validando token: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Error validando token de recuperación.');
    }
  }

  /**
   * Resetea la contraseña usando un token válido
   * 
   * @param resetData Datos del reseteo
   * @returns Promise<OperationResult> Resultado del reseteo
   * 
   * @throws BadRequestException Si los datos son inválidos
   * @throws UnauthorizedException Si el token es inválido
   */
  async resetPassword(resetData: PasswordResetDto): Promise<OperationResult> {
    this.logger.log(`🔄 Iniciando reseteo de contraseña`);

    try {
      // 1. Validar que las contraseñas coincidan
      if (resetData.newPassword !== resetData.confirmPassword) {
        throw new BadRequestException('Las contraseñas no coinciden.');
      }

      // 2. Validar fortaleza de la contraseña
      this.validatePasswordStrength(resetData.newPassword);

      // 3. Validar token
      const validationResult = await this.validateToken({
        token: resetData.token,
        clientIp: resetData.clientIp,
        userAgent: resetData.userAgent
      });

      if (!validationResult.success) {
        throw new UnauthorizedException('Token inválido para reseteo.');
      }

      // 4. Buscar el registro de recuperación
      const recovery = await this.findRecoveryByToken(resetData.token);
      const user = recovery.user;

      // 5. Verificar que la nueva contraseña sea diferente a la actual
      const isSamePassword = await bcrypt.compare(resetData.newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('La nueva contraseña debe ser diferente a la actual.');
      }

      // 6. Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(resetData.newPassword, this.config.saltRounds);

      // 7. Actualizar contraseña del usuario
      await this.updateUserPassword(user.id, hashedPassword);

      // 8. Marcar token como usado
      await this.markTokenAsUsed(recovery, resetData.clientIp);

      // 9. Invalidar otros tokens pendientes del usuario
      await this.invalidatePreviousTokens(user.id, recovery.id);

      this.logger.log(`✅ Contraseña reseteada exitosamente para usuario: ${user.email}`);

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente.',
        data: { userId: user.id }
      };

    } catch (error) {
      this.logger.error(`❌ Error reseteando contraseña: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Error reseteando contraseña.');
    }
  }

  /**
   * Obtiene estadísticas de recuperación
   * 
   * @param days Número de días hacia atrás para las estadísticas
   * @returns Promise<RecoveryStatistics> Estadísticas
   */
  async getRecoveryStatistics(days: number = 30): Promise<RecoveryStatistics> {
    this.logger.log(`📊 Generando estadísticas de recuperación para los últimos ${days} días`);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const statistics = await this.passwordRecoveryRepository
        .createQueryBuilder('recovery')
        .select([
          'COUNT(*) as totalRequests',
          'COUNT(CASE WHEN recovery.status = :pending THEN 1 END) as pendingTokens',
          'COUNT(CASE WHEN recovery.status = :used THEN 1 END) as usedTokens',
          'COUNT(CASE WHEN recovery.status = :expired THEN 1 END) as expiredTokens',
          'SUM(recovery.attemptCount) as failedAttempts',
          'COUNT(CASE WHEN recovery.status = :used THEN 1 END) as successfulResets',
          'AVG(CASE WHEN recovery.status = :used AND recovery.usedAt IS NOT NULL THEN EXTRACT(EPOCH FROM (recovery.usedAt - recovery.createdAt))/60 END) as averageTimeToReset'
        ])
        .where('recovery.createdAt >= :fromDate', { fromDate })
        .setParameters({
          pending: TokenStatus.ACTIVE,
          used: TokenStatus.USED,
          expired: TokenStatus.EXPIRED
        })
        .getRawOne();

      return {
        totalRequests: parseInt(statistics.totalRequests) || 0,
        pendingTokens: parseInt(statistics.pendingTokens) || 0,
        usedTokens: parseInt(statistics.usedTokens) || 0,
        expiredTokens: parseInt(statistics.expiredTokens) || 0,
        failedAttempts: parseInt(statistics.failedAttempts) || 0,
        successfulResets: parseInt(statistics.successfulResets) || 0,
        averageTimeToReset: parseFloat(statistics.averageTimeToReset) || 0
      };

    } catch (error) {
      this.logger.error(`❌ Error generando estadísticas: ${error.message}`, error.stack);
      throw new BadRequestException('Error generando estadísticas de recuperación.');
    }
  }

  // =============================================================================
  // MÉTODOS PRIVADOS
  // =============================================================================

  /**
   * Busca un usuario por email
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ 
      where: { email: email.toLowerCase() },
      select: ['id', 'email', 'name', 'password', 'isActive']
    });
  }

  /**
   * Verifica los límites de intentos de recuperación
   */
  private async checkRateLimits(userId: string, clientIp?: string): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Verificar intentos por hora
    const attemptsLastHour = await this.passwordRecoveryRepository.count({
      where: {
        user: { id: userId },
        createdAt: { $gte: oneHourAgo } as any
      }
    });

    if (attemptsLastHour >= this.config.maxAttemptsPerHour) {
      this.logger.warn(`⚠️ Límite de intentos por hora excedido para usuario: ${userId}`);
      throw new ConflictException('Demasiados intentos de recuperación. Intenta en una hora.');
    }

    // Verificar intentos por día
    const attemptsLastDay = await this.passwordRecoveryRepository.count({
      where: {
        user: { id: userId },
        createdAt: { $gte: oneDayAgo } as any
      }
    });

    if (attemptsLastDay >= this.config.maxAttemptsPerDay) {
      this.logger.warn(`⚠️ Límite de intentos diarios excedido para usuario: ${userId}`);
      throw new ConflictException('Demasiados intentos de recuperación. Intenta mañana.');
    }
  }

  /**
   * Invalida tokens anteriores pendientes
   */
  private async invalidatePreviousTokens(userId: string, excludeId?: string): Promise<void> {
    const query = this.passwordRecoveryRepository
      .createQueryBuilder()
      .update(PasswordRecovery)
      .set({ 
        status: TokenStatus.EXPIRED,
        updatedAt: new Date()
      })
      .where('user.id = :userId', { userId })
      .andWhere('status = :status', { status: TokenStatus.ACTIVE });

    if (excludeId) {
      query.andWhere('id != :excludeId', { excludeId });
    }

    await query.execute();
    
    this.logger.log(`🔄 Tokens anteriores invalidados para usuario: ${userId}`);
  }

  /**
   * Genera un token seguro
   */
  private async generateSecureToken(): Promise<string> {
    return crypto.randomBytes(this.config.tokenLength).toString('hex');
  }

  /**
   * Crea un registro de recuperación
   */
  private async createRecoveryRecord(
    user: User, 
    token: string, 
    requestData: PasswordRecoveryRequestDto
  ): Promise<PasswordRecovery> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.config.tokenExpirationMinutes);

    const recovery = this.passwordRecoveryRepository.create({
      user,
      token,
      type: TokenType.PASSWORD_RESET,
      status: TokenStatus.ACTIVE,
      expiresAt,
      ipAddress: requestData.clientIp,
      userAgent: requestData.userAgent,
      attemptCount: 0
    });

    return await this.passwordRecoveryRepository.save(recovery);
  }

  /**
   * Envía email de recuperación
   */
  private async sendRecoveryEmail(user: User, token: string): Promise<boolean> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    return await this.emailService.sendPasswordResetEmail({
      user,
      token,
      resetUrl,
      expirationMinutes: this.config.tokenExpirationMinutes
    });
  }

  /**
   * Busca un registro de recuperación por token
   */
  private async findRecoveryByToken(token: string): Promise<PasswordRecovery | null> {
    return await this.passwordRecoveryRepository.findOne({
      where: { token },
      relations: ['user']
    });
  }

  /**
   * Incrementa los intentos fallidos
   */
  private async incrementFailedAttempts(recovery: PasswordRecovery, clientIp?: string): Promise<void> {
    recovery.incrementAttempts();
    recovery.ipAddress = clientIp;

    await this.passwordRecoveryRepository.save(recovery);
  }

  /**
   * Registra un acceso exitoso
   */
  private async recordSuccessfulAccess(recovery: PasswordRecovery, clientIp?: string): Promise<void> {
    recovery.ipAddress = clientIp;
    recovery.updatedAt = new Date();

    await this.passwordRecoveryRepository.save(recovery);
  }

  /**
   * Marca un token como usado
   */
  private async markTokenAsUsed(recovery: PasswordRecovery, clientIp?: string): Promise<void> {
    recovery.markAsUsed();
    recovery.usedAt = new Date();
    recovery.usedFromIp = clientIp;

    await this.passwordRecoveryRepository.save(recovery);
  }

  /**
   * Marca un token como fallido
   */
  private async markTokenAsFailed(recoveryId: string): Promise<void> {
    await this.passwordRecoveryRepository.update(recoveryId, {
      status: TokenStatus.EXPIRED,
      updatedAt: new Date()
    });
  }

  /**
   * Actualiza la contraseña del usuario
   */
  private async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(userId, {
      password: hashedPassword,
      updatedAt: new Date(),
      // Opcional: incrementar version para invalidar sesiones existentes
      // version: () => 'version + 1'
    });
  }

  /**
   * Valida la fortaleza de la contraseña
   */
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`La contraseña debe tener al menos ${minLength} caracteres.`);
    }

    if (!hasUpperCase) {
      errors.push('La contraseña debe contener al menos una letra mayúscula.');
    }

    if (!hasLowerCase) {
      errors.push('La contraseña debe contener al menos una letra minúscula.');
    }

    if (!hasNumbers) {
      errors.push('La contraseña debe contener al menos un número.');
    }

    if (!hasSpecialChar) {
      errors.push('La contraseña debe contener al menos un carácter especial.');
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Contraseña no válida: ${errors.join(' ')}`);
    }
  }
}