// ============================================================================
// 🔐 SERVICIO DE AUTENTICACIÓN MEJORADO - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este archivo contiene el sistema completo de autenticación (login/register) 
 * de la plataforma AcaLud. Es como el "guardia de seguridad" de toda la aplicación.
 * 
 * 🏗️ ¿CÓMO ESTÁ ORGANIZADO?
 * - Interfaces: Definen "contratos" de cómo deben verse los datos
 * - Clases de almacenamiento: Guardan tokens de manera segura
 * - Validadores: Verifican que los datos sean correctos
 * - Servicio principal: Hace todo el trabajo de autenticación
 * 
 * 🎓 PRINCIPIOS APLICADOS:
 * - SOLID: Cada clase tiene una responsabilidad específica
 * - Singleton: Solo existe una instancia del servicio
 * - Validación: Todos los datos se verifican antes de usar
 * - Manejo de errores: Errores específicos y claros
 */

// 📦 IMPORTACIONES
// Traemos las herramientas que necesitamos de otros archivos
import { httpClient, HttpError } from './http.service';  // Para hacer peticiones HTTP
import { User } from '../types';                         // Tipo de datos del usuario

/**
 * 📝 INTERFAZ PARA DATOS DE LOGIN
 * 
 * ¿Qué es una interfaz?
 * Es como un "molde" que define exactamente qué datos necesitamos.
 * Si alguien quiere hacer login, DEBE enviar email y password.
 */
export interface LoginCredentials {
  email: string;     // 📧 Email del usuario (ej: "juan@email.com")
  password: string;  // 🔒 Contraseña del usuario
}

/**
 * 📝 INTERFAZ PARA DATOS DE REGISTRO
 * 
 * ¿Qué incluye?
 * Todo lo que necesitamos para crear una cuenta nueva.
 * Incluye datos básicos + el rol (profesor o estudiante).
 */
export interface RegisterData {
  email: string;                    // 📧 Email único del usuario
  password: string;                 // 🔒 Contraseña para la cuenta
  name: string;                    // 👤 Nombre completo del usuario
  role: 'teacher' | 'student';     // 🎭 Rol: solo puede ser profesor o estudiante
  avatar?: string;                 // 🖼️ URL de la foto de perfil (opcional)
}

/**
 * 📝 INTERFAZ PARA RESPUESTA DE AUTENTICACIÓN
 * 
 * ¿Qué devuelve el servidor después de un login exitoso?
 * Esta interfaz define exactamente qué información recibiremos.
 */
export interface AuthResponse {
  user: User;              // 👤 Datos completos del usuario
  token: string;           // 🎫 Token de acceso (como una "entrada" temporal)
  refreshToken?: string;   // 🔄 Token para renovar el acceso (opcional)
  expiresIn: number;      // ⏰ Cuánto tiempo dura el token (en segundos)
}

/**
 * 📝 INTERFAZ PARA VERIFICACIÓN DE TOKEN
 * 
 * ¿Para qué sirve?
 * Cuando verificamos si un token sigue siendo válido,
 * esta interfaz define qué información recibimos de vuelta.
 */
export interface TokenVerificationResult {
  valid: boolean;          // ✅ ¿El token es válido?
  user?: User;            // 👤 Datos del usuario (si el token es válido)
  error?: string;         // ❌ Mensaje de error (si algo salió mal)
  needsRefresh?: boolean; // 🔄 ¿Necesita renovar el token?
}

/**
 * 📝 INTERFAZ PARA ALMACENAMIENTO DE TOKENS
 * 
 * ¿Qué hace?
 * Define los métodos que cualquier sistema de almacenamiento de tokens debe tener.
 * Es como un "contrato" que garantiza que podemos guardar/recuperar tokens.
 */
export interface ITokenStorage {
  getToken(): string | null;              // 📤 Obtener token de acceso
  setToken(token: string): void;          // 📥 Guardar token de acceso
  removeToken(): void;                    // 🗑️ Eliminar token de acceso
  getRefreshToken(): string | null;       // 📤 Obtener token de renovación
  setRefreshToken(token: string): void;   // 📥 Guardar token de renovación
  removeRefreshToken(): void;             // 🗑️ Eliminar token de renovación
}

