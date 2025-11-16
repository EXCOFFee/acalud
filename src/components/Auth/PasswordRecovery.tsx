/**
 * 🔐 COMPONENTE DE RECUPERACIÓN DE CONTRASEÑA - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Componente que maneja el flujo completo de recuperación de contraseña:
 * - Solicitud de recuperación por email
 * - Validación de token
 * - Reseteo de contraseña
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de recuperación de contraseña
 * - OCP: Extensible para diferentes métodos de recuperación
 * - LSP: Implementa correctamente la interfaz de componente React
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Depende de abstracciones (servicios, contextos)
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { passwordRecoveryService } from '../../services/password-recovery.service';
import { HttpError } from '../../services/http.service';

/**
 * Tipos para el estado del componente
 */
type RecoveryStep = 'request' | 'verify' | 'reset' | 'success';

/**
 * Interface para los datos del formulario de solicitud
 */
interface RequestFormData {
  email: string;
}

/**
 * Interface para los datos del formulario de reseteo
 */
interface ResetFormData {
  newPassword: string;
  confirmPassword: string;
}

/**
 * Interface para el estado de validación
 */
interface ValidationState {
  isValid: boolean;
  errors: string[];
}

/**
 * Interface para los criterios de validación de contraseña
 */
interface PasswordCriteria {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChar: boolean;
}

/**
 * Componente principal de recuperación de contraseña
 */
