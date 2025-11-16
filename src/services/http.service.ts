// ============================================================================
// 🌐 SERVICIO HTTP - ACALUD - CLIENTE PARA COMUNICACIÓN CON EL BACKEND
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este es el "cerebro" de todas las comunicaciones entre el frontend y el backend.
 * Es como un "cartero" que lleva mensajes entre la interfaz web y el servidor.
 * 
 * 🔗 FUNCIONES PRINCIPALES:
 * - Enviar datos al servidor (POST)
 * - Obtener datos del servidor (GET) 
 * - Actualizar datos (PUT/PATCH)
 * - Eliminar datos (DELETE)
 * - Manejar errores de conexión
 * - Gestionar tokens de autenticación
 * 
 * 💡 PRINCIPIOS APLICADOS:
 * - Singleton Pattern: Solo una instancia del cliente HTTP
 * - Error Handling: Manejo robusto de errores de red
 * - Token Management: Gestión automática de tokens JWT
 * - TypeScript: Tipado fuerte para prevenir errores
 */

/**
 * 🔧 FUNCIÓN PARA OBTENER LA URL BASE DE LA API
 * 
 * ¿Por qué necesitamos esto?
 * Porque el frontend puede ejecutarse en diferentes entornos:
 * - Desarrollo local (localhost:5173)
 * - Producción (dominio real)
 * - Testing (entorno de pruebas)
 * 
 * Y cada entorno necesita apuntar a una URL de API diferente.
 */
const getApiBaseUrl = () => {
  // 🧪 ENTORNO DE TESTING
  // Si estamos ejecutando tests automáticos, usar URL fija
  if (typeof globalThis !== 'undefined') {
    const globalNode = globalThis as typeof globalThis & {
      process?: { env?: { NODE_ENV?: string } };
    };

    if (globalNode.process?.env?.NODE_ENV === 'test') {
      console.log('🧪 Entorno de testing detectado - usando API local'); // Debug log
      return 'http://localhost:3001/api/v1';
    }
  }

  const processEnvApiUrl =
    typeof process !== 'undefined' && process?.env ? process.env.VITE_API_URL : undefined;

  const browserGlobalApiUrl =
    typeof window !== 'undefined'
      ? (window as typeof window & { __ACALUD_API_URL__?: string }).__ACALUD_API_URL__
      : undefined;

  const runtimeApiUrl = processEnvApiUrl || browserGlobalApiUrl;

  if (runtimeApiUrl) {
    console.log('🔧 Usando URL de API desde configuración de entorno:', runtimeApiUrl); // Debug log
    return runtimeApiUrl;
  }

  if (typeof window !== 'undefined') {
    console.log('🏠 Usando URL de API por defecto (desarrollo local)'); // Debug log
    return 'http://localhost:3001/api/v1';
  }

  // 🌙 FALLBACK PARA SSR Y OTROS ENTORNOS
  // En caso de que no detectemos el entorno, usar la URL de desarrollo
  console.log('🌙 Entorno no detectado - usando fallback'); // Debug log
  return 'http://localhost:3001/api/v1';
};

// 🌍 OBTENER LA URL BASE DE LA API AL INICIALIZAR EL MÓDULO
// Esto se ejecuta una sola vez cuando se importa el archivo
const API_BASE_URL = getApiBaseUrl();
console.log('🚀 Servicio HTTP inicializado con URL:', API_BASE_URL); // Debug log

/**
 * 📋 INTERFAZ PARA ERRORES DE API
 * 
 * ¿Qué es una interfaz?
 * Es como un "contrato" que define qué propiedades debe tener un objeto.
 * En este caso, definimos cómo son los errores que puede devolver el servidor.
 */
interface ApiError {
  message: string;      // 💬 Mensaje descriptivo del error (ej: "Usuario no encontrado")
  statusCode: number;   // 🔢 Código HTTP del error (ej: 404, 401, 500)
  error?: string;       // 🏷️ Tipo de error opcional (ej: "Bad Request", "Unauthorized")
}

/**
 * 🚨 CLASE PARA MANEJO DE ERRORES DE API
 * 
 * ¿Por qué una clase personalizada?
 * Los errores nativos de JavaScript son muy básicos. Necesitamos más información:
 * - Código de estado HTTP
 * - Detalles específicos del error
 * - Información adicional para debugging
 * 
 * Esta clase extiende Error nativo agregando estas funcionalidades.
 */