/**
 * 💾 IMPLEMENTACIÓN DE ALMACENAMIENTO EN NAVEGADOR
 * 
 * ¿Qué hace esta clase?
 * Guarda los tokens en el localStorage del navegador (como cookies, pero más seguro).
 * Implementa la interfaz ITokenStorage que definimos arriba.
 * 
 * ¿Qué es localStorage?
 * Es un lugar en el navegador donde podemos guardar datos que persisten
 * incluso cuando el usuario cierra y abre la página.
 */
export class LocalTokenStorage implements ITokenStorage {
  // 🔑 Nombres únicos para identificar nuestros datos en localStorage
  private readonly TOKEN_KEY = 'acalud_token';         // Clave para el token principal
  private readonly REFRESH_TOKEN_KEY = 'acalud_refresh_token';  // Clave para token de renovación

  /**
   * 📤 OBTENER TOKEN DE ACCESO
   * Busca el token en localStorage y lo devuelve (o null si no existe)
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * 📥 GUARDAR TOKEN DE ACCESO
   * Almacena el token en localStorage para uso futuro
   */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * 🗑️ ELIMINAR TOKEN DE ACCESO
   * Borra el token de localStorage (útil para logout)
   */
  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * 📤 OBTENER TOKEN DE RENOVACIÓN
   * Similar al token principal, pero este se usa para renovar sesiones
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * 📥 GUARDAR TOKEN DE RENOVACIÓN
   * Almacena el token de renovación para uso futuro
   */
  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  /**
   * 🗑️ ELIMINAR TOKEN DE RENOVACIÓN
   * Borra el token de renovación de localStorage
   */
  removeRefreshToken(): void {
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
}

/**
 * 🏷️ ENUM PARA TIPOS DE ERRORES DE AUTENTICACIÓN
 * 
 * ¿Qué es un enum?
 * Es una lista de constantes con nombres descriptivos.
 * En lugar de usar números o códigos raros, usamos nombres claros.
 * 
 * ¿Por qué es útil?
 * - Hace el código más legible
 * - Evita errores de tipeo
 * - Facilita el mantenimiento
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',     // 🚫 Email o contraseña incorrectos
  USER_NOT_FOUND = 'USER_NOT_FOUND',               // 👤 Usuario no existe
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',   // 📧 Email ya está registrado
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',                 // ⏰ Token ha expirado
  TOKEN_INVALID = 'TOKEN_INVALID',                 // 🎫 Token no es válido
  SESSION_EXPIRED = 'SESSION_EXPIRED',             // 🕐 Sesión ha expirado
  NETWORK_ERROR = 'NETWORK_ERROR',                 // 🌐 Error de conexión
  VALIDATION_ERROR = 'VALIDATION_ERROR',           // ❌ Datos inválidos
  UNAUTHORIZED = 'UNAUTHORIZED',                   // 🚫 No autorizado
  UNAUTHENTICATED = 'UNAUTHENTICATED',            // 🔐 No autenticado
  FORBIDDEN = 'FORBIDDEN',                        // 🚷 Prohibido
  SERVER_ERROR = 'SERVER_ERROR'                   // 🔥 Error del servidor
}

/**
 * Clase para errores específicos de autenticación
 */
export class AuthError extends Error {
  public readonly type: AuthErrorType;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(type: AuthErrorType, message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AuthError';
  }

  static fromHttpError(httpError: HttpError): AuthError {
    let type: AuthErrorType;
    let message = httpError.message;

    switch (httpError.statusCode) {
      case 401:
        type = AuthErrorType.UNAUTHORIZED;
        message = 'Credenciales inválidas o sesión expirada';
        break;
      case 403:
        type = AuthErrorType.FORBIDDEN;
        message = 'No tienes permisos para realizar esta acción';
        break;
      case 404:
        type = AuthErrorType.USER_NOT_FOUND;
        message = 'Usuario no encontrado';
        break;
      case 409:
        type = AuthErrorType.EMAIL_ALREADY_EXISTS;
        message = 'El email ya está registrado';
        break;
      case 422:
        type = AuthErrorType.VALIDATION_ERROR;
        message = 'Datos de entrada inválidos';
        break;
      case 0:
        type = AuthErrorType.NETWORK_ERROR;
        message = 'Error de conexión. Verifica tu conexión a internet';
        break;
      default:
        type = AuthErrorType.SERVER_ERROR;
        message = 'Error interno del servidor';
    }

    return new AuthError(type, message, httpError.statusCode, httpError);
  }
}

/**
 * Interfaz para el servicio de autenticación
 */
export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(userData: RegisterData): Promise<AuthResponse>;
  logout(): Promise<void>;
  getProfile(): Promise<User>;
  verifyToken(): Promise<TokenVerificationResult>;
  refreshToken(): Promise<AuthResponse>;
  isAuthenticated(): boolean;
  getCurrentUser(): User | null;
  updateProfile(updates: Partial<User>): Promise<User>;
  waitForInitialization(): Promise<void>;
}

