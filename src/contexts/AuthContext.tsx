import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import {
  AuthError,
  AuthErrorType,
  enhancedAuthService,
  IAuthService,
} from '../services/enhanced-auth.service';
import { httpClient } from '../services/http.service';
import type {
  AuthAction,
  AuthContextType,
  AuthErrorInfo,
  AuthState,
} from './auth-types';
import { AuthContext } from './AuthContextBase';

const TOKEN_STORAGE_KEY = 'acalud_token';

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readTokenFromStorage = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('No se pudo leer el token almacenado:', error);
    return null;
  }
};

const removeTokenFromStorage = (): void => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('No se pudo limpiar el token almacenado:', error);
  }
};

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  isLoading: false,
  isInitialized: false,
  retryCount: 0,
};

const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 10000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_INIT_START':
      return { ...state, isLoading: true, error: null, status: 'loading' };
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
      return { ...state, isLoading: true, error: null, status: 'loading' };
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
      return { ...state, isLoading: action.payload };
    case 'AUTH_INCREMENT_RETRY':
      return { ...state, retryCount: state.retryCount + 1 };
    case 'AUTH_RESET_RETRY':
      return { ...state, retryCount: 0 };
    default:
      return state;
  }
}

function createErrorInfo(error: unknown): AuthErrorInfo {
  if (error instanceof AuthError) {
    return {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: new Date(),
    };
  }

  if (isRecord(error)) {
    return {
      type: AuthErrorType.SERVER_ERROR,
      message: typeof error.message === 'string' ? error.message : 'Error desconocido',
      statusCode: typeof error.statusCode === 'number' ? error.statusCode : undefined,
      details: 'details' in error ? error.details : undefined,
      timestamp: new Date(),
    };
  }

  return {
    type: AuthErrorType.SERVER_ERROR,
    message: 'Error desconocido',
    timestamp: new Date(),
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AuthError(AuthErrorType.NETWORK_ERROR, 'La operación ha excedido el tiempo límite', 408));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

interface AuthProviderProps {
  children: ReactNode;
  authService?: IAuthService;
}

export function AuthProvider({ children, authService = enhancedAuthService }: AuthProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const lastFailedOperation = useRef<(() => Promise<unknown>) | null>(null);

  const login = useCallback<AuthContextType['login']>(async (credentials, options = {}) => {
    const operation = async () => {
      try {
        dispatch({ type: 'AUTH_START' });

        const promise = authService.login(credentials);
        const response = await withTimeout(promise, options.timeout ?? DEFAULT_TIMEOUT);
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
        lastFailedOperation.current = null;
        return { success: true };
      } catch (error) {
        const errorInfo = createErrorInfo(error);
        dispatch({ type: 'AUTH_FAILURE', payload: errorInfo });

        if (options.retryOnFailure && state.retryCount < MAX_RETRY_COUNT) {
          lastFailedOperation.current = operation;
          dispatch({ type: 'AUTH_INCREMENT_RETRY' });
        }

        return { success: false, error: errorInfo.message };
      }
    };

    return operation();
  }, [authService, state.retryCount]);

  const register = useCallback<AuthContextType['register']>(async (userData, options = {}) => {
    const operation = async () => {
      try {
        dispatch({ type: 'AUTH_START' });

        const promise = authService.register(userData);
        const response = await withTimeout(promise, options.timeout ?? DEFAULT_TIMEOUT);
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
        lastFailedOperation.current = null;
        return { success: true };
      } catch (error) {
        const errorInfo = createErrorInfo(error);
        dispatch({ type: 'AUTH_FAILURE', payload: errorInfo });

        if (options.retryOnFailure && state.retryCount < MAX_RETRY_COUNT) {
          lastFailedOperation.current = operation;
          dispatch({ type: 'AUTH_INCREMENT_RETRY' });
        }

        return { success: false, error: errorInfo.message };
      }
    };

    return operation();
  }, [authService, state.retryCount]);

  const logout: AuthContextType['logout'] = useCallback(() => {
    try {
      authService.logout();
      dispatch({ type: 'AUTH_LOGOUT' });
      lastFailedOperation.current = null;

      try {
        sessionStorage.removeItem('acalud_current_page');
      } catch (storageError) {
        console.error('Error al limpiar navegación:', storageError);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      dispatch({ type: 'AUTH_LOGOUT' });

      try {
        sessionStorage.removeItem('acalud_current_page');
      } catch (storageError) {
        console.error('Error al limpiar navegación:', storageError);
      }
    }
  }, [authService]);

  const refreshToken: AuthContextType['refreshToken'] = useCallback(async () => {
    try {
      dispatch({ type: 'AUTH_SET_LOADING', payload: true });
      const response = await authService.refreshToken();
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error) {
      const errorInfo = createErrorInfo(error);
      dispatch({ type: 'AUTH_FAILURE', payload: errorInfo });
      throw error;
    }
  }, [authService]);

  const clearError: AuthContextType['clearError'] = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
    dispatch({ type: 'AUTH_RESET_RETRY' });
    lastFailedOperation.current = null;
  }, []);

  const checkAuth: AuthContextType['checkAuth'] = useCallback(async () => {
    try {
      dispatch({ type: 'AUTH_INIT_START' });

      await authService.waitForInitialization();

      const token = readTokenFromStorage();

      if (!token) {
        dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
        return;
      }

      httpClient.setAuthToken(token);

      const result = await authService.verifyToken();

      if (result.valid && result.user) {
        dispatch({ type: 'AUTH_INIT_SUCCESS', payload: result.user });
        return;
      }

      removeTokenFromStorage();
      httpClient.setAuthToken(null);
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      removeTokenFromStorage();
      httpClient.setAuthToken(null);
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
    }
  }, [authService]);

  const retryLastOperation: AuthContextType['retryLastOperation'] = useCallback(async () => {
    if (lastFailedOperation.current && state.retryCount < MAX_RETRY_COUNT) {
      await lastFailedOperation.current();
    }
  }, [state.retryCount]);

  const updateUser: AuthContextType['updateUser'] = useCallback((updates: Partial<User>) => {
    if (state.user) {
      dispatch({ type: 'AUTH_SUCCESS', payload: { ...state.user, ...updates } });
    }
  }, [state.user]);

  const getErrorMessage: AuthContextType['getErrorMessage'] = useCallback(() => {
    return state.error?.message ?? '';
  }, [state.error]);

  const hasError: AuthContextType['hasError'] = useCallback((type) => {
    if (!state.error) {
      return false;
    }

    return type ? state.error.type === type : true;
  }, [state.error]);

  const canRetry: AuthContextType['canRetry'] = useCallback(() => {
    return Boolean(lastFailedOperation.current) && state.retryCount < MAX_RETRY_COUNT;
  }, [state.retryCount]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    user: state.user,
    status: state.status,
    error: state.error,
    isLoading: state.isLoading,
    isAuthenticated: state.status === 'authenticated' && Boolean(state.user),
    isInitialized: state.isInitialized,
    retryCount: state.retryCount,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    checkAuth,
    retryLastOperation,
    updateUser,
    getErrorMessage,
    hasError,
    canRetry,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
