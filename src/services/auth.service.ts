// ============================================================================
// SERVICIO DE AUTENTICACIÓN - ACALUD
// ============================================================================
// Maneja la autenticación con el backend API

import { httpClient } from './http.service';
import { User } from '../types';

/**
 * Interfaz para las credenciales de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Interfaz para los datos de registro
 */
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'teacher' | 'student';
  avatar?: string;
}

/**
 * Interfaz para la respuesta de autenticación
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Servicio de autenticación que conecta con la API
 */
export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private constructor() {}

  /**
   * Inicia sesión con email y contraseña
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<AuthResponse>('/auth/login', credentials);
      
      // Guardar token en el cliente HTTP
      httpClient.setAuthToken(response.token);
      
      return response;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<AuthResponse>('/auth/register', userData);
      
      // Guardar token en el cliente HTTP
      httpClient.setAuthToken(response.token);
      
      return response;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado
   */
  async getProfile(): Promise<User> {
    try {
      const user = await httpClient.get<User>('/auth/profile');
      return user;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      throw error;
    }
  }

  /**
   * Verifica si el token actual es válido
   */
  async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    try {
      const response = await httpClient.get<{ valid: boolean; user: User }>('/auth/verify');
      return response;
    } catch (error) {
      console.error('Error al verificar token:', error);
      return { valid: false };
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    // Limpiar token del cliente HTTP
    httpClient.setAuthToken(null);
    
    // Limpiar cualquier otro dato de sesión
    localStorage.removeItem('acalud_user');
  }

  /**
   * Obtiene el token guardado
   */
  getStoredToken(): string | null {
    return localStorage.getItem('acalud_token');
  }

  /**
   * Verifica si hay un usuario autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    return !!token;
  }
}
