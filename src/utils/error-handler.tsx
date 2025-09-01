// ============================================================================
// INTERCEPTOR DE ERRORES GLOBAL - ACALUD
// ============================================================================
// Maneja errores de forma centralizada en la aplicación React

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  AuthError, 
  AuthErrorType 
} from '../services/enhanced-auth.service';
import { 
  ClassroomError, 
  ClassroomErrorType 
} from '../services/enhanced-classroom.service';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Props para el componente ErrorBoundary
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}

/**
 * Estado del componente ErrorBoundary
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Información detallada del error
 */
interface ErrorDetails {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Enum para tipos de errores
 */
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Enum para severidad de errores
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Genera un ID único para el error
 */
function generateErrorId(): string {
  return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clasifica el tipo de error
 */
function classifyError(error: Error): ErrorType {
  if (error instanceof AuthError) {
    switch (error.type) {
      case AuthErrorType.UNAUTHORIZED:
      case AuthErrorType.INVALID_CREDENTIALS:
      case AuthErrorType.TOKEN_EXPIRED:
      case AuthErrorType.TOKEN_INVALID:
        return ErrorType.AUTHENTICATION;
      case AuthErrorType.FORBIDDEN:
        return ErrorType.AUTHORIZATION;
      case AuthErrorType.VALIDATION_ERROR:
        return ErrorType.VALIDATION;
      case AuthErrorType.NETWORK_ERROR:
        return ErrorType.NETWORK;
      case AuthErrorType.USER_NOT_FOUND:
        return ErrorType.NOT_FOUND;
      default:
        return ErrorType.SERVER;
    }
  }

  if (error instanceof ClassroomError) {
    switch (error.type) {
      case ClassroomErrorType.PERMISSION_DENIED:
        return ErrorType.AUTHORIZATION;
      case ClassroomErrorType.INVALID_DATA:
        return ErrorType.VALIDATION;
      case ClassroomErrorType.NOT_FOUND:
        return ErrorType.NOT_FOUND;
      default:
        return ErrorType.SERVER;
    }
  }

  // Clasificar por mensaje o tipo de error
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorType.NETWORK;
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return ErrorType.NOT_FOUND;
  }
  
  if (message.includes('unauthorized') || message.includes('401')) {
    return ErrorType.AUTHENTICATION;
  }
  
  if (message.includes('forbidden') || message.includes('403')) {
    return ErrorType.AUTHORIZATION;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorType.VALIDATION;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Determina la severidad del error
 */
function getErrorSeverity(error: Error, errorType: ErrorType): ErrorSeverity {
  // Errores críticos que impiden el funcionamiento de la app
  if (errorType === ErrorType.AUTHENTICATION && error.message.includes('session')) {
    return ErrorSeverity.CRITICAL;
  }

  // Errores de red son de alta severidad
  if (errorType === ErrorType.NETWORK) {
    return ErrorSeverity.HIGH;
  }

  // Errores de validación son de media severidad
  if (errorType === ErrorType.VALIDATION) {
    return ErrorSeverity.MEDIUM;
  }

  // Errores de "no encontrado" son de baja severidad
  if (errorType === ErrorType.NOT_FOUND) {
    return ErrorSeverity.LOW;
  }

  // Por defecto, media severidad
  return ErrorSeverity.MEDIUM;
}

/**
 * Obtiene un mensaje de error amigable para el usuario
 */
function getUserFriendlyMessage(error: Error, errorType: ErrorType): string {
  // Mensajes específicos para errores conocidos
  if (error instanceof AuthError) {
    switch (error.type) {
      case AuthErrorType.INVALID_CREDENTIALS:
        return 'Email o contraseña incorrectos. Por favor, verifica tus datos.';
      case AuthErrorType.TOKEN_EXPIRED:
        return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      case AuthErrorType.NETWORK_ERROR:
        return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
      case AuthErrorType.EMAIL_ALREADY_EXISTS:
        return 'Ya existe una cuenta con este email. Intenta iniciar sesión.';
      case AuthErrorType.VALIDATION_ERROR:
        return error.message; // El mensaje ya es amigable
      default:
        return 'Error de autenticación. Intenta nuevamente.';
    }
  }

  if (error instanceof ClassroomError) {
    switch (error.type) {
      case ClassroomErrorType.NOT_FOUND:
        return 'Aula no encontrada. Verifica el código de invitación.';
      case ClassroomErrorType.INVALID_INVITE_CODE:
        return 'Código de invitación inválido. Verifica que esté escrito correctamente.';
      case ClassroomErrorType.ALREADY_MEMBER:
        return 'Ya eres miembro de esta aula.';
      case ClassroomErrorType.PERMISSION_DENIED:
        return 'No tienes permisos para realizar esta acción.';
      case ClassroomErrorType.CLASSROOM_INACTIVE:
        return 'Esta aula ya no está activa.';
      default:
        return 'Error en el aula. Intenta nuevamente.';
    }
  }

  // Mensajes genéricos por tipo
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
    case ErrorType.NOT_FOUND:
      return 'El recurso solicitado no fue encontrado.';
    case ErrorType.AUTHORIZATION:
      return 'No tienes permisos para realizar esta acción.';
    case ErrorType.VALIDATION:
      return 'Los datos ingresados no son válidos. Por favor, revísalos.';
    case ErrorType.SERVER:
      return 'Error del servidor. Intenta nuevamente en unos momentos.';
    default:
      return 'Ha ocurrido un error inesperado. Intenta nuevamente.';
  }
}

/**
 * Registra el error para monitoreo
 */
function logError(errorDetails: ErrorDetails): void {
  // En desarrollo, mostrar en consola
  if (import.meta.env?.DEV) {
    console.group(`🚨 Error ${errorDetails.type} - ${errorDetails.id}`);
    console.error('Message:', errorDetails.message);
    console.error('Timestamp:', errorDetails.timestamp);
    console.error('URL:', errorDetails.url);
    if (errorDetails.userId) {
      console.error('User ID:', errorDetails.userId);
    }
    if (errorDetails.stack) {
      console.error('Stack:', errorDetails.stack);
    }
    if (errorDetails.componentStack) {
      console.error('Component Stack:', errorDetails.componentStack);
    }
    if (errorDetails.additionalInfo) {
      console.error('Additional Info:', errorDetails.additionalInfo);
    }
    console.groupEnd();
  }

  // En producción, enviar a servicio de monitoreo
  if (import.meta.env?.PROD) {
    // Aquí se puede integrar con servicios como Sentry, LogRocket, etc.
    try {
      // Ejemplo: enviar a endpoint de logging
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorDetails),
      }).catch(() => {
        // Silenciar errores de logging para evitar loops
      });
    } catch {
      // Silenciar errores de logging
    }
  }
}

