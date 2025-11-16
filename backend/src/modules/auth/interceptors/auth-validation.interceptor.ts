import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * 🛡️ Interceptor de validación para operaciones de autenticación
 * Valida credenciales y datos de registro antes de procesarlos
 */
@Injectable()
export class AuthValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthValidationInterceptor.name);

  // Configuración de validaciones
  private readonly config = {
    minPasswordLength: 8,
    maxPasswordLength: 128,
    maxEmailLength: 254,
    maxNameLength: 50,
    minNameLength: 2,
    allowedEmailDomains: [], // Vacío = todos permitidos
    blockedEmailDomains: ['tempmail.com', 'throwaway.email', '10minutemail.com'],
    requireStrongPassword: true,
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutos en ms
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, body, url } = request;
    const requestId = `AUTH-${Date.now()}`;

    this.logger.log(`🔐 [${requestId}] Interceptando operación de autenticación: ${method} ${url}`);

    try {
      // Validar según el endpoint
      if (url.includes('/login') || url.includes('/auth/login')) {
        this.validateLogin(body, requestId);
      } else if (url.includes('/register') || url.includes('/auth/register')) {
        this.validateRegister(body, requestId);
      } else if (url.includes('/password-recovery') || url.includes('/forgot-password')) {
        this.validatePasswordRecovery(body, requestId);
      } else if (url.includes('/reset-password')) {
        this.validatePasswordReset(body, requestId);
      }

      this.logger.log(`✅ [${requestId}] Validación de autenticación exitosa`);
      return next.handle();

    } catch (error) {
      this.logger.error(`❌ [${requestId}] Error de validación de autenticación: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔑 Validar inicio de sesión
   */
  private validateLogin(body: any, requestId: string): void {
    this.logger.log(`🔑 [${requestId}] Validando credenciales de login`);

    // Validar email
    if (!body.email) {
      throw new BadRequestException('El email es obligatorio');
    }

    this.validateEmail(body.email, requestId);

    // Validar contraseña
    if (!body.password) {
      throw new BadRequestException('La contraseña es obligatoria');
    }

    if (typeof body.password !== 'string') {
      throw new BadRequestException('La contraseña debe ser un texto válido');
    }

    if (body.password.length === 0) {
      throw new BadRequestException('La contraseña no puede estar vacía');
    }

    if (body.password.length > this.config.maxPasswordLength) {
      throw new BadRequestException('La contraseña es demasiado larga');
    }

    this.logger.log(`✅ [${requestId}] Credenciales de login válidas`);
  }

  /**
   * 📝 Validar registro
   */
  private validateRegister(body: any, requestId: string): void {
    this.logger.log(`📝 [${requestId}] Validando datos de registro`);

    // Validar campos obligatorios
    const requiredFields = ['email', 'password', 'firstName', 'lastName', 'role'];
    for (const field of requiredFields) {
      if (!body[field]) {
        throw new BadRequestException(`El campo '${field}' es obligatorio`);
      }
    }

    // Validar email
    this.validateEmail(body.email, requestId);
    this.validateEmailDomain(body.email, requestId);

    // Validar contraseña
    this.validatePassword(body.password, requestId);

    // Validar nombres
    this.validateName(body.firstName, 'nombre', requestId);
    this.validateName(body.lastName, 'apellido', requestId);

    // Validar rol
    this.validateRole(body.role, requestId);

    this.logger.log(`✅ [${requestId}] Datos de registro válidos`);
  }

  /**
   * 🔄 Validar recuperación de contraseña
   */
  private validatePasswordRecovery(body: any, requestId: string): void {
    this.logger.log(`🔄 [${requestId}] Validando recuperación de contraseña`);

    if (!body.email) {
      throw new BadRequestException('El email es obligatorio');
    }

    this.validateEmail(body.email, requestId);

    this.logger.log(`✅ [${requestId}] Solicitud de recuperación válida`);
  }

  /**
   * 🔐 Validar reset de contraseña
   */
  private validatePasswordReset(body: any, requestId: string): void {
    this.logger.log(`🔐 [${requestId}] Validando reset de contraseña`);

    if (!body.token) {
      throw new BadRequestException('El token de recuperación es obligatorio');
    }

    if (!body.newPassword) {
      throw new BadRequestException('La nueva contraseña es obligatoria');
    }

    this.validatePassword(body.newPassword, requestId);

    this.logger.log(`✅ [${requestId}] Reset de contraseña válido`);
  }

  /**
   * 📧 Validar email
   */
  private validateEmail(email: string, requestId: string): void {
    if (typeof email !== 'string') {
      throw new BadRequestException('El email debe ser un texto válido');
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail.length === 0) {
      throw new BadRequestException('El email no puede estar vacío');
    }

    if (trimmedEmail.length > this.config.maxEmailLength) {
      throw new BadRequestException('El email es demasiado largo');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new BadRequestException('El email no tiene un formato válido');
    }

    // Validar que no tenga caracteres peligrosos
    const dangerousChars = ['<', '>', '"', "'", ';', '\\', '/', '{', '}'];
    if (dangerousChars.some(char => trimmedEmail.includes(char))) {
      throw new BadRequestException('El email contiene caracteres no permitidos');
    }

    this.logger.log(`✅ [${requestId}] Email válido: ${trimmedEmail}`);
  }

  /**
   * 🌐 Validar dominio de email
   */
  private validateEmailDomain(email: string, requestId: string): void {
    const domain = email.split('@')[1]?.toLowerCase();

    if (!domain) {
      throw new BadRequestException('El email no tiene un dominio válido');
    }

    // Verificar dominios bloqueados
    if (this.config.blockedEmailDomains.includes(domain)) {
      this.logger.warn(`⚠️ [${requestId}] Intento de registro con dominio bloqueado: ${domain}`);
      throw new BadRequestException('Este dominio de email no está permitido');
    }

    // Verificar dominios permitidos (si hay lista whitelist)
    if (this.config.allowedEmailDomains.length > 0) {
      if (!this.config.allowedEmailDomains.includes(domain)) {
        this.logger.warn(`⚠️ [${requestId}] Intento de registro con dominio no permitido: ${domain}`);
        throw new BadRequestException('Este dominio de email no está autorizado');
      }
    }

    this.logger.log(`✅ [${requestId}] Dominio de email válido: ${domain}`);
  }

  /**
   * 🔒 Validar contraseña
   */
  private validatePassword(password: string, requestId: string): void {
    if (typeof password !== 'string') {
      throw new BadRequestException('La contraseña debe ser un texto válido');
    }

    // Validar longitud
    if (password.length < this.config.minPasswordLength) {
      throw new BadRequestException(
        `La contraseña debe tener al menos ${this.config.minPasswordLength} caracteres`
      );
    }

    if (password.length > this.config.maxPasswordLength) {
      throw new BadRequestException(
        `La contraseña no puede exceder ${this.config.maxPasswordLength} caracteres`
      );
    }

    // Validar contraseña fuerte si está habilitado
    if (this.config.requireStrongPassword) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new BadRequestException(
          'La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial'
        );
      }

      // Validar contraseñas comunes
      const commonPasswords = [
        'password', 'Password123', 'Password123!', '12345678', 'qwerty123',
        'abc123', 'password1', 'Password1', '123456789', 'letmein',
        'welcome', 'Welcome123', 'Admin123', 'Admin123!', 'Test1234!',
      ];

      if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
        throw new BadRequestException('La contraseña es demasiado común. Elige una más segura');
      }

      // Validar secuencias simples
      const sequenceRegex = /(012|123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh)/i;
      if (sequenceRegex.test(password)) {
        throw new BadRequestException('La contraseña contiene secuencias demasiado simples');
      }

      this.logger.log(`✅ [${requestId}] Contraseña cumple requisitos de seguridad`);
    }
  }

  /**
   * 👤 Validar nombre
   */
  private validateName(name: string, fieldName: string, requestId: string): void {
    if (typeof name !== 'string') {
      throw new BadRequestException(`El ${fieldName} debe ser un texto válido`);
    }

    const trimmedName = name.trim();

    if (trimmedName.length < this.config.minNameLength) {
      throw new BadRequestException(
        `El ${fieldName} debe tener al menos ${this.config.minNameLength} caracteres`
      );
    }

    if (trimmedName.length > this.config.maxNameLength) {
      throw new BadRequestException(
        `El ${fieldName} no puede exceder ${this.config.maxNameLength} caracteres`
      );
    }

    // Validar que solo contenga letras, espacios y caracteres permitidos
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
    if (!nameRegex.test(trimmedName)) {
      throw new BadRequestException(`El ${fieldName} contiene caracteres no permitidos`);
    }

    // Validar que no tenga números
    if (/\d/.test(trimmedName)) {
      throw new BadRequestException(`El ${fieldName} no puede contener números`);
    }

    this.logger.log(`✅ [${requestId}] ${fieldName} válido: ${trimmedName}`);
  }

  /**
   * 👔 Validar rol
   */
  private validateRole(role: string, requestId: string): void {
    const allowedRoles = ['student', 'teacher', 'admin'];

    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(
        `Rol no válido. Roles permitidos: ${allowedRoles.join(', ')}`
      );
    }

    // Prevenir creación de admins sin autorización adicional
    if (role === 'admin') {
      this.logger.warn(`⚠️ [${requestId}] Intento de registro como admin`);
      // En producción, esto debería verificar permisos adicionales
    }

    this.logger.log(`✅ [${requestId}] Rol válido: ${role}`);
  }
}
