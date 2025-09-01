import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { 
  AuthenticationException, 
  DataConflictException, 
  ValidationException 
} from '../../common/exceptions/business.exception';
import { OperationResult } from '../../common/interfaces/contracts.interface';

/**
 * Resultado de autenticación
 */
export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
  expiresIn: number;
}

/**
 * Servicio de autenticación mejorado para producción
 * Implementa principios SOLID:
 * - Single Responsibility: Solo maneja autenticación
 * - Open/Closed: Extensible para nuevos métodos de auth
 * - Dependency Inversion: Depende de abstracciones
 */
@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly TOKEN_EXPIRY = '24h';
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registra un nuevo usuario con validaciones robustas
   * @param registerDto - Datos de registro
   * @returns Resultado de la operación
   */
  async register(registerDto: RegisterDto): Promise<OperationResult<AuthResult>> {
    try {
      // Validar datos de entrada
      await this.validateRegistrationData(registerDto);

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email.toLowerCase() },
      });

      if (existingUser) {
        throw new DataConflictException(
          'email',
          registerDto.email,
          '/auth/register'
        );
      }

      // Hash de la contraseña con salt seguro
      const hashedPassword = await this.hashPassword(registerDto.password);

      // Crear nuevo usuario con valores por defecto seguros
      const userData = {
        email: registerDto.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: registerDto.firstName?.trim() || '',
        lastName: registerDto.lastName?.trim() || '',
        name: this.buildFullName(registerDto.firstName, registerDto.lastName),
        role: registerDto.role,
        coins: registerDto.role === UserRole.STUDENT ? 50 : 0,
        level: 1,
        experience: 0,
        preferences: {},
        isActive: true,
        loginAttempts: 0,
        lastLoginAt: null,
        createdAt: new Date(),
      };

      const user = this.userRepository.create(userData);
      const savedUser = await this.userRepository.save(user);

      // Generar token JWT
      const token = await this.generateToken(savedUser);
      const userWithoutPassword = this.removePasswordFromUser(savedUser);

      return {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: userWithoutPassword,
          token,
          expiresIn: 24 * 60 * 60, // 24 horas en segundos
        },
      };
    } catch (error) {
      if (error instanceof DataConflictException) {
        throw error;
      }
      
      throw new ValidationException(
        'Error en el registro de usuario',
        { general: [error.message || 'Error interno del servidor'] },
        '/auth/register'
      );
    }
  }

  /**
   * Inicia sesión con validaciones de seguridad
   * @param loginDto - Datos de login
   * @returns Resultado de la operación
   */
  async login(loginDto: LoginDto): Promise<OperationResult<AuthResult>> {
    try {
      const { email, password } = loginDto;

      // Buscar usuario por email
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase(), isActive: true },
      });

      if (!user) {
        throw new AuthenticationException(
          'Credenciales inválidas',
          '/auth/login'
        );
      }

      // Verificar si la cuenta está bloqueada
      if (await this.isAccountLocked(user)) {
        throw new AuthenticationException(
          `Cuenta bloqueada por múltiples intentos fallidos. Intente nuevamente después de ${Math.ceil(this.LOCKOUT_TIME / 60000)} minutos`,
          '/auth/login'
        );
      }

      // Verificar contraseña
      const isPasswordValid = await this.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        await this.handleFailedLogin(user);
        throw new AuthenticationException(
          'Credenciales inválidas',
          '/auth/login'
        );
      }

      // Login exitoso - resetear intentos fallidos
      await this.handleSuccessfulLogin(user);

      // Generar token JWT
      const token = await this.generateToken(user);
      const userWithoutPassword = this.removePasswordFromUser(user);

      return {
        success: true,
        message: 'Login exitoso',
        data: {
          user: userWithoutPassword,
          token,
          expiresIn: 24 * 60 * 60,
        },
      };
    } catch (error) {
      if (error instanceof AuthenticationException) {
        throw error;
      }

      throw new AuthenticationException(
        'Error en el proceso de autenticación',
        '/auth/login'
      );
    }
  }

  /**
   * Valida un usuario para estrategias de Passport
   * @param email - Email del usuario
   * @param password - Contraseña
   * @returns Usuario válido o null
   */
  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase(), isActive: true },
      });

      if (user && await this.verifyPassword(password, user.password)) {
        return this.removePasswordFromUser(user);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtiene un usuario por ID de forma segura
   * @param id - ID del usuario
   * @returns Usuario sin contraseña
   */
  async getUserById(id: string): Promise<OperationResult<Omit<User, 'password'>>> {
    try {
      const user = await this.userRepository.findOne({
        where: { id, isActive: true },
        select: [
          'id', 'email', 'firstName', 'lastName', 'name', 'role', 
          'avatar', 'coins', 'level', 'experience', 'preferences', 
          'createdAt', 'updatedAt', 'lastLoginAt'
        ],
      });

      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado',
        };
      }

      return {
        success: true,
        message: 'Usuario encontrado',
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener usuario',
        details: { error: error.message },
      };
    }
  }

  /**
   * Valida los datos de registro
   * @param registerDto - Datos a validar
   * @private
   */
  private async validateRegistrationData(registerDto: RegisterDto): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Validar email
    if (!registerDto.email || !this.isValidEmail(registerDto.email)) {
      errors.email = ['Email inválido'];
    }

    // Validar contraseña
    if (!this.isStrongPassword(registerDto.password)) {
      errors.password = [
        'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y caracteres especiales'
      ];
    }

    // Validar nombres
    if (!registerDto.firstName || registerDto.firstName.trim().length < 2) {
      errors.firstName = ['El nombre debe tener al menos 2 caracteres'];
    }

    if (!registerDto.lastName || registerDto.lastName.trim().length < 2) {
      errors.lastName = ['El apellido debe tener al menos 2 caracteres'];
    }

    // Validar rol
    if (!Object.values(UserRole).includes(registerDto.role)) {
      errors.role = ['Rol inválido'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(
        'Datos de registro inválidos',
        errors,
        '/auth/register'
      );
    }
  }

  /**
   * Verifica si un email es válido
   * @param email - Email a validar
   * @returns True si es válido
   * @private
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Verifica si una contraseña es segura
   * @param password - Contraseña a validar
   * @returns True si es segura
   * @private
   */
  private isStrongPassword(password: string): boolean {
    if (!password || password.length < 8) return false;
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }

  /**
   * Construye el nombre completo del usuario
   * @param firstName - Nombre
   * @param lastName - Apellido
   * @returns Nombre completo
   * @private
   */
  private buildFullName(firstName?: string, lastName?: string): string {
    const first = firstName?.trim() || '';
    const last = lastName?.trim() || '';
    return `${first} ${last}`.trim();
  }

  /**
   * Hash seguro de contraseñas
   * @param password - Contraseña a hashear
   * @returns Hash de la contraseña
   * @private
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verifica una contraseña contra su hash
   * @param password - Contraseña en texto plano
   * @param hash - Hash almacenado
   * @returns True si coincide
   * @private
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Verifica si una cuenta está bloqueada
   * @param user - Usuario a verificar
   * @returns True si está bloqueada
   * @private
   */
  private async isAccountLocked(user: User): Promise<boolean> {
    if (!user.lockedUntil) return false;
    
    if (user.lockedUntil > new Date()) {
      return true;
    }

    // Si el tiempo de bloqueo ya pasó, limpiar el bloqueo
    await this.userRepository.update(user.id, {
      loginAttempts: 0,
      lockedUntil: null,
    });

    return false;
  }

  /**
   * Maneja un intento de login fallido
   * @param user - Usuario con login fallido
   * @private
   */
  private async handleFailedLogin(user: User): Promise<void> {
    const loginAttempts = (user.loginAttempts || 0) + 1;
    const updateData: Partial<User> = { loginAttempts };

    if (loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + this.LOCKOUT_TIME);
    }

    await this.userRepository.update(user.id, updateData);
  }

  /**
   * Maneja un login exitoso
   * @param user - Usuario con login exitoso
   * @private
   */
  private async handleSuccessfulLogin(user: User): Promise<void> {
    await this.userRepository.update(user.id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });
  }

  /**
   * Genera un token JWT seguro
   * @param user - Usuario para el token
   * @returns Token JWT
   * @private
   */
  private async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.TOKEN_EXPIRY,
    });
  }

  /**
   * Remueve la contraseña del objeto usuario
   * @param user - Usuario completo
   * @returns Usuario sin contraseña
   * @private
   */
  private removePasswordFromUser(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    // Asegurar que completedActivities esté disponible como getter
    return {
      ...userWithoutPassword,
      completedActivities: user.completedActivities
    };
  }
}