export class HttpError extends Error {
  public statusCode: number;    // 🔢 Código HTTP del error (404, 401, 500, etc.)
  public error?: string;        // 🏷️ Tipo de error ("Bad Request", "Unauthorized", etc.)
  public code?: string;         // 📝 Código de error interno
  public details?: unknown;     // 📋 Detalles adicionales del error

  /**
   * 🏗️ CONSTRUCTOR DE LA CLASE HttpError
   * 
   * @param apiError - Objeto con la información del error del servidor
   */
  constructor(apiError: ApiError) {
    // Llamar al constructor de la clase padre (Error)
    super(apiError.message);
    
    // Asignar las propiedades específicas de nuestro error
    this.statusCode = apiError.statusCode;    // Guardar código HTTP
    this.error = apiError.error;              // Guardar tipo de error
    this.code = apiError.error;               // Usar error como código también
    this.details = apiError;                  // Guardar todos los detalles
    this.name = 'HttpError';                  // Nombre de la clase para debugging
  }
}

/**
 * 🏭 CLIENTE HTTP SINGLETON PARA COMUNICACIÓN CON LA API
 * 
 * ¿Qué es un Singleton?
 * Es un patrón de diseño que garantiza que solo exista UNA instancia de esta clase
 * en toda la aplicación. Es como tener un solo "cartero" para toda la app.
 * 
 * ¿Por qué usar Singleton aquí?
 * - Evita crear múltiples conexiones HTTP innecesarias
 * - Mantiene el token de autenticación en un solo lugar
 * - Garantiza configuración consistente en toda la app
 * 
 * 🔧 FUNCIONAMIENTO:
 * - Constructor privado (no se puede crear instancias directamente)
 * - Método getInstance() para obtener la única instancia
 * - Manejo automático de tokens de autenticación
 */
class HttpClient {
  // 🏠 PROPIEDADES DE LA CLASE
  private static instance: HttpClient;        // La única instancia que existirá
  private baseURL: string;                    // URL base de la API (ej: http://localhost:3001/api/v1)
  private authToken: string | null = null;    // Token JWT para autenticación

  /**
   * 🔐 CONSTRUCTOR PRIVADO
   * 
   * ¿Por qué es privado?
   * Para que nadie pueda hacer "new HttpClient()" desde fuera.
   * Solo se puede obtener la instancia mediante getInstance().
   */
  private constructor() {
    this.baseURL = API_BASE_URL;           // Asignar la URL base de la API
    this.loadAuthToken();                  // Cargar token guardado al inicializar
    console.log('🏭 HttpClient inicializado con URL:', this.baseURL); // Debug log
  }

  /**
   * 🎯 MÉTODO ESTÁTICO PARA OBTENER LA ÚNICA INSTANCIA
   * 
   * Este es el corazón del patrón Singleton.
   * La primera vez que se llama, crea la instancia.
   * Las siguientes veces, devuelve la misma instancia.
   * 
   * @returns La única instancia de HttpClient
   */
  public static getInstance(): HttpClient {
    // Si no existe una instancia, crear una nueva
    if (!HttpClient.instance) {
      console.log('🆕 Creando nueva instancia de HttpClient'); // Debug log
      HttpClient.instance = new HttpClient();
    } else {
      console.log('♻️ Reutilizando instancia existente de HttpClient'); // Debug log
    }
    return HttpClient.instance;
  }

  /**
   * 🔑 CARGAR TOKEN DE AUTENTICACIÓN DESDE LOCALSTORAGE
   * 
   * ¿Qué es localStorage?
   * Es un almacenamiento en el navegador que persiste entre sesiones.
   * Es como una "caja fuerte" donde guardamos el token para que el usuario
   * no tenga que volver a hacer login cada vez que abre la app.
   * 
   * Esta función se ejecuta automáticamente al crear la instancia.
   */
  private loadAuthToken(): void {
    try {
      // Intentar obtener el token guardado
      const token = localStorage.getItem('acalud_token');
      
      if (token) {
        this.authToken = token;              // Guardar token en memoria
        console.log('🔑 Token de autenticación cargado desde localStorage'); // Debug log
      } else {
        console.log('🚫 No se encontró token en localStorage'); // Debug log
      }
    } catch (error) {
      // Si hay error accediendo a localStorage (ej: navegador en modo privado)
      console.error('❌ Error cargando token de localStorage:', error);
      this.authToken = null;
    }
  }

