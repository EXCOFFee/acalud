/**
 * 👤 INTERCEPTOR DE VALIDACIÓN DE USUARIOS
 * 
 * Intercepta peticiones para validar operaciones de usuarios antes del procesamiento,
 * incluyendo validaciones de seguridad, permisos, y reglas de negocio.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Configuración de validación de usuarios
 */
interface UserValidationConfig {
  minPasswordLength: number;
  maxPasswordLength: number;
  minAge: number;
  maxAge: number;
  allowedRoles: string[];
  emailDomainWhitelist: string[];
  requireStrongPassword: boolean;
}

@Injectable()
export class UserValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UserValidationInterceptor.name);
  private readonly config: UserValidationConfig;

  constructor() {
    this.config = {
      minPasswordLength: 8,
      maxPasswordLength: 128,
      minAge: 5,
      maxAge: 120,
      allowedRoles: ['student', 'teacher', 'admin'],
      emailDomainWhitelist: [], // Vacío = todos los dominios permitidos
      requireStrongPassword: true,
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.requestId || this.generateRequestId();

    try {
      // Validar operaciones de usuario
      this.validateUserOperation(request, requestId);
      
      this.logger.log(`✅ [${requestId}] Validación de usuario completada exitosamente`);
    } catch (error) {
      this.logger.error(`❌ [${requestId}] Error en validación: ${error.message}`);
      throw error;
    }

    return next.handle();
  }

  /**
   * 🔍 Validar operación de usuario
   */
  private validateUserOperation(request: any, requestId: string): void {
    const { method, body, params, user: currentUser } = request;
    
    // Validar según el tipo de operación
    if (method === 'POST' && body) {
      this.validateUserCreation(body, requestId);
    } else if ((method === 'PUT' || method === 'PATCH') && body) {
      this.validateUserUpdate(body, params, currentUser, requestId);
    } else if (method === 'DELETE') {
      this.validateUserDeletion(params, currentUser, requestId);
    }
  }

  /**
   * 📝 Validar creación de usuario
   */
  private validateUserCreation(body: any, requestId: string): void {
    this.logger.log(`📝 [${requestId}] Validando creación de usuario`);

    // Validar email
    if (!body.email) {
      throw new BadRequestException('Email es obligatorio');
    }

    if (!this.isValidEmail(body.email)) {
      throw new BadRequestException('Email debe tener un formato válido');
    }

    // Validar dominio de email si hay whitelist
    if (this.config.emailDomainWhitelist.length > 0) {
      const domain = body.email.split('@')[1];
      if (!this.config.emailDomainWhitelist.includes(domain)) {
        throw new BadRequestException(`Dominio de email no permitido: ${domain}`);
      }
    }

    // Validar contraseña
    if (!body.password) {
      throw new BadRequestException('Contraseña es obligatoria');
    }

    this.validatePassword(body.password, requestId);

    // Validar nombres
    if (!body.firstName || body.firstName.trim().length === 0) {
      throw new BadRequestException('Nombre es obligatorio');
    }

    if (!body.lastName || body.lastName.trim().length === 0) {
      throw new BadRequestException('Apellido es obligatorio');
    }

    // Validar rol
    if (body.role && !this.config.allowedRoles.includes(body.role)) {
      throw new BadRequestException(`Rol no válido. Roles permitidos: ${this.config.allowedRoles.join(', ')}`);
    }

    // Validar fecha de nacimiento
    if (body.dateOfBirth) {
      this.validateDateOfBirth(body.dateOfBirth, requestId);
    }

    this.logger.log(`✅ [${requestId}] Datos de creación válidos`);
  }

  /**
   * ✏️ Validar actualización de usuario
   */
  private validateUserUpdate(body: any, params: any, currentUser: any, requestId: string): void {
    this.logger.log(`✏️ [${requestId}] Validando actualización de usuario`);

    const targetUserId = params.id;

    // Verificar que el usuario puede actualizar
    if (currentUser && currentUser.id !== targetUserId && currentUser.role !== 'admin') {
      this.logger.error(`❌ [${requestId}] Usuario ${currentUser.id} intentó actualizar usuario ${targetUserId} sin permisos`);
      throw new ForbiddenException('No tienes permisos para actualizar este usuario');
    }

    // Validar email si se está actualizando
    if (body.email && !this.isValidEmail(body.email)) {
      throw new BadRequestException('Email debe tener un formato válido');
    }

    // Validar contraseña si se está actualizando
    if (body.password) {
      this.validatePassword(body.password, requestId);
    }

    // Validar rol (solo admins pueden cambiar roles)
    if (body.role && currentUser && currentUser.role !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden cambiar roles');
    }

    // Validar que no se puede cambiar de admin a otro rol si es el último admin
    if (body.role && currentUser && currentUser.role === 'admin' && body.role !== 'admin') {
      this.logger.warn(`⚠️ [${requestId}] Intento de cambiar rol de admin - requiere verificación adicional`);
      // En producción, verificar que no sea el último admin
    }

    // Validar fecha de nacimiento
    if (body.dateOfBirth) {
      this.validateDateOfBirth(body.dateOfBirth, requestId);
    }

    this.logger.log(`✅ [${requestId}] Datos de actualización válidos`);
  }

  /**
   * 🗑️ Validar eliminación de usuario
   */
  private validateUserDeletion(params: any, currentUser: any, requestId: string): void {
    this.logger.log(`🗑️ [${requestId}] Validando eliminación de usuario`);

    const targetUserId = params.id;

    // Verificar que el usuario puede eliminar
    if (currentUser && currentUser.id !== targetUserId && currentUser.role !== 'admin') {
      this.logger.error(`❌ [${requestId}] Usuario ${currentUser.id} intentó eliminar usuario ${targetUserId} sin permisos`);
      throw new ForbiddenException('No tienes permisos para eliminar este usuario');
    }

    // Prevenir auto-eliminación de admins
    if (currentUser && currentUser.role === 'admin' && currentUser.id === targetUserId) {
      this.logger.warn(`⚠️ [${requestId}] Admin intentó auto-eliminarse - requiere confirmación adicional`);
      // En producción, requerir confirmación especial
    }

    this.logger.log(`✅ [${requestId}] Eliminación permitida`);
  }

  /**
   * 🔐 Validar fortaleza de contraseña
   */
  private validatePassword(password: string, requestId: string): void {
    if (password.length < this.config.minPasswordLength) {
      throw new BadRequestException(
        `Contraseña debe tener al menos ${this.config.minPasswordLength} caracteres`
      );
    }

    if (password.length > this.config.maxPasswordLength) {
      throw new BadRequestException(
        `Contraseña no puede exceder ${this.config.maxPasswordLength} caracteres`
      );
    }

    if (this.config.requireStrongPassword) {
      // Validar contraseña fuerte
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new BadRequestException(
          'Contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'
        );
      }

      // Validar contraseñas comunes
      const commonPasswords = [
        'password', 'Password123', '12345678', 'qwerty', 'abc123',
        'password1', 'Password1', '123456789', 'letmein', 'welcome'
      ];

      if (commonPasswords.includes(password)) {
        throw new BadRequestException('Contraseña demasiado común. Elige una más segura');
      }

      this.logger.log(`✅ [${requestId}] Contraseña cumple requisitos de seguridad`);
    }
  }

  /**
   * 🎂 Validar fecha de nacimiento
   */
  private validateDateOfBirth(dateOfBirth: string | Date, requestId: string): void {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    // Validar que la fecha es válida
    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException('Fecha de nacimiento no válida');
    }

    // Validar que no es fecha futura
    if (birthDate > today) {
      throw new BadRequestException('Fecha de nacimiento no puede ser futura');
    }

    // Calcular edad
    const age = this.calculateAge(birthDate);

    // Validar edad mínima
    if (age < this.config.minAge) {
      throw new BadRequestException(`Edad mínima permitida: ${this.config.minAge} años`);
    }

    // Validar edad máxima
    if (age > this.config.maxAge) {
      throw new BadRequestException('Fecha de nacimiento no válida');
    }

    this.logger.log(`✅ [${requestId}] Fecha de nacimiento válida (Edad: ${age} años)`);
  }

  /**
   * 📧 Validar formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 🎂 Calcular edad desde fecha de nacimiento
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * 🆔 Generar ID único para la petición
   */
  private generateRequestId(): string {
    return `user_val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