/**
 * Crear detalles completos del error
 */
function createErrorDetails(
  error: Error, 
  errorInfo?: ErrorInfo, 
  additionalInfo?: Record<string, any>
): ErrorDetails {
  const errorType = classifyError(error);
  
  return {
    id: generateErrorId(),
    timestamp: new Date(),
    type: errorType,
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack || undefined,
    userAgent: navigator.userAgent,
    url: window.location.href,
    additionalInfo: {
      errorName: error.name,
      severity: getErrorSeverity(error, errorType),
      userFriendlyMessage: getUserFriendlyMessage(error, errorType),
      ...additionalInfo
    }
  };
}

// ============================================================================
// COMPONENTE ERROR BOUNDARY
// ============================================================================

/**
 * Componente para capturar errores de React y mostrar UI de fallback
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Crear detalles del error
    const errorDetails = createErrorDetails(error, errorInfo, {
      boundaryComponent: 'ErrorBoundary'
    });

    // Registrar error
    logError(errorDetails);

    // Llamar callback personalizado si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reinicia el estado del error boundary
   */
  retry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Si hay un componente de fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!);
      }

      // UI de fallback por defecto
      const errorType = classifyError(this.state.error);
      const userMessage = getUserFriendlyMessage(this.state.error, errorType);
      const severity = getErrorSeverity(this.state.error, errorType);

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                {/* Icono según severidad */}
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  {severity === ErrorSeverity.CRITICAL ? (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                
                {/* Título */}
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  {severity === ErrorSeverity.CRITICAL ? 'Error Crítico' : 'Ha ocurrido un error'}
                </h3>
                
                {/* Mensaje */}
                <p className="mt-2 text-sm text-gray-600">
                  {userMessage}
                </p>
                
                {/* ID del error para soporte */}
                {this.state.errorId && (
                  <p className="mt-2 text-xs text-gray-400">
                    ID del error: {this.state.errorId}
                  </p>
                )}
                
                {/* Detalles técnicos (solo en desarrollo) */}
                {this.props.showErrorDetails && import.meta.env?.DEV && (
                  <div className="mt-4 p-3 bg-gray-100 rounded text-left">
                    <p className="text-xs font-mono text-gray-700 break-all">
                      <strong>Error:</strong> {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">Stack trace</summary>
                        <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
                
                {/* Botones de acción */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.retry}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                  >
                    Intentar nuevamente
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                  >
                    Recargar página
                  </button>
                </div>
                
                {/* Enlaces adicionales */}
                <div className="mt-4 text-center">
                  <a
                    href="/"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Volver al inicio
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// HOOKS Y UTILIDADES
// ============================================================================

/**
 * Hook para manejar errores en componentes funcionales
 */
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, additionalInfo?: Record<string, any>) => {
    const errorDetails = createErrorDetails(error, undefined, additionalInfo);
    logError(errorDetails);
  }, []);

  return handleError;
}

/**
 * HOC para envolver componentes con manejo de errores
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Función global para reportar errores programáticamente
 */
export function reportError(error: Error, additionalInfo?: Record<string, any>): void {
  const errorDetails = createErrorDetails(error, undefined, additionalInfo);
  logError(errorDetails);
}

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================

/**
 * Configura el manejo global de errores no capturados
 */
export function setupGlobalErrorHandling(): void {
  // Manejar errores de JavaScript no capturados
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    const errorDetails = createErrorDetails(error, undefined, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      source: 'globalErrorHandler'
    });
    logError(errorDetails);
  });

  // Manejar promesas rechazadas no capturadas
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    const errorDetails = createErrorDetails(error, undefined, {
      source: 'unhandledPromiseRejection'
    });
    logError(errorDetails);
  });
}