  /**
   * 🔐 ESTABLECER TOKEN DE AUTENTICACIÓN
   * 
   * Esta función se llama después de un login exitoso para:
   * 1. Guardar el token en memoria (this.authToken)
   * 2. Persistir el token en localStorage para futuras sesiones
   * 3. O eliminar el token si se pasa null (logout)
   * 
   * @param token - Token JWT o null para eliminar
   */
  public setAuthToken(token: string | null): void {
    // Guardar el token en memoria para usar en las próximas peticiones
    this.authToken = token;
    
    try {
      if (token) {
        // 💾 Si hay token, guardarlo en localStorage para persistencia
        localStorage.setItem('acalud_token', token);
        console.log('💾 Token guardado en localStorage'); // Debug log
      } else {
        // 🗑️ Si token es null, eliminar del localStorage (logout)
        localStorage.removeItem('acalud_token');
        console.log('🗑️ Token eliminado de localStorage'); // Debug log
      }
    } catch (error) {
      // Manejar errores de localStorage (ej: cuota excedida, modo privado)
      console.error('❌ Error manejando token en localStorage:', error);
    }
  }

  /**
   * 📋 OBTENER HEADERS HTTP POR DEFECTO
   * 
   * ¿Qué son los headers HTTP?
   * Son como "etiquetas" que acompañan cada petición HTTP.
   * Le dicen al servidor información importante como:
   * - Qué tipo de datos estamos enviando
   * - Quién somos (token de autenticación)
   * - Qué idioma preferimos, etc.
   * 
   * Esta función construye los headers que necesita cada petición.
   * 
   * @returns Objeto con los headers HTTP
   */
  private getHeaders(): Record<string, string> {
    // 📦 Crear objeto para almacenar los headers
    const headers: Record<string, string> = {
      // 📄 Decirle al servidor que enviamos datos en formato JSON
      'Content-Type': 'application/json',
    };

    // 🔐 Si hay token de autenticación, agregarlo a los headers
    if (this.authToken) {
      // El formato "Bearer" es estándar para tokens JWT
      // Es como decir: "Soy el usuario identificado por este token"
      headers['Authorization'] = `Bearer ${this.authToken}`;
      console.log('🔐 Header de autorización agregado'); // Debug log
    } else {
      console.log('🚫 Sin token - petición sin autenticación'); // Debug log
    }

    return headers;
  }

