// ============================================================================
// 🌐 CONTEXTO DE AUTENTICACIÓN MEJORADO - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este archivo maneja el estado global de autenticación en toda la aplicación.
 * Es como el "cerebro central" que guarda quién está logueado y controla
 * todas las operaciones de login/logout en toda la app.
 * 
 * 🤔 ¿QUÉ ES UN CONTEXTO EN REACT?
 * Imagínate que tienes una caja mágica que puede guardar información 
 * y cualquier componente de tu app puede acceder a esa información.
 * No importa qué tan "profundo" esté el componente en el árbol de componentes.
 * 
 * 🏗️ ARQUITECTURA:
 * - Estado centralizado con useReducer (más poderoso que useState)
 * - Manejo robusto de errores con tipos específicos
 * - Funciones para login, register, logout, etc.
 * - Sistema de retry automático cuando algo falla
 * - Integración perfecta con el servicio de autenticación
 * 
 * 🎓 PRINCIPIOS APLICADOS:
 * - Estado inmutable (nunca modificamos directamente)
 * - Funciones puras (misma entrada = misma salida)
 * - Separación de responsabilidades
 * - Manejo exhaustivo de errores
 */

// 📦 IMPORTACIONES
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { User } from '../types';
import { 
  enhancedAuthService,     // Nuestro servicio de autenticación
  IAuthService,           // Interfaz del servicio (para testing)
  LoginCredentials,       // Tipo para datos de login
  RegisterData,          // Tipo para datos de registro
  AuthError,             // Clase de errores específicos
  AuthErrorType          // Tipos de errores posibles
} from '../services/enhanced-auth.service';

// ============================================================================
// 📝 TIPOS E INTERFACES (CONTRATOS DE DATOS)
// ============================================================================

/**
 * 🚦 ESTADOS POSIBLES DE AUTENTICACIÓN
 * 
 * ¿Para qué sirve esto?
 * En lugar de adivinar en qué estado está la app, usamos nombres claros:
 * - idle: Aplicación recién iniciada, no sabemos nada aún
 * - loading: Estamos verificando/procesando algo (mostrar spinner)
 * - authenticated: Usuario logueado correctamente
 * - unauthenticated: No hay usuario logueado
 * - error: Algo salió mal
 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

/**
 * 📋 INFORMACIÓN DETALLADA DEL ERROR
 * 
 * ¿Por qué no usar solo string?
 * Porque queremos información rica sobre qué pasó:
 * - Tipo específico de error
 * - Mensaje claro para el usuario
 * - Código de estado HTTP (opcional)
 * - Detalles técnicos adicionales (opcional)
 * - Cuándo ocurrió exactamente
 */
interface AuthErrorInfo {
  type: AuthErrorType;    // 🏷️ Tipo específico (ej: INVALID_CREDENTIALS)
  message: string;        // 📝 Mensaje claro para mostrar al usuario
  statusCode?: number;    // 🔢 Código HTTP (ej: 401, 404, 500)
  details?: any;         // 📋 Información técnica adicional
  timestamp: Date;       // ⏰ Cuándo ocurrió exactamente
}

/**
 * 📊 ESTADO COMPLETO DEL CONTEXTO DE AUTENTICACIÓN
 * 
 * ¿Qué información guardamos?
 * Todo lo necesario para saber el estado actual de la autenticación:
 */
interface AuthState {
  user: User | null;           // 👤 Datos del usuario (null = no logueado)
  status: AuthStatus;          // 🚦 Estado actual de la aplicación
  error: AuthErrorInfo | null; // ❌ Error actual (null = sin errores)
  isLoading: boolean;          // ⏳ ¿Estamos procesando algo?
  isInitialized: boolean;      // 🏁 ¿Ya verificamos el estado inicial?
  retryCount: number;          // 🔄 Cuántas veces hemos reintentado
}

/**
 * Acciones del reducer de autenticación
 */
type AuthAction =
  | { type: 'AUTH_INIT_START' }
  | { type: 'AUTH_INIT_SUCCESS'; payload: User | null }
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: AuthErrorInfo }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_SET_LOADING'; payload: boolean }
  | { type: 'AUTH_INCREMENT_RETRY' }
  | { type: 'AUTH_RESET_RETRY' };

