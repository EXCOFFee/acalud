// ============================================================================
// 🔐 SERVICIO DE AUTENTICACIÓN - ACALUD - GESTIÓN DE LOGIN Y REGISTRO
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este servicio es el "guardián" de la autenticación en la aplicación.
 * Se encarga de todo lo relacionado con identificar usuarios:
 * 
 * - 🚪 Hacer login (iniciar sesión)
 * - 📝 Registrar nuevos usuarios  
 * - 👤 Obtener información del usuario autenticado
 * - 🔍 Verificar si el token es válido
 * - 🚪 Hacer logout (cerrar sesión)
 * 
 * 🔗 DEPENDENCIAS:
 * - httpClient: Para comunicarse con el servidor
 * - User: Tipo que define cómo es un usuario
 * 
 * 💡 PRINCIPIOS APLICADOS:
 * - Singleton Pattern: Solo una instancia en toda la app
 * - TypeScript: Tipado fuerte para prevenir errores
 * - Separation of Concerns: Solo se encarga de autenticación
 */

// 📦 IMPORTACIONES NECESARIAS
import { httpClient } from './http.service';    // Cliente HTTP para comunicarse con el servidor
import { User } from '../types';                // Definición del tipo Usuario

/**
 * 📋 INTERFAZ PARA CREDENCIALES DE LOGIN
 * 
 * ¿Qué es una interfaz?
 * Es como un "molde" que define qué datos debe tener un objeto.
 * En este caso, define qué necesitamos para hacer login.
 * 
 * Al usar TypeScript, si alguien intenta hacer login sin email o password,
 * el compilador nos avisará del error ANTES de que llegue al usuario.
 */
export interface LoginCredentials {
  email: string;         // 📧 Correo electrónico del usuario
  password: string;      // 🔒 Contraseña del usuario
}

/**
 * 📋 INTERFAZ PARA DATOS DE REGISTRO
 * 
 * Define toda la información necesaria para crear una cuenta nueva.
 * Incluye campos obligatorios y opcionales.
 */
export interface RegisterData {
  email: string;                      // 📧 Correo electrónico (obligatorio)
  password: string;                   // 🔒 Contraseña (obligatorio)
  name: string;                       // 👤 Nombre completo (obligatorio)
  role: 'teacher' | 'student';        // 🎭 Rol en el sistema (obligatorio)
  avatar?: string;                    // 🖼️ URL del avatar (opcional - el ? significa opcional)
}

/**
 * 📋 INTERFAZ PARA RESPUESTA DE AUTENTICACIÓN
 * 
 * Define qué datos devuelve el servidor cuando el login/registro es exitoso.
 * Tanto login como registro devuelven la misma estructura.
 */
export interface AuthResponse {
  user: User;           // 👤 Información completa del usuario
  token: string;        // 🎫 Token JWT para futuras peticiones autenticadas
}

/**
 * 🏭 SERVICIO DE AUTENTICACIÓN - PATRÓN SINGLETON
 * 
 * ¿Por qué usar Singleton aquí?
 * - Mantener una sola instancia de configuración de autenticación
 * - Evitar duplicar lógica de autenticación
 * - Garantizar consistencia en toda la aplicación
 * 
 * ⚡ MÉTODOS PRINCIPALES:
 * - login(): Iniciar sesión con email/password
 * - register(): Crear cuenta nueva
 * - getProfile(): Obtener datos del usuario actual
 * - verifyToken(): Verificar si el token es válido
 * - logout(): Cerrar sesión
 */
export class AuthService {
  // 🏠 ÚNICA INSTANCIA DE LA CLASE (Singleton)
  private static instance: AuthService;

  /**
   * 🎯 OBTENER LA ÚNICA INSTANCIA DEL SERVICIO
   * 
   * Este método implementa el patrón Singleton:
   * - La primera vez que se llama, crea una nueva instancia
   * - Las siguientes veces, devuelve la misma instancia
   * 
   * @returns La única instancia de AuthService
   */
  public static getInstance(): AuthService {
    // Si no existe una instancia, crear una nueva
    if (!AuthService.instance) {
      console.log('🆕 Creando nueva instancia de AuthService'); // Debug log
      AuthService.instance = new AuthService();
    } else {
      console.log('♻️ Reutilizando instancia existente de AuthService'); // Debug log
    }
    return AuthService.instance;
  }

  /**
   * 🔐 CONSTRUCTOR PRIVADO
   * 
   * Al ser privado, nadie puede hacer "new AuthService()" desde fuera.
   * Solo se puede obtener la instancia mediante getInstance().
   */
  private constructor() {
    console.log('🏗️ AuthService inicializado'); // Debug log
  }