/**
 * Validador para datos de autenticación
 */
export class AuthValidator {
  static validateEmail(email: string): string[] {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('El email es requerido');
      return errors;
    }

    if (typeof email !== 'string') {
      errors.push('El email debe ser una cadena de texto');
      return errors;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('El formato del email no es válido');
    }

    if (email.length > 254) {
      errors.push('El email es demasiado largo');
    }

    return errors;
  }

  static validatePassword(password: string): string[] {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('La contraseña es requerida');
      return errors;
    }

    if (typeof password !== 'string') {
      errors.push('La contraseña debe ser una cadena de texto');
      return errors;
    }

    if (password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (password.length > 128) {
      errors.push('La contraseña es demasiado larga');
    }

    return errors;
  }

  static validateName(name: string): string[] {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('El nombre es requerido');
      return errors;
    }

    if (typeof name !== 'string') {
      errors.push('El nombre debe ser una cadena de texto');
      return errors;
    }

    if (name.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (name.length > 100) {
      errors.push('El nombre es demasiado largo');
    }

    return errors;
  }

  static validateRole(role: string): string[] {
    const errors: string[] = [];
    
    if (!role) {
      errors.push('El rol es requerido');
      return errors;
    }

    if (!['teacher', 'student'].includes(role)) {
      errors.push('El rol debe ser "teacher" o "student"');
    }

    return errors;
  }

  static validateLoginCredentials(credentials: LoginCredentials): string[] {
    const errors: string[] = [];
    
    errors.push(...this.validateEmail(credentials.email));
    errors.push(...this.validatePassword(credentials.password));

    return errors;
  }

  static validateRegisterData(data: RegisterData): string[] {
    const errors: string[] = [];
    
    errors.push(...this.validateEmail(data.email));
    errors.push(...this.validatePassword(data.password));
    errors.push(...this.validateName(data.name));
    errors.push(...this.validateRole(data.role));

    return errors;
  }
}

/**
 * Servicio de autenticación mejorado con principios SOLID
 */
export class EnhancedAuthService implements IAuthService {
  private static instance: EnhancedAuthService;
  private currentUser: User | null = null;
  private tokenStorage: ITokenStorage;
  private isInitialized = false;

  private constructor(tokenStorage: ITokenStorage = new LocalTokenStorage()) {
    this.tokenStorage = tokenStorage;
    this.initialize();
  }

  public static getInstance(tokenStorage?: ITokenStorage): EnhancedAuthService {
    if (!EnhancedAuthService.instance) {
      EnhancedAuthService.instance = new EnhancedAuthService(tokenStorage);
    }
    return EnhancedAuthService.instance;
  }

  /**
   * Inicializa el servicio
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const token = this.tokenStorage.getToken();
      if (token) {
        httpClient.setAuthToken(token);
        await this.loadCurrentUser();
      }
    } catch (error) {
      console.warn('Error al inicializar servicio de autenticación:', error);
      this.clearAuth();
    } finally {
      this.isInitialized = true;
    }
  }

  /**
   * Carga el usuario actual desde el servidor
   */
  private async loadCurrentUser(): Promise<void> {
    try {
      const verificationResult = await this.verifyToken();
      if (verificationResult.valid && verificationResult.user) {
        this.currentUser = verificationResult.user;
      } else {
        this.clearAuth();
      }
    } catch (error) {
      console.warn('Error al cargar usuario actual:', error);
      this.clearAuth();
    }
  }

  /**
   * Limpia la autenticación
   */
  private clearAuth(): void {
    this.currentUser = null;
    this.tokenStorage.removeToken();
    this.tokenStorage.removeRefreshToken();
    httpClient.setAuthToken(null);
  }

  /**
   * Maneja errores HTTP y los convierte en AuthError
   */
  private handleError(error: any): never {
    if (error instanceof HttpError) {
      throw AuthError.fromHttpError(error);
    }
    
    if (error instanceof AuthError) {
      throw error;
    }

    // Error desconocido
    throw new AuthError(
      AuthErrorType.SERVER_ERROR,
      'Error inesperado del servidor',
      500,
      error
    );
  }