  /**
   * 🌐 REALIZAR PETICIÓN HTTP - MÉTODO PRINCIPAL
   * 
   * Este es el "corazón" del cliente HTTP. Todas las peticiones (GET, POST, etc.)
   * pasan por aquí. Es como el "cartero principal" que se encarga de:
   * 
   * 1. 📦 Preparar la petición con headers y configuración
   * 2. 🚀 Enviar la petición al servidor
   * 3. 📨 Recibir y procesar la respuesta
   * 4. 🚨 Manejar errores si algo sale mal
   * 5. 🔐 Gestionar tokens de autenticación expirados
   * 
   * @param endpoint - Ruta de la API (ej: '/auth/login')
   * @param options - Configuración adicional de la petición
   * @returns Promesa con la respuesta del servidor
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // 🔗 Construir la URL completa combinando base + endpoint
    const url = `${this.baseURL}${endpoint}`;
    console.log(`🌐 Realizando petición ${options.method || 'GET'} a:`, url); // Debug log
    
    // 📋 Preparar configuración de la petición
    const config: RequestInit = {
      ...options,                           // Copiar opciones pasadas por parámetro
      headers: {
        ...this.getHeaders(),               // Agregar headers por defecto (auth, content-type)
        ...options.headers,                 // Agregar headers específicos de esta petición
      },
    };

    try {
      // 🚀 ENVIAR LA PETICIÓN AL SERVIDOR
      console.log('📤 Enviando petición con config:', config); // Debug log
      const response = await fetch(url, config);
      console.log('📥 Respuesta recibida - Status:', response.status); // Debug log
      
      // 🔐 MANEJAR TOKEN EXPIRADO (401 Unauthorized)
      if (response.status === 401) {
        console.warn('🔐 Token expirado - limpiando sesión'); // Debug log
        
        // Limpiar token del cliente
        this.setAuthToken(null);
        
        // Crear error específico para token expirado
        throw new HttpError({
          message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          statusCode: 401,
          error: 'Unauthorized'
        });
      }

      // 📨 PROCESAR RESPUESTA DEL SERVIDOR
      let data;
      try {
        // Intentar parsear la respuesta como JSON
        data = await response.json();
        console.log('📋 Datos recibidos:', data); // Debug log
      } catch (parseError) {
        // Si no se puede parsear como JSON, crear error
        console.error('❌ Error parseando respuesta JSON:', parseError);
        throw new HttpError({
          message: 'Respuesta del servidor inválida',
          statusCode: response.status,
          error: 'Invalid Response'
        });
      }

      // 🚨 VERIFICAR SI LA PETICIÓN FUE EXITOSA
      if (!response.ok) {
        console.error('❌ Petición falló con datos:', data); // Debug log
        
        // El servidor envió un error - usar sus datos para crear HttpError
        throw new HttpError(data);
      }

      // ✅ PETICIÓN EXITOSA - DEVOLVER DATOS
      console.log('✅ Petición exitosa'); // Debug log
      return data;
      
    } catch (error) {
      // 🔍 MANEJAR DIFERENTES TIPOS DE ERROR
      
      if (error instanceof HttpError) {
        // Es un error que ya procesamos - reenviarlo
        console.error('🚨 Error HTTP:', error.message); // Debug log
        throw error;
      }

      // 🌐 ERROR DE RED O CONEXIÓN
      // Si llegamos aquí, hubo un problema de conectividad
      console.error('💥 Error de conexión:', error); // Debug log
      
      throw new HttpError({
        message: 'No se puede conectar con el servidor. Verifica tu conexión a internet.',
        statusCode: 0,
        error: 'Network Error'
      });
    }
  }

  /**
   * 📖 PETICIÓN GET - OBTENER DATOS
   * 
   * ¿Cuándo usar GET?
   * - Obtener información del servidor
   * - Buscar datos
   * - Leer contenido
   * 
   * Ejemplos: obtener perfil de usuario, lista de cursos, etc.
   * 
   * @param endpoint - Ruta de la API (ej: '/users/profile')
   * @returns Promesa con los datos solicitados
   */
  public async get<T>(endpoint: string): Promise<T> {
    console.log('📖 Petición GET a:', endpoint); // Debug log
    return this.request<T>(endpoint, {
      method: 'GET',    // Especificar que es una petición GET
    });
  }

  /**
   * 📝 PETICIÓN POST - CREAR DATOS
   * 
   * ¿Cuándo usar POST?
   * - Crear nuevos recursos en el servidor
   * - Enviar formularios
   * - Hacer login, registrarse
   * 
   * Ejemplos: crear usuario, publicar comentario, subir archivo, etc.
   * 
   * @param endpoint - Ruta de la API (ej: '/auth/login')
   * @param data - Datos a enviar al servidor (opcional)
   * @returns Promesa con la respuesta del servidor
   */
  public async post<TResponse, TBody = unknown>(endpoint: string, data?: TBody): Promise<TResponse> {
    console.log('📝 Petición POST a:', endpoint, 'con datos:', data); // Debug log
    return this.request<TResponse>(endpoint, {
      method: 'POST',                                    // Especificar que es POST
      body: data ? JSON.stringify(data) : undefined,    // Convertir datos a JSON si existen
    });
  }

  /**
   * 🔄 PETICIÓN PUT - ACTUALIZAR DATOS COMPLETAMENTE
   * 
   * ¿Cuándo usar PUT?
   * - Reemplazar completamente un recurso
   * - Actualizar todos los campos de un objeto
   * 
   * Diferencia con PATCH: PUT reemplaza TODO, PATCH solo algunos campos.
   * 
   * Ejemplos: actualizar perfil completo, reemplazar configuración, etc.
   * 
   * @param endpoint - Ruta de la API (ej: '/users/123')
   * @param data - Datos completos del objeto (opcional)
   * @returns Promesa con la respuesta del servidor
   */
  public async put<TResponse, TBody = unknown>(endpoint: string, data?: TBody): Promise<TResponse> {
    console.log('🔄 Petición PUT a:', endpoint, 'con datos:', data); // Debug log
    return this.request<TResponse>(endpoint, {
      method: 'PUT',                                     // Especificar que es PUT
      body: data ? JSON.stringify(data) : undefined,    // Convertir datos a JSON
    });
  }