/**
 * Opciones para operaciones de autenticación
 */
interface AuthOptions {
  showGlobalError?: boolean;
  retryOnFailure?: boolean;
  timeout?: number;
}

/**
 * Interfaz del contexto de autenticación (manteniendo compatibilidad)
 */
interface AuthContextType {
  // Estado
  user: User | null;
  status: AuthStatus;
  error: AuthErrorInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  retryCount: number;
  
  // Acciones mejoradas
  login: (credentials: LoginCredentials, options?: AuthOptions) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData, options?: AuthOptions) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  retryLastOperation: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  
  // Utilidades
  getErrorMessage: () => string;
  hasError: (type?: AuthErrorType) => boolean;
  canRetry: () => boolean;
}

// ============================================================================
// ESTADO INICIAL
// ============================================================================

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  isLoading: false,
  isInitialized: false,
  retryCount: 0,
};

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 10000; // 10 segundos

// ============================================================================
// REDUCER
// ============================================================================

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_INIT_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        status: 'loading',
      };

    case 'AUTH_INIT_SUCCESS':
      return {
        ...state,
        user: action.payload,
        status: action.payload ? 'authenticated' : 'unauthenticated',
        error: null,
        isLoading: false,
        isInitialized: true,
        retryCount: 0,
      };

    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        status: 'loading',
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        status: 'authenticated',
        error: null,
        isLoading: false,
        retryCount: 0,
      };

    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        status: 'error',
        error: action.payload,
        isLoading: false,
      };

    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        status: 'unauthenticated',
        error: null,
        isLoading: false,
        retryCount: 0,
      };

    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
        status: state.user ? 'authenticated' : 'unauthenticated',
      };

    case 'AUTH_SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'AUTH_INCREMENT_RETRY':
      return {
        ...state,
        retryCount: state.retryCount + 1,
      };

    case 'AUTH_RESET_RETRY':
      return {
        ...state,
        retryCount: 0,
      };

    default:
      return state;
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Convierte un AuthError en AuthErrorInfo
 */
function createErrorInfo(error: any): AuthErrorInfo {
  if (error instanceof AuthError) {
    return {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: new Date(),
    };
  }

  // Error desconocido
  return {
    type: AuthErrorType.SERVER_ERROR,
    message: error?.message || 'Error desconocido',
    timestamp: new Date(),
  };
}