  /**
   * Inicia sesión con credenciales
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Validar datos de entrada
      const validationErrors = AuthValidator.validateLoginCredentials(credentials);
      if (validationErrors.length > 0) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          validationErrors.join(', '),
          422,
          { validationErrors }
        );
      }

      // Realizar login
      const apiResponse = await httpClient.post<{data: AuthResponse}>('/auth/login', {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password
      });

      // Extraer datos de la respuesta anidada
      const response = apiResponse.data;

      // Guardar tokens y usuario
      this.tokenStorage.setToken(response.token);
      if (response.refreshToken) {
        this.tokenStorage.setRefreshToken(response.refreshToken);
      }
      httpClient.setAuthToken(response.token);
      this.currentUser = response.user;

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Validar datos de entrada
      const validationErrors = AuthValidator.validateRegisterData(userData);
      if (validationErrors.length > 0) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          validationErrors.join(', '),
          422,
          { validationErrors }
        );
      }

      // Realizar registro
      const apiResponse = await httpClient.post<{data: AuthResponse}>('/auth/register', {
        ...userData,
        email: userData.email.trim().toLowerCase(),
        name: userData.name.trim()
      });

      // Extraer datos de la respuesta anidada
      const response = apiResponse.data;

      // Guardar tokens y usuario
      this.tokenStorage.setToken(response.token);
      if (response.refreshToken) {
        this.tokenStorage.setRefreshToken(response.refreshToken);
      }
      httpClient.setAuthToken(response.token);
      this.currentUser = response.user;

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout(): Promise<void> {
    try {
      // Intentar notificar al servidor (opcional)
      try {
        await httpClient.post('/auth/logout');
      } catch (error) {
        console.warn('Error al notificar logout al servidor:', error);
      }
    } finally {
      // Siempre limpiar datos locales
      this.clearAuth();
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado
   */
  async getProfile(): Promise<User> {
    try {
      if (!this.isAuthenticated()) {
        throw new AuthError(
          AuthErrorType.UNAUTHORIZED,
          'No hay sesión activa',
          401
        );
      }

      const user = await httpClient.get<User>('/auth/profile');
      this.currentUser = user;
      return user;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Verifica si el token actual es válido
   */
  async verifyToken(): Promise<TokenVerificationResult> {
    try {
      const token = this.tokenStorage.getToken();
      if (!token) {
        return { valid: false, error: 'No hay token disponible' };
      }

      const response = await httpClient.get<{ valid: boolean; user: User }>('/auth/verify');
      
      if (response.valid && response.user) {
        this.currentUser = response.user;
        return { valid: true, user: response.user };
      } else {
        this.clearAuth();
        return { valid: false, error: 'Token inválido' };
      }
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 401) {
        this.clearAuth();
        return { 
          valid: false, 
          error: 'Token expirado', 
          needsRefresh: true 
        };
      }
      
      console.error('Error al verificar token:', error);
      return { 
        valid: false, 
        error: 'Error al verificar token' 
      };
    }
  }

  /**
   * Renueva el token de acceso
   */
  async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = this.tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new AuthError(
          AuthErrorType.TOKEN_EXPIRED,
          'No hay token de renovación disponible',
          401
        );
      }

      const response = await httpClient.post<AuthResponse>('/auth/refresh', {
        refreshToken
      });

      // Actualizar tokens
      this.tokenStorage.setToken(response.token);
      if (response.refreshToken) {
        this.tokenStorage.setRefreshToken(response.refreshToken);
      }
      httpClient.setAuthToken(response.token);
      this.currentUser = response.user;