const PasswordRecovery: React.FC = () => {
  // =============================================================================
  // ESTADO Y HOOKS
  // =============================================================================

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estado principal del flujo
  const [currentStep, setCurrentStep] = useState<RecoveryStep>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Token desde URL
  const [token, setToken] = useState<string | null>(null);

  // Datos de los formularios
  const [requestForm, setRequestForm] = useState<RequestFormData>({ email: '' });
  const [resetForm, setResetForm] = useState<ResetFormData>({
    newPassword: '',
    confirmPassword: ''
  });

  // Estados de UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumbers: false,
    hasSpecialChar: false,
  });

  // =============================================================================
  // EFECTOS
  // =============================================================================

  /**
   * Efecto para verificar token en URL al cargar el componente
   */
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');

    if (tokenFromUrl) {
      const normalizedToken = tokenFromUrl.trim();
      if (normalizedToken && normalizedToken !== token) {
        setToken(normalizedToken);
        setCurrentStep('verify');
        void validateToken(normalizedToken);
      }
    } else if (token) {
      setToken(null);
    }
  }, [searchParams, token]);

  /**
   * Efecto para validar criterios de contraseña en tiempo real
   */
  useEffect(() => {
    if (resetForm.newPassword) {
      setPasswordCriteria({
        minLength: resetForm.newPassword.length >= 8,
        hasUpperCase: /[A-Z]/.test(resetForm.newPassword),
        hasLowerCase: /[a-z]/.test(resetForm.newPassword),
        hasNumbers: /\d/.test(resetForm.newPassword),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(resetForm.newPassword),
      });
    }
  }, [resetForm.newPassword]);

  // =============================================================================
  // FUNCIONES DE API
  // =============================================================================

  /**
   * Solicita la recuperación de contraseña
   */
  const requestPasswordReset = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await passwordRecoveryService.requestPasswordReset({
        email: requestForm.email.trim(),
      });

      const message =
        response.message ||
        'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.';

      setSuccessMessage(message);
      setCurrentStep('success');
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message || 'Error al solicitar recuperación de contraseña');
      } else {
        console.error('Error requesting password reset:', err);
        setError('Error de conexión. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Valida el token de recuperación
   */
  const validateToken = async (tokenToValidate: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await passwordRecoveryService.validateToken(tokenToValidate);

      if (response.success) {
        setCurrentStep('reset');
        setSuccessMessage(
          response.message || 'Token válido. Puedes establecer tu nueva contraseña.'
        );
      } else {
        setError(response.message || 'Token inválido o expirado');
        setCurrentStep('request');
      }
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message || 'Token inválido o expirado');
      } else {
        console.error('Error validating token:', err);
        setError('Error validando el token. Por favor, intenta nuevamente.');
      }
      setCurrentStep('request');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resetea la contraseña
   */
  const resetPassword = async (): Promise<void> => {
    if (!token) {
      setError('El token de recuperación no está disponible. Solicita un nuevo enlace.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await passwordRecoveryService.resetPassword({
        token,
        newPassword: resetForm.newPassword,
        confirmPassword: resetForm.confirmPassword,
      });

      const message =
        response.message ||
        '¡Contraseña actualizada exitosamente! Ahora puedes iniciar sesión con tu nueva contraseña.';

      setSuccessMessage(message);
      setCurrentStep('success');

      setTimeout(() => {
  navigate('/auth/login');
      }, 3000);
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message || 'Error al resetear la contraseña');
      } else {
        console.error('Error resetting password:', err);
        setError('Error de conexión. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // FUNCIONES DE VALIDACIÓN
  // =============================================================================

  /**
   * Valida el formulario de solicitud
   */
  const validateRequestForm = (): ValidationState => {
    const errors: string[] = [];

    if (!requestForm.email) {
      errors.push('El email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestForm.email)) {
      errors.push('El email debe tener un formato válido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  /**
   * Valida el formulario de reseteo
   */
  const validateResetForm = (): ValidationState => {
    const errors: string[] = [];

    if (!resetForm.newPassword) {
      errors.push('La nueva contraseña es requerida');
    } else {
      const criteria = Object.values(passwordCriteria);
      if (!criteria.every(Boolean)) {
        errors.push('La contraseña no cumple todos los requisitos');
      }
    }

    if (!resetForm.confirmPassword) {
      errors.push('La confirmación de contraseña es requerida');
    } else if (resetForm.newPassword !== resetForm.confirmPassword) {
      errors.push('Las contraseñas no coinciden');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // =============================================================================
  // MANEJADORES DE EVENTOS
  // =============================================================================

  /**
   * Maneja el envío del formulario de solicitud
   */
  const handleRequestSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    const validation = validateRequestForm();
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    await requestPasswordReset();
  };

  /**
   * Maneja el envío del formulario de reseteo
   */
  const handleResetSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    const validation = validateResetForm();
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    await resetPassword();
  };

  /**
   * Regresa al paso de solicitud
   */
  const handleBackToRequest = (): void => {
    setCurrentStep('request');
    setToken(null);
    setError(null);
    setSuccessMessage(null);
    navigate('/password-recovery', { replace: true });
  };

  // =============================================================================
  // COMPONENTES DE RENDERIZADO
  // =============================================================================

  /**
   * Renderiza el formulario de solicitud de recuperación
   */
  const renderRequestForm = (): JSX.Element => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Recuperar Contraseña
        </h1>
        <p className="text-gray-600">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      <form onSubmit={handleRequestSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={requestForm.email}
              onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
              required
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Enviando...
            </div>
          ) : (
            'Enviar Enlace de Recuperación'
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/auth/login')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Volver al inicio de sesión
          </button>
        </div>
      </form>
    </div>
  );

  /**
   * Renderiza el formulario de reseteo de contraseña
   */
  const renderResetForm = (): JSX.Element => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Nueva Contraseña
        </h1>
        <p className="text-gray-600">
          Elige una contraseña segura para tu cuenta.
        </p>
      </div>

      <form onSubmit={handleResetSubmit} className="space-y-6">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Nueva Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={resetForm.newPassword}
              onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu nueva contraseña"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Criterios de contraseña */}
        {resetForm.newPassword && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Tu contraseña debe cumplir:</p>
            <div className="space-y-2">
              <div className={`flex items-center text-sm ${passwordCriteria.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`w-4 h-4 mr-2 ${passwordCriteria.minLength ? 'text-green-500' : 'text-gray-400'}`} />
                Mínimo 8 caracteres
              </div>
              <div className={`flex items-center text-sm ${passwordCriteria.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`w-4 h-4 mr-2 ${passwordCriteria.hasUpperCase ? 'text-green-500' : 'text-gray-400'}`} />
                Al menos una mayúscula
              </div>
              <div className={`flex items-center text-sm ${passwordCriteria.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`w-4 h-4 mr-2 ${passwordCriteria.hasLowerCase ? 'text-green-500' : 'text-gray-400'}`} />
                Al menos una minúscula
              </div>
              <div className={`flex items-center text-sm ${passwordCriteria.hasNumbers ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`w-4 h-4 mr-2 ${passwordCriteria.hasNumbers ? 'text-green-500' : 'text-gray-400'}`} />
                Al menos un número
              </div>
              <div className={`flex items-center text-sm ${passwordCriteria.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`w-4 h-4 mr-2 ${passwordCriteria.hasSpecialChar ? 'text-green-500' : 'text-gray-400'}`} />
                Al menos un carácter especial
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar Nueva Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={resetForm.confirmPassword}
              onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirma tu nueva contraseña"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mensaje de coincidencia de contraseñas */}
        {resetForm.newPassword && resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword && (
          <p className="text-red-600 text-sm">Las contraseñas no coinciden</p>
        )}

        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !Object.values(passwordCriteria).every(Boolean)}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            loading || !Object.values(passwordCriteria).every(Boolean)
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Cambiando contraseña...
            </div>
          ) : (
            'Cambiar Contraseña'
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleBackToRequest}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Solicitar nuevo enlace
          </button>
        </div>
      </form>
    </div>
  );

  /**
   * Renderiza la pantalla de éxito
   */
  const renderSuccessStep = (): JSX.Element => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Listo!
        </h1>
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => navigate('/auth/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Ir al Inicio de Sesión
          </button>
          
          <button
            onClick={handleBackToRequest}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Solicitar Otro Enlace
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Renderiza la pantalla de verificación de token
   */
  const renderVerifyStep = (): JSX.Element => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Verificando Token...
        </h1>
        <p className="text-gray-600">
          Estamos validando tu enlace de recuperación...
        </p>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg mt-6">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <div className="text-sm">
            <p className="text-red-700">{error}</p>
            <button
              onClick={handleBackToRequest}
              className="text-blue-600 hover:text-blue-700 font-medium mt-2"
            >
              Solicitar nuevo enlace
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // =============================================================================
  // RENDERIZADO PRINCIPAL
  // =============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        {currentStep === 'request' && renderRequestForm()}
        {currentStep === 'verify' && renderVerifyStep()}
        {currentStep === 'reset' && renderResetForm()}
        {currentStep === 'success' && renderSuccessStep()}
      </div>
    </div>
  );
};

export default PasswordRecovery;