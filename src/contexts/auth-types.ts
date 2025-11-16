import { User } from '../types';
import {
  AuthErrorType,
  LoginCredentials,
  RegisterData,
} from '../services/enhanced-auth.service';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthErrorInfo {
  type: AuthErrorType;
  message: string;
  statusCode?: number;
  details?: unknown;
  timestamp: Date;
}

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: AuthErrorInfo | null;
  isLoading: boolean;
  isInitialized: boolean;
  retryCount: number;
}

export type AuthAction =
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

export interface AuthOptions {
  showGlobalError?: boolean;
  retryOnFailure?: boolean;
  timeout?: number;
}

export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  error: AuthErrorInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  retryCount: number;
  login: (credentials: LoginCredentials, options?: AuthOptions) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData, options?: AuthOptions) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  retryLastOperation: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  getErrorMessage: () => string;
  hasError: (type?: AuthErrorType) => boolean;
  canRetry: () => boolean;
}