      return response;
    } catch (error) {
      this.clearAuth();
      this.handleError(error);
    }
  }

  /**
   * Verifica si hay un usuario autenticado
   */
  isAuthenticated(): boolean {
    const token = this.tokenStorage.getToken();
    return !!token && !!this.currentUser;
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Actualiza el perfil del usuario
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      if (!this.isAuthenticated()) {
        throw new AuthError(
          AuthErrorType.UNAUTHENTICATED,
          'No hay sesión activa',
          401
        );
      }

      const updatedUser = await httpClient.put<User>('/auth/profile', updates);
      this.currentUser = updatedUser;
      return updatedUser;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Espera a que el servicio esté inicializado
   */
  async waitForInitialization(): Promise<void> {
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

// 🔥 INSTANCIA SINGLETON DEL SERVICIO
// ¿Qué significa esto?
// Creamos UNA SOLA instancia del servicio que se usa en toda la aplicación.
// Es como tener un solo "guardián de seguridad" para toda la plataforma.
export const enhancedAuthService = EnhancedAuthService.getInstance();

/**
 * 📚 RESUMEN COMPLETO DE ESTE ARCHIVO:
 * 
 * 🎯 PROPÓSITO PRINCIPAL:
 * Este archivo es el corazón del sistema de autenticación de AcaLud.
 * Maneja TODO lo relacionado con login, registro, verificación de usuarios, etc.
 * 
 * 🏗️ COMPONENTES PRINCIPALES:
 * 
 * 1. 📝 INTERFACES (Contratos de datos):
 *    - LoginCredentials: Qué necesitamos para hacer login
 *    - RegisterData: Qué necesitamos para registrarse
 *    - AuthResponse: Qué devuelve el servidor tras autenticar
 *    - TokenVerificationResult: Resultado de verificar un token
 *    - ITokenStorage: Contrato para guardar tokens
 *    - IAuthService: Contrato para el servicio de autenticación
 * 
 * 2. 💾 ALMACENAMIENTO (LocalTokenStorage):
 *    - Guarda tokens en localStorage del navegador
 *    - Permite recuperar tokens cuando el usuario vuelve
 *    - Maneja tanto token principal como token de renovación
 * 
 * 3. 🏷️ TIPOS DE ERRORES (AuthErrorType):
 *    - Lista completa de todos los posibles errores
 *    - Nombres descriptivos en lugar de códigos confusos
 *    - Facilita el manejo específico de cada tipo de error
 * 
 * 4. ❌ CLASE DE ERRORES (AuthError):
 *    - Errores específicos de autenticación con información detallada
 *    - Convierte errores HTTP genéricos en errores específicos
 *    - Incluye tipo, mensaje, código de estado y detalles extra
 * 
 * 5. ✅ VALIDADORES (AuthValidator):
 *    - Verifican que los datos estén correctos ANTES de enviarlos
 *    - Validan email, contraseña, nombre, rol
 *    - Devuelven mensajes específicos de qué está mal
 * 
 * 6. 🔐 SERVICIO PRINCIPAL (EnhancedAuthService):
 *    - Hace TODO el trabajo de autenticación
 *    - Implementa patrón Singleton (una sola instancia)
 *    - Maneja login, registro, logout, verificación, renovación
 *    - Gestiona el estado del usuario actual
 *    - Maneja errores de manera robusta
 * 
 * 🎓 PRINCIPIOS DE DISEÑO APLICADOS:
 * 
 * ✅ SOLID:
 * - S: Cada clase tiene una responsabilidad específica
 * - O: Extensible sin modificar código existente
 * - L: Interfaces bien definidas y respetadas
 * - I: Interfaces específicas, no genéricas
 * - D: Dependencias inyectadas, no hardcodeadas
 * 
 * ✅ PATRONES:
 * - Singleton: Una sola instancia del servicio
 * - Strategy: Diferentes tipos de almacenamiento
 * - Factory: Creación de errores específicos
 * 
 * ✅ BUENAS PRÁCTICAS:
 * - Validación exhaustiva de datos
 * - Manejo robusto de errores
 * - Separación clara de responsabilidades
 * - Código testeable y mantenible
 * - Documentación clara y detallada
 * 
 * 🚀 CÓMO SE USA EN LA APLICACIÓN:
 * 
 * ```typescript
 * // Hacer login
 * const response = await enhancedAuthService.login({
 *   email: "usuario@email.com",
 *   password: "micontraseña"
 * });
 * 
 * // Verificar si está autenticado
 * if (enhancedAuthService.isAuthenticated()) {
 *   const user = enhancedAuthService.getCurrentUser();
 *   console.log(`Hola ${user.name}!`);
 * }
 * 
 * // Hacer logout
 * await enhancedAuthService.logout();
 * ```
 * 
 * 💡 BENEFICIOS DE ESTA ARQUITECTURA:
 * - Errores claros y específicos para cada situación
 * - Validación automática de todos los datos
 * - Manejo automático de tokens y sesiones
 * - Fácil de testear y mantener
 * - Escalable para nuevas funcionalidades
 * - Seguro y robusto para producción
 */