/**
 * Crea un timeout para operaciones
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'La operación ha excedido el tiempo límite',
        408
      ));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

// ============================================================================
// CONTEXTO
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
  authService?: IAuthService;
}

export function AuthProvider({ children, authService = enhancedAuthService }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Referencia para la última operación fallida (para retry)
  const lastFailedOperation = React.useRef<(() => Promise<any>) | null>(null);

  // ============================================================================
  // FUNCIONES DE AUTENTICACIÓN
  // ============================================================================

  /**
   * Inicia sesión con credenciales
   */
  const login = useCallback(async (
    credentials: LoginCredentials, 
    options: AuthOptions = {}
  ): Promise<{ success: boolean; error?: string }> => {
    const operation = async () => {
      try {
        dispatch({ type: 'AUTH_START' });
        
        const promise = authService.login(credentials);
        const response = await withTimeout(promise, options.timeout || DEFAULT_TIMEOUT);
        
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
        lastFailedOperation.current = null;
        return { success: true };
      } catch (error: any) {
        const errorInfo = createErrorInfo(error);
        dispatch({ type: 'AUTH_FAILURE', payload: errorInfo });
        
        if (options.retryOnFailure && state.retryCount < MAX_RETRY_COUNT) {
          lastFailedOperation.current = operation;
          dispatch({ type: 'AUTH_INCREMENT_RETRY' });
        }
        
        return { success: false, error: errorInfo.message };
      }
    };

    return await operation();
  }, [authService, state.retryCount]);

  /**
   * Registra un nuevo usuario
   */
  const register = useCallback(async (
    userData: RegisterData, 
    options: AuthOptions = {}
  ): Promise<{ success: boolean; error?: string }> => {
    const operation = async () => {
      try {
        dispatch({ type: 'AUTH_START' });
        
        const promise = authService.register(userData);
        const response = await withTimeout(promise, options.timeout || DEFAULT_TIMEOUT);
        
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
        lastFailedOperation.current = null;
        return { success: true };
      } catch (error: any) {
        const errorInfo = createErrorInfo(error);
        dispatch({ type: 'AUTH_FAILURE', payload: errorInfo });
        
        if (options.retryOnFailure && state.retryCount < MAX_RETRY_COUNT) {
          lastFailedOperation.current = operation;
          dispatch({ type: 'AUTH_INCREMENT_RETRY' });
        }
        
        return { success: false, error: errorInfo.message };
      }
    };

    return await operation();
  }, [authService, state.retryCount]);

  /**
   * Cierra la sesión del usuario
   */
  const logout = useCallback((): void => {
    try {
      authService.logout();
      dispatch({ type: 'AUTH_LOGOUT' });
      lastFailedOperation.current = null;
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      // Siempre limpiar la sesión local aunque falle en el servidor
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, [authService]);

  /**
   * Renueva el token de acceso
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_SET_LOADING', payload: true });
      
      const response = await authService.refreshToken();
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error: any) {
      const errorInfo = createErrorInfo(error);
      dispatch({ type: 'AUTH_FAILURE', payload: errorInfo });
      throw error;
    }
  }, [authService]);

  /**
   * Limpia el error actual
   */
  const clearError = useCallback((): void => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
    dispatch({ type: 'AUTH_RESET_RETRY' });
    lastFailedOperation.current = null;
  }, []);

  /**
   * Verifica el estado de autenticación
   */
  const checkAuth = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_INIT_START' });
      
      if (!authService.isAuthenticated()) {
        dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
        return;
      }

      const verificationResult = await authService.verifyToken();
      
      if (verificationResult.valid && verificationResult.user) {
        dispatch({ type: 'AUTH_INIT_SUCCESS', payload: verificationResult.user });
      } else {
        dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
      }
    } catch (error: any) {
      console.error('Error al verificar autenticación:', error);
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
    }
  }, [authService]);

  /**
   * Reintenta la última operación fallida
   */
  const retryLastOperation = useCallback(async (): Promise<void> => {
    if (lastFailedOperation.current && state.retryCount < MAX_RETRY_COUNT) {
      await lastFailedOperation.current();
    }
  }, [state.retryCount]);

  /**
   * Actualiza los datos del usuario actual
   */
  const updateUser = useCallback((updates: Partial<User>): void => {
    if (state.user) {
      const updatedUser = { ...state.user, ...updates };
      dispatch({ type: 'AUTH_SUCCESS', payload: updatedUser });
    }
  }, [state.user]);

  // ============================================================================
  // FUNCIONES UTILITARIAS
  // ============================================================================

  /**
   * Obtiene el mensaje de error actual
   */
  const getErrorMessage = useCallback((): string => {
    return state.error?.message || '';
  }, [state.error]);

  /**
   * Verifica si hay un error específico
   */
  const hasError = useCallback((type?: AuthErrorType): boolean => {
    if (!state.error) return false;
    return type ? state.error.type === type : true;
  }, [state.error]);

  /**
   * Verifica si se puede reintentar
   */
  const canRetry = useCallback((): boolean => {
    return !!lastFailedOperation.current && state.retryCount < MAX_RETRY_COUNT;
  }, [state.retryCount]);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  /**
   * Verifica la autenticación al cargar la aplicación
   */
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ============================================================================
  // VALOR DEL CONTEXTO
  // ============================================================================

  const value: AuthContextType = {
    // Estado
    user: state.user,
    status: state.status,
    error: state.error,
    isLoading: state.isLoading,
    isAuthenticated: state.status === 'authenticated' && !!state.user,
    isInitialized: state.isInitialized,
    retryCount: state.retryCount,
    
    // Acciones
    login,
    register,
    logout,
    refreshToken,
    clearError,
    checkAuth,
    retryLastOperation,
    updateUser,
    
    // Utilidades
    getErrorMessage,
    hasError,
    canRetry,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// HOOK PERSONALIZADO
// ============================================================================

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}