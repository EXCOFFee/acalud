// ============================================================================
// SISTEMA DE NOTIFICACIONES - ACALUD
// ============================================================================
// Componente para mostrar notificaciones toast con diferentes tipos y severidades

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { 
  AuthErrorType, 
  AuthError 
} from '../../services/enhanced-auth.service';
import { 
  ClassroomErrorType, 
  ClassroomError 
} from '../../services/enhanced-classroom.service';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Tipos de notificación
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Posiciones de las notificaciones
 */
export type NotificationPosition = 
  | 'top-right' 
  | 'top-left' 
  | 'top-center'
  | 'bottom-right' 
  | 'bottom-left' 
  | 'bottom-center';

/**
 * Interfaz para una notificación
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary';
  }>;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Estado del sistema de notificaciones
 */
interface NotificationState {
  notifications: Notification[];
  position: NotificationPosition;
  maxNotifications: number;
}

/**
 * Acciones del reducer
 */
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_POSITION'; payload: NotificationPosition }
  | { type: 'SET_MAX_NOTIFICATIONS'; payload: number };

/**
 * Opciones para mostrar notificaciones
 */
interface ShowNotificationOptions {
  title: string;
  message?: string;
  type?: NotificationType;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary';
  }>;
  metadata?: Record<string, any>;
}

/**
 * Interfaz del contexto de notificaciones
 */
interface NotificationContextType {
  notifications: Notification[];
  position: NotificationPosition;
  showNotification: (options: ShowNotificationOptions) => string;
  showSuccess: (title: string, message?: string, options?: Partial<ShowNotificationOptions>) => string;
  showError: (title: string, message?: string, options?: Partial<ShowNotificationOptions>) => string;
  showWarning: (title: string, message?: string, options?: Partial<ShowNotificationOptions>) => string;
  showInfo: (title: string, message?: string, options?: Partial<ShowNotificationOptions>) => string;
  hideNotification: (id: string) => void;
  clearAll: () => void;
  setPosition: (position: NotificationPosition) => void;
  setMaxNotifications: (max: number) => void;
  handleError: (error: Error, customMessage?: string) => string;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const DEFAULT_DURATION = 5000; // 5 segundos
const MAX_NOTIFICATIONS = 5;
const DEFAULT_POSITION: NotificationPosition = 'top-right';

// ============================================================================
// ESTADO INICIAL
// ============================================================================

const initialState: NotificationState = {
  notifications: [],
  position: DEFAULT_POSITION,
  maxNotifications: MAX_NOTIFICATIONS,
};

// ============================================================================
// REDUCER
// ============================================================================

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      // Si se alcanza el máximo, remover la más antigua
      const notifications = state.notifications.length >= state.maxNotifications
        ? [...state.notifications.slice(1), action.payload]
        : [...state.notifications, action.payload];
      
      return {
        ...state,
        notifications,
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };

    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
      };

    case 'SET_POSITION':
      return {
        ...state,
        position: action.payload,
      };

    case 'SET_MAX_NOTIFICATIONS':
      return {
        ...state,
        maxNotifications: action.payload,
        // Si hay más notificaciones que el nuevo máximo, remover las más antiguas
        notifications: state.notifications.slice(-action.payload),
      };

    default:
      return state;
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Genera un ID único para la notificación
 */
function generateNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtiene el mensaje de error amigable para notificaciones
 */
function getErrorNotificationMessage(error: any): { title: string; message: string } {
  if (error instanceof AuthError) {
    switch (error.type) {
      case AuthErrorType.INVALID_CREDENTIALS:
        return {
          title: 'Credenciales incorrectas',
          message: 'Email o contraseña incorrectos. Verifica tus datos.'
        };
      case AuthErrorType.TOKEN_EXPIRED:
        return {
          title: 'Sesión expirada',
          message: 'Tu sesión ha expirado. Inicia sesión nuevamente.'
        };
      case AuthErrorType.NETWORK_ERROR:
        return {
          title: 'Error de conexión',
          message: 'Verifica tu conexión a internet e intenta nuevamente.'
        };
      case AuthErrorType.EMAIL_ALREADY_EXISTS:
        return {
          title: 'Email ya registrado',
          message: 'Ya existe una cuenta con este email.'
        };
      default:
        return {
          title: 'Error de autenticación',
          message: error.message
        };
    }
  }

  if (error instanceof ClassroomError) {
    switch (error.type) {
      case ClassroomErrorType.NOT_FOUND:
        return {
          title: 'Aula no encontrada',
          message: 'El aula solicitada no existe o no tienes acceso.'
        };
      case ClassroomErrorType.INVALID_INVITE_CODE:
        return {
          title: 'Código inválido',
          message: 'El código de invitación no es válido.'
        };
      case ClassroomErrorType.ALREADY_MEMBER:
        return {
          title: 'Ya eres miembro',
          message: 'Ya perteneces a esta aula.'
        };
      case ClassroomErrorType.PERMISSION_DENIED:
        return {
          title: 'Sin permisos',
          message: 'No tienes permisos para realizar esta acción.'
        };
      default:
        return {
          title: 'Error en el aula',
          message: error.message
        };
    }
  }

  // Error genérico
  return {
    title: 'Error',
    message: error.message || 'Ha ocurrido un error inesperado.'
  };
}