  /**
   * 🚪 INICIAR SESIÓN CON EMAIL Y CONTRASEÑA
   * 
   * Este método es el corazón del sistema de login. Hace lo siguiente:
   * 
   * 1. 📤 Envía las credenciales (email/password) al servidor
   * 2. 📥 Recibe la respuesta con los datos del usuario y el token
   * 3. 💾 Guarda el token para futuras peticiones autenticadas
   * 4. ✅ Devuelve los datos del usuario
   * 
   * Si algo sale mal (credenciales incorrectas, servidor no disponible, etc.),
   * lanza un error que puede ser capturado por el componente que llama a este método.
   * 
   * @param credentials - Objeto con email y password del usuario
   * @returns Promesa con los datos del usuario y token
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('🚪 Intentando hacer login con email:', credentials.email); // Debug log (NO mostrar password)
    
    try {
      // 📤 ENVIAR CREDENCIALES AL SERVIDOR
      // El endpoint '/auth/login' está definido en el backend
      const response = await httpClient.post<AuthResponse>('/auth/login', credentials);
      console.log('✅ Login exitoso para usuario:', response.user.name); // Debug log
      
      // 💾 GUARDAR TOKEN PARA FUTURAS PETICIONES
      // Una vez autenticado, todas las peticiones necesitarán este token
      httpClient.setAuthToken(response.token);
      console.log('🎫 Token de autenticación guardado'); // Debug log
      
      // ✅ DEVOLVER DATOS DEL USUARIO
      return response;
      
    } catch (error) {
      // 🚨 MANEJAR ERRORES DE LOGIN
      console.error('❌ Error en login:', error); // Debug log
      
      // Re-lanzar el error para que el componente pueda manejarlo
      // (por ejemplo, mostrar "Credenciales incorrectas" al usuario)
      throw error;
    }
  }

  /**
   * 📝 REGISTRAR UN NUEVO USUARIO
   * 
   * Similar al login, pero para crear una cuenta nueva. Proceso:
   * 
   * 1. 📤 Envía los datos del nuevo usuario al servidor
   * 2. 🔍 El servidor valida que el email no exista ya
   * 3. 🔐 El servidor encripta la contraseña
   * 4. 💾 Se crea el usuario en la base de datos
   * 5. 📥 Se devuelve el usuario creado + token
   * 6. 🎫 Se guarda el token (automáticamente queda "logueado")
   * 
   * @param userData - Datos del nuevo usuario (email, password, name, role, etc.)
   * @returns Promesa con los datos del usuario creado y token
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    console.log('📝 Intentando registrar nuevo usuario:', userData.email, 'como', userData.role); // Debug log
    
    try {
      // 📤 ENVIAR DATOS DE REGISTRO AL SERVIDOR
      const response = await httpClient.post<AuthResponse>('/auth/register', userData);
      console.log('✅ Registro exitoso para usuario:', response.user.name); // Debug log
      
      // 💾 GUARDAR TOKEN (EL USUARIO QUEDA AUTOMÁTICAMENTE LOGUEADO)
      // Después del registro exitoso, no es necesario hacer login por separado
      httpClient.setAuthToken(response.token);
      console.log('🎫 Token de autenticación guardado tras registro'); // Debug log
      
      // ✅ DEVOLVER DATOS DEL USUARIO RECIÉN CREADO
      return response;
      
    } catch (error) {
      // 🚨 MANEJAR ERRORES DE REGISTRO
      console.error('❌ Error en registro:', error); // Debug log
      
      // Errores comunes:
      // - Email ya existe
      // - Contraseña muy débil
      // - Datos faltantes o inválidos
      throw error;
    }
  }

  /**
   * 👤 OBTENER PERFIL DEL USUARIO AUTENTICADO
   * 
   * Este método obtiene la información actualizada del usuario que está
   * actualmente logueado. Es útil para:
   * 
   * - 🔄 Refrescar datos del usuario
   * - ✅ Verificar que el token sigue siendo válido
   * - 📊 Obtener estadísticas actualizadas (monedas, nivel, etc.)
   * 
   * ⚠️ IMPORTANTE: Solo funciona si hay un token válido guardado.
   * Si el token expiró, este método fallará.
   * 
   * @returns Promesa con los datos actualizados del usuario
   */
  async getProfile(): Promise<User> {
    console.log('👤 Obteniendo perfil del usuario autenticado'); // Debug log
    
    try {
      // 📤 PEDIR DATOS ACTUALIZADOS AL SERVIDOR
      // El servidor usa el token del header para identificar al usuario
      const user = await httpClient.get<User>('/auth/profile');
      console.log('✅ Perfil obtenido para:', user.name); // Debug log
      
      return user;
      
    } catch (error) {
      // 🚨 MANEJAR ERRORES AL OBTENER PERFIL
      console.error('❌ Error al obtener perfil:', error); // Debug log
      
      // Errores comunes:
      // - Token expirado (401)
      // - Usuario eliminado
      // - Problemas de conexión
      throw error;
    }
  }

