// ============================================================================
// SERVICIO HTTP - ACALUD
// ============================================================================
// Cliente HTTP para comunicación con el backend API

/**
 * Configuración del cliente HTTP
 */
const getApiBaseUrl = () => {
  // En tests, usar URL fija
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return 'http://localhost:3001/api/v1';
  }
  
  // En navegador, usar import.meta
  if (typeof window !== 'undefined' && (window as any).import && (window as any).import.meta) {
    return (window as any).import.meta.env?.VITE_API_URL || 'http://localhost:3001/api/v1';
  }
  
  // Fallback para SSR y otros entornos
  return 'http://localhost:3001/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Interfaz para errores de API
 */
interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

/**
 * Clase para manejo de errores de API
 */
export class HttpError extends Error {
  public statusCode: number;
  public error?: string;
  public code?: string;
  public details?: any;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.statusCode = apiError.statusCode;
    this.error = apiError.error;
    this.code = apiError.error;
    this.details = apiError;
    this.name = 'HttpError';
  }
}

/**
 * Cliente HTTP singleton para comunicación con la API
 */
class HttpClient {
  private static instance: HttpClient;
  private baseURL: string;
  private authToken: string | null = null;

  private constructor() {
    this.baseURL = API_BASE_URL;
    this.loadAuthToken();
  }

  public static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  /**
   * Carga el token de autenticación desde localStorage
   */
  private loadAuthToken(): void {
    const token = localStorage.getItem('acalud_token');
    if (token) {
      this.authToken = token;
    }
  }

  /**
   * Establece el token de autenticación
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      localStorage.setItem('acalud_token', token);
    } else {
      localStorage.removeItem('acalud_token');
    }
  }

  /**
   * Obtiene los headers por defecto
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Realiza una petición HTTP
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Si es 401, limpiar token y redirigir a login
      if (response.status === 401) {
        this.setAuthToken(null);
        window.location.href = '/login';
        throw new HttpError({
          message: 'Sesión expirada',
          statusCode: 401,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new HttpError(data);
      }

      return data;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      // Error de red o parsing
      throw new HttpError({
        message: 'Error de conexión con el servidor',
        statusCode: 0,
      });
    }
  }

  /**
   * Petición GET
   */
  public async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Petición POST
   */
  public async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Petición PUT
   */
  public async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Petición PATCH
   */
  public async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Petición DELETE
   */
  public async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Upload de archivos
   */
  public async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    });
  }
}

export const httpClient = HttpClient.getInstance();