  /**
   * 🔧 PETICIÓN PATCH - ACTUALIZAR DATOS PARCIALMENTE
   * 
   * ¿Cuándo usar PATCH?
   * - Actualizar solo algunos campos de un objeto
   * - Modificaciones pequeñas
   * 
   * Diferencia con PUT: PATCH actualiza solo campos específicos.
   * 
   * Ejemplos: cambiar solo el email, actualizar solo el avatar, etc.
   * 
   * @param endpoint - Ruta de la API (ej: '/users/profile')
   * @param data - Campos a actualizar (opcional)
   * @returns Promesa con la respuesta del servidor
   */
  public async patch<TResponse, TBody = unknown>(endpoint: string, data?: TBody): Promise<TResponse> {
    console.log('🔧 Petición PATCH a:', endpoint, 'con datos:', data); // Debug log
    return this.request<TResponse>(endpoint, {
      method: 'PATCH',                                   // Especificar que es PATCH
      body: data ? JSON.stringify(data) : undefined,    // Convertir datos a JSON
    });
  }

  /**
   * 🗑️ PETICIÓN DELETE - ELIMINAR DATOS
   * 
   * ¿Cuándo usar DELETE?
   * - Eliminar recursos del servidor
   * - Borrar archivos, usuarios, comentarios, etc.
   * 
   * ⚠️ CUIDADO: Esta operación suele ser irreversible.
   * 
   * Ejemplos: eliminar cuenta, borrar archivo, quitar de favoritos, etc.
   * 
   * @param endpoint - Ruta de la API (ej: '/users/123')
   * @returns Promesa con confirmación de eliminación
   */
  public async delete<T>(endpoint: string): Promise<T> {
    console.log('🗑️ Petición DELETE a:', endpoint); // Debug log
    return this.request<T>(endpoint, {
      method: 'DELETE',    // Especificar que es DELETE
    });
  }

  /**
   * 📁 UPLOAD DE ARCHIVOS - SUBIR ARCHIVOS AL SERVIDOR
   * 
   * ¿Cuándo usar este método?
   * - Subir imágenes de perfil
   * - Cargar documentos
   * - Enviar archivos de actividades
   * 
   * ¿Por qué es diferente?
   * Los archivos no se pueden enviar como JSON. Necesitamos usar FormData,
   * que es un formato especial para archivos binarios.
   * 
   * @param endpoint - Ruta de la API (ej: '/files/upload')
   * @param file - Archivo a subir (File object del navegador)
   * @param additionalData - Datos adicionales opcionales (ej: descripción)
   * @returns Promesa con información del archivo subido
   */
  public async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<T> {
    console.log('📁 Subiendo archivo:', file.name, 'a:', endpoint); // Debug log
    
    // 📦 CREAR FORMDATA PARA EL ARCHIVO
    // FormData es el formato estándar para enviar archivos por HTTP
    const formData = new FormData();
    
    // Agregar el archivo al FormData
    formData.append('file', file);
    console.log('📎 Archivo agregado a FormData:', file.name, file.size, 'bytes'); // Debug log

    // 📝 AGREGAR DATOS ADICIONALES SI LOS HAY
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);    // Agregar cada campo adicional
        console.log(`📝 Campo adicional agregado: ${key} = ${value}`); // Debug log
      });
    }

    // 🔐 PREPARAR HEADERS PARA UPLOAD
    // Para archivos, NO incluimos Content-Type (el navegador lo detecta automáticamente)
    const headers: Record<string, string> = {};
    
    // Solo agregar token de autenticación si existe
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      console.log('🔐 Token de autorización incluido para upload'); // Debug log
    }

    // 🚀 ENVIAR ARCHIVO AL SERVIDOR
    return this.request<T>(endpoint, {
      method: 'POST',     // Los uploads siempre son POST
      body: formData,     // Usar FormData en lugar de JSON
      headers,            // Headers específicos para uploads
    });
  }
}

// ============================================================================
// 🌟 EXPORTAR INSTANCIA SINGLETON DEL CLIENTE HTTP
// ============================================================================
/**
 * 🎯 INSTANCIA ÚNICA DEL CLIENTE HTTP
 * 
 * Esta línea crea LA ÚNICA instancia de HttpClient que usará toda la aplicación.
 * Cuando cualquier parte del código hace "import { httpClient }", obtendrá
 * exactamente la misma instancia.
 * 
 * Esto garantiza:
 * - Un solo punto de configuración de red
 * - Token de autenticación compartido
 * - Configuración consistente en toda la app
 * 
 * Uso en otros archivos:
 * import { httpClient } from './http.service';
 * const data = await httpClient.get('/users/profile');
 */
export const httpClient = HttpClient.getInstance();