  /**
   * 🔍 VERIFICAR SI EL TOKEN ACTUAL ES VÁLIDO
   * 
   * Este método es crucial para saber si el usuario sigue autenticado.
   * Se usa típicamente al cargar la aplicación para verificar si hay
   * una sesión activa.
   * 
   * ¿Cuándo usar este método?
   * - 🚀 Al iniciar la aplicación
   * - ⏰ Periodicamente para verificar la sesión
   * - 🔄 Antes de operaciones importantes
   * 
   * @returns Objeto con valid: boolean y opcionalmente los datos del usuario
   */
  async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    console.log('🔍 Verificando validez del token'); // Debug log
    
    try {
      // 📤 PEDIR AL SERVIDOR QUE VERIFIQUE EL TOKEN
      const response = await httpClient.get<{ valid: boolean; user: User }>('/auth/verify');
      
      if (response.valid) {
        console.log('✅ Token válido para usuario:', response.user?.name); // Debug log
      } else {
        console.log('❌ Token inválido'); // Debug log
      }
      
      return response;
      
    } catch (error) {
      // 🚨 SI HAY ERROR, ASUMIR QUE EL TOKEN NO ES VÁLIDO
      console.error('❌ Error al verificar token (asumir inválido):', error); // Debug log
      
      // En lugar de lanzar el error, devolver que no es válido
      // Esto evita que la app "explote" si hay problemas de conexión
      return { valid: false };
    }
  }

  /**
   * 🚪 CERRAR SESIÓN DEL USUARIO
   * 
   * Este método "desconecta" al usuario de la aplicación. Es importante
   * limpiar TODOS los datos relacionados con la sesión para garantizar
   * la seguridad.
   * 
   * ¿Qué hace el logout?
   * - 🗑️ Elimina el token de autenticación
   * - 🧹 Limpia datos de sesión del navegador
   * - 🔄 Deja la app lista para un nuevo login
   * 
   * ⚠️ NOTA: Este es un logout "local". Para máxima seguridad,
   * también se podría notificar al servidor para invalidar el token.
   */
  logout(): void {
    console.log('🚪 Cerrando sesión del usuario'); // Debug log
    
    // 🗑️ ELIMINAR TOKEN DEL CLIENTE HTTP
    // Esto evita que futuras peticiones se hagan como usuario autenticado
    httpClient.setAuthToken(null);
    console.log('🎫 Token eliminado del cliente HTTP'); // Debug log
    
    // 🧹 LIMPIAR DATOS ADICIONALES DE SESIÓN
    // Eliminar cualquier información del usuario que hayamos guardado
    try {
      localStorage.removeItem('acalud_user');
      console.log('🗂️ Datos de usuario eliminados del localStorage'); // Debug log
    } catch (error) {
      console.error('⚠️ Error limpiando localStorage:', error); // Debug log
    }
    
    console.log('✅ Logout completado'); // Debug log
  }

  /**
   * 🎫 OBTENER TOKEN GUARDADO EN LOCALSTORAGE
   * 
   * Método utilitario para acceder al token guardado.
   * Útil para debugging o verificaciones manuales.
   * 
   * @returns El token JWT guardado o null si no hay ninguno
   */
  getStoredToken(): string | null {
    try {
      const token = localStorage.getItem('acalud_token');
      if (token) {
        console.log('🔍 Token encontrado en localStorage'); // Debug log
      } else {
        console.log('🚫 No hay token en localStorage'); // Debug log
      }
      return token;
    } catch (error) {
      console.error('❌ Error accediendo a localStorage:', error); // Debug log
      return null;
    }
  }

  /**
   * ✅ VERIFICAR SI HAY USUARIO AUTENTICADO (MÉTODO RÁPIDO)
   * 
   * Este es un método de verificación "ligero" que solo comprueba
   * si existe un token en localStorage. NO verifica si el token
   * es válido en el servidor.
   * 
   * ¿Cuándo usar este método vs verifyToken()?
   * - ⚡ isAuthenticated(): Verificación rápida local
   * - 🌐 verifyToken(): Verificación completa con el servidor
   * 
   * @returns true si hay token guardado, false si no
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    
    // El operador !! convierte cualquier valor a boolean
    // null/undefined/'' se convierte a false
    // cualquier string se convierte a true
    const isAuth = !!token;
    
    console.log('🔍 Verificación local de autenticación:', isAuth); // Debug log
    return isAuth;
  }
}
