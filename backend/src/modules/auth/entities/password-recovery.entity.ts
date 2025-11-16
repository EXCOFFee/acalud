/**
 * 🔑 ENTIDAD DE RECUPERACIÓN DE CONTRASEÑA - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Representa un token de recuperación de contraseña para usuarios
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de manejar tokens de recuperación
 * - OCP: Extensible para diferentes tipos de tokens
 * - LSP: Implementa correctamente la interfaz de entidad de TypeORM
 * - ISP: No fuerza dependencias innecesarias
 * - DIP: Depende de abstracciones (decoradores de TypeORM)
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
} from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Estados de un token de recuperación
 */
export enum TokenStatus {
  ACTIVE = 'active',       // Token activo y válido
  USED = 'used',          // Token ya utilizado
  EXPIRED = 'expired',    // Token expirado
  REVOKED = 'revoked',    // Token revocado por seguridad
}

/**
 * Tipos de token de recuperación
 */
export enum TokenType {
  PASSWORD_RESET = 'password_reset',     // Recuperación de contraseña
  EMAIL_VERIFICATION = 'email_verification', // Verificación de email
  ACCOUNT_ACTIVATION = 'account_activation', // Activación de cuenta
}

/**
 * Entidad PasswordRecovery - Almacena tokens de recuperación de contraseña
 * 
 * @description Esta entidad maneja todos los tokens de recuperación de contraseña,
 * incluyendo validación de tiempo, estados y seguridad.
 * 
 * @example
 * ```typescript
 * const recovery = new PasswordRecovery();
 * recovery.user = user;
 * recovery.token = 'secure-random-token';
 * recovery.type = TokenType.PASSWORD_RESET;
 * recovery.expiresAt = new Date(Date.now() + 3600000); // 1 hora
 * await recoveryRepository.save(recovery);
 * ```
 */
@Entity('password_recoveries')
@Index(['token'], { unique: true }) // Índice único para el token
@Index(['user', 'status', 'type'])  // Índice para búsquedas por usuario
@Index(['expiresAt', 'status'])     // Índice para limpieza de tokens expirados
export class PasswordRecovery {
  /**
   * Identificador único del token de recuperación
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Usuario al que pertenece este token
   * 
   * @relation ManyToOne con User
   * @cascade No se elimina el usuario si se elimina el token
   */
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Token único para la recuperación
   * 
   * @security Token generado criptográficamente seguro
   * @unique Debe ser único en toda la tabla
   * @length 64 caracteres hexadecimales
   */
  @Column({ length: 128, unique: true })
  token: string;

  /**
   * Tipo de token de recuperación
   * 
   * @default TokenType.PASSWORD_RESET
   */
  @Column({
    type: 'enum',
    enum: TokenType,
    default: TokenType.PASSWORD_RESET,
  })
  type: TokenType;

  /**
   * Estado actual del token
   * 
   * @default TokenStatus.ACTIVE
   */
  @Column({
    type: 'enum',
    enum: TokenStatus,
    default: TokenStatus.ACTIVE,
  })
  status: TokenStatus;

  /**
   * Fecha y hora de expiración del token
   * 
   * @default 1 hora desde la creación
   */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /**
   * Dirección IP desde donde se solicitó el token
   * 
   * @security Útil para detectar intentos maliciosos
   * @length Soporta IPv4 e IPv6
   */
  @Column({ length: 45, nullable: true })
  ipAddress?: string;

  /**
   * User-Agent del navegador que solicitó el token
   * 
   * @security Útil para análisis de seguridad
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * Fecha cuando se utilizó el token (si corresponde)
   * 
   * @nullable Solo se completa si el token es utilizado
   */
  @Column({ type: 'timestamp', nullable: true })
  usedAt?: Date;

  /**
   * Dirección IP desde donde se utilizó el token
   * 
   * @security Para auditoria de uso
   */
  @Column({ length: 45, nullable: true })
  usedFromIp?: string;

  /**
   * Número de intentos de uso del token
   * 
   * @security Para detectar ataques de fuerza bruta
   * @default 0
   */
  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  /**
   * Fecha de creación del registro
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Fecha de última actualización del registro
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Constructor para crear una nueva instancia de PasswordRecovery
   */
  constructor(partial?: Partial<PasswordRecovery>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /**
   * Verifica si el token está activo y no expirado
   * 
   * @returns true si el token es válido para uso
   */
  isValid(): boolean {
    return (
      this.status === TokenStatus.ACTIVE &&
      this.expiresAt > new Date() &&
      this.attemptCount < 5 // Máximo 5 intentos
    );
  }

  /**
   * Verifica si el token ha expirado
   * 
   * @returns true si el token ha expirado
   */
  isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  /**
   * Verifica si el token ya fue utilizado
   * 
   * @returns true si el token ya fue utilizado
   */
  isUsed(): boolean {
    return this.status === TokenStatus.USED;
  }

  /**
   * Verifica si el token fue revocado
   * 
   * @returns true si el token fue revocado
   */
  isRevoked(): boolean {
    return this.status === TokenStatus.REVOKED;
  }

  /**
   * Marca el token como utilizado
   * 
   * @param ipAddress IP desde donde se usó el token
   */
  markAsUsed(ipAddress?: string): void {
    this.status = TokenStatus.USED;
    this.usedAt = new Date();
    this.usedFromIp = ipAddress;
  }

  /**
   * Marca el token como expirado
   */
  markAsExpired(): void {
    this.status = TokenStatus.EXPIRED;
  }

  /**
   * Revoca el token por razones de seguridad
   */
  revoke(): void {
    this.status = TokenStatus.REVOKED;
  }

  /**
   * Incrementa el contador de intentos de uso
   * 
   * @param ipAddress IP del intento
   */
  incrementAttempts(ipAddress?: string): void {
    this.attemptCount++;
    
    // Si excede los intentos máximos, revocar el token
    if (this.attemptCount >= 5) {
      this.revoke();
    }
  }

  /**
   * Calcula el tiempo restante antes de la expiración
   * 
   * @returns Minutos restantes hasta la expiración
   */
  getMinutesUntilExpiration(): number {
    const now = new Date();
    const diffMs = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }

  /**
   * Verifica si el token puede ser extendido
   * 
   * @returns true si el token puede tener su expiración extendida
   */
  canBeExtended(): boolean {
    return (
      this.status === TokenStatus.ACTIVE &&
      this.attemptCount === 0 &&
      this.getMinutesUntilExpiration() > 0
    );
  }

  /**
   * Extiende la expiración del token
   * 
   * @param minutes Minutos adicionales de validez
   */
  extendExpiration(minutes: number = 60): void {
    if (this.canBeExtended()) {
      const additionalTime = minutes * 60 * 1000; // Convertir a millisegundos
      this.expiresAt = new Date(this.expiresAt.getTime() + additionalTime);
    }
  }
}