// ============================================================================
// CONTEXTO
// ============================================================================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface NotificationProviderProps {
  children: React.ReactNode;
  position?: NotificationPosition;
  maxNotifications?: number;
}

export function NotificationProvider({ 
  children, 
  position = DEFAULT_POSITION,
  maxNotifications = MAX_NOTIFICATIONS 
}: NotificationProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, {
    ...initialState,
    position,
    maxNotifications,
  });

  // ============================================================================
  // FUNCIONES DEL CONTEXTO
  // ============================================================================

  const showNotification = useCallback((options: ShowNotificationOptions): string => {
    const notification: Notification = {
      id: generateNotificationId(),
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration ?? DEFAULT_DURATION,
      persistent: options.persistent || false,
      actions: options.actions,
      metadata: options.metadata,
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

    // Auto-remove si no es persistente
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
      }, notification.duration);
    }

    return notification.id;
  }, []);

  const showSuccess = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<ShowNotificationOptions>
  ): string => {
    return showNotification({
      ...options,
      title,
      message,
      type: 'success',
    });
  }, [showNotification]);

  const showError = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<ShowNotificationOptions>
  ): string => {
    return showNotification({
      ...options,
      title,
      message,
      type: 'error',
      duration: options?.duration ?? 8000, // Errores duran más tiempo
    });
  }, [showNotification]);

  const showWarning = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<ShowNotificationOptions>
  ): string => {
    return showNotification({
      ...options,
      title,
      message,
      type: 'warning',
    });
  }, [showNotification]);

  const showInfo = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<ShowNotificationOptions>
  ): string => {
    return showNotification({
      ...options,
      title,
      message,
      type: 'info',
    });
  }, [showNotification]);

  const hideNotification = useCallback((id: string): void => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearAll = useCallback((): void => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const setPosition = useCallback((position: NotificationPosition): void => {
    dispatch({ type: 'SET_POSITION', payload: position });
  }, []);

  const setMaxNotifications = useCallback((max: number): void => {
    dispatch({ type: 'SET_MAX_NOTIFICATIONS', payload: max });
  }, []);

  const handleError = useCallback((error: Error, customMessage?: string): string => {
    const { title, message } = getErrorNotificationMessage(error);
    
    return showError(title, customMessage || message, {
      metadata: {
        errorType: error.name,
        originalMessage: error.message,
      }
    });
  }, [showError]);

  // ============================================================================
  // VALOR DEL CONTEXTO
  // ============================================================================

  const value: NotificationContextType = {
    notifications: state.notifications,
    position: state.position,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    clearAll,
    setPosition,
    setMaxNotifications,
    handleError,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

// ============================================================================
// COMPONENTE DE CONTENEDOR
// ============================================================================

function NotificationContainer(): React.ReactElement {
  const context = useContext(NotificationContext);
  if (!context) return <></>;

  const { notifications, position } = context;

  if (notifications.length === 0) return <></>;

  // Clases CSS para posicionamiento
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} pointer-events-none`}>
      <div className="flex flex-col gap-2 max-w-sm w-full">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE DE NOTIFICACIÓN INDIVIDUAL
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification }: NotificationItemProps): React.ReactElement {
  const context = useContext(NotificationContext);
  if (!context) return <></>;

  const { hideNotification } = context;

  // Clases CSS según el tipo
  const typeStyles = {
    success: {
      container: 'bg-green-50 border-green-200',
      icon: 'text-green-400',
      title: 'text-green-800',
      message: 'text-green-700',
      button: 'text-green-500 hover:text-green-700',
    },
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-400',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'text-red-500 hover:text-red-700',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-400',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'text-yellow-500 hover:text-yellow-700',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-400',
      title: 'text-blue-800',
      message: 'text-blue-700',
      button: 'text-blue-500 hover:text-blue-700',
    },
  };

  const styles = typeStyles[notification.type];

  // Iconos según el tipo
  const icons = {
    success: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`pointer-events-auto bg-white rounded-lg shadow-lg border p-4 ${styles.container} animate-slide-in-right`}>
      <div className="flex">
        {/* Icono */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icons[notification.type]}
        </div>
        
        {/* Contenido */}
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${styles.title}`}>
            {notification.title}
          </p>
          {notification.message && (
            <p className={`mt-1 text-sm ${styles.message}`}>
              {notification.message}
            </p>
          )}
          
          {/* Acciones */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex gap-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`text-sm font-medium ${
                    action.style === 'primary' 
                      ? 'bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700'
                      : `${styles.button} underline`
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Botón de cerrar */}
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={() => hideNotification(notification.id)}
            className={`rounded-md inline-flex ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600`}
          >
            <span className="sr-only">Cerrar</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HOOK PERSONALIZADO
// ============================================================================

/**
 * Hook para usar el sistema de notificaciones
 */
export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications debe ser usado dentro de un NotificationProvider');
  }
  
  return context;
}

// ============================================================================
// ESTILOS CSS ADICIONALES
// ============================================================================

// Agregar al CSS global:
/*
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
*/
