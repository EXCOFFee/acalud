import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { ClassroomInvitationService } from '../../services/implementations/ClassroomInvitationService';
import type { InvitationValidationResult } from '../../types';
import { useAuth } from '../../contexts/useAuth';
import { useAppNavigation } from '../../hooks/useAppNavigation';

const invitationService = ClassroomInvitationService.getInstance();

type ViewState = 'loading' | 'ready' | 'invalid' | 'consuming' | 'consumed';

const buildValidationErrorMessage = (result: InvitationValidationResult): string => {
  if (!result.reason) {
    return 'Esta invitación no está disponible.';
  }

  switch (result.reason) {
    case 'not_found':
      return 'No encontramos la invitación indicada. Verifica que el enlace sea correcto.';
    case 'expired':
      return 'La invitación expiró. Solicita al docente que envíe una nueva.';
    case 'already_accepted':
      return 'Esta invitación ya fue utilizada.';
    case 'revoked':
      return 'La invitación fue revocada por el docente.';
    default:
      return 'Esta invitación no está disponible.';
  }
};

const formatDisplayDate = (value?: string | Date | null): string | null => {
  if (!value) {
    return null;
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
};

export const AcceptInvitationPage: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { goToLogin, goToRegister, goToMyClassrooms, goToHome } = useAppNavigation();

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get('token');
    return value ? value.trim() : '';
  }, [location.search]);

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [validation, setValidation] = useState<InvitationValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const validate = async () => {
      if (!token) {
        setError('El enlace de invitación no es válido. Solicita al docente un nuevo enlace.');
        setViewState('invalid');
        return;
      }

      try {
        setViewState('loading');
        const result = await invitationService.validateToken(token);
        if (!isMounted) {
          return;
        }

        setValidation(result);
        if (!result.valid) {
          setError(buildValidationErrorMessage(result));
          setViewState('invalid');
          return;
        }

        setError(null);
        setViewState('ready');
      } catch (validationError) {
        if (!isMounted) {
          return;
        }
        const message = validationError instanceof Error
          ? validationError.message
          : 'No pudimos validar la invitación. Intenta nuevamente más tarde.';
        setError(message);
        setViewState('invalid');
      }
    };

    void validate();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const invitedEmail = validation?.email ?? '';
  const classroomInfo = validation?.classroom;
  const expirationLabel = formatDisplayDate(validation?.expiresAt);
  const canAccept =
    viewState === 'ready' &&
    isAuthenticated &&
    invitedEmail &&
    user?.email &&
    user.email.trim().toLowerCase() === invitedEmail.trim().toLowerCase();
  const isProcessing = viewState === 'consuming';
  const shouldHighlight = canAccept || isProcessing;

  const handleAcceptInvitation = async () => {
    if (!validation || !user) {
      return;
    }

    setActionError(null);
    setViewState('consuming');

    try {
      await invitationService.consumeInvitation(token, user.email);
      setViewState('consumed');
    } catch (consumeError) {
      const message = consumeError instanceof Error ? consumeError.message : 'No fue posible aceptar la invitación.';
      setActionError(message);
      setViewState('ready');
    }
  };

  if (viewState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  if (viewState === 'invalid' || (!validation && viewState !== 'consumed')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitación no disponible</h1>
          <p className="text-gray-600 mb-6">{error ?? 'La invitación indicada no puede utilizarse.'}</p>
          <button
            onClick={goToHome}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'consumed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-green-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Invitación aceptada!</h1>
          <p className="text-gray-600 mb-6">
            Ya formas parte del aula{classroomInfo ? ` "${classroomInfo.name}"` : ''}. Revisa tus aulas para comenzar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={goToMyClassrooms}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Ir a mis aulas
            </button>
            <button
              onClick={goToHome}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8 bg-indigo-50 border-b border-indigo-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Aceptar invitación a aula</h1>
                  <p className="text-sm text-indigo-700">
                    Revisa los detalles y confirma que usas la cuenta de correo invitada.
                  </p>
                </div>
              </div>
              {expirationLabel && (
                <div className="flex items-center text-sm text-indigo-700 bg-white bg-opacity-60 border border-indigo-200 rounded-full px-4 py-2">
                  <Clock className="w-4 h-4 mr-2" />
                  Expira: {expirationLabel}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <section className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 text-indigo-500 mr-2" />
                Información del aula
              </h2>
              {classroomInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <p className="text-gray-500">Nombre</p>
                    <p className="font-medium text-gray-900">{classroomInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Materia</p>
                    <p className="font-medium text-gray-900">{classroomInfo.subject}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Grado</p>
                    <p className="font-medium text-gray-900">{classroomInfo.grade}</p>
                  </div>
                  {classroomInfo.teacherName && (
                    <div>
                      <p className="text-gray-500">Docente</p>
                      <p className="font-medium text-gray-900">{classroomInfo.teacherName}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Esta invitación no incluye detalles adicionales del aula, pero seguirá siendo válida.
                </p>
              )}
            </section>

            <section className="bg-white rounded-xl border border-indigo-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Mail className="w-5 h-5 text-indigo-500 mr-2" />
                Correo invitado
              </h2>
              <p className="text-sm text-gray-600">
                Esta invitación fue enviada a <span className="font-medium text-gray-900">{invitedEmail || 'correo no disponible'}</span>.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Debes iniciar sesión con esa misma dirección para poder aceptar y unirte al aula.
              </p>
            </section>

            {validation?.message && (
              <section className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
                <p className="font-medium">Mensaje del docente</p>
                <p className="mt-2 whitespace-pre-line">{validation.message}</p>
              </section>
            )}

            {actionError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {!isAuthenticated && (
              <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-800 flex gap-3">
                <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Inicia sesión para completar el proceso</p>
                  <p className="mt-1">
                    Usa el mismo correo que recibió la invitación. Si aún no tienes cuenta, regístrate con esa dirección.
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={goToLogin}
                      className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Iniciar sesión
                    </button>
                    <button
                      onClick={goToRegister}
                      className="px-5 py-3 bg-white text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Crear cuenta
                    </button>
                  </div>
                </div>
              </section>
            )}

            {isAuthenticated && !canAccept && (
              <section className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700 flex gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Tu sesión actual no coincide con la invitación</p>
                  <p className="mt-1">
                    Iniciaste sesión como <span className="font-semibold">{user?.email}</span>, pero la invitación fue enviada a <span className="font-semibold">{invitedEmail || 'otro correo'}</span>.
                  </p>
                  <p className="mt-2">
                    Cierra sesión e ingresa con el correo correcto o solicita una nueva invitación.
                  </p>
                </div>
              </section>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <button
                onClick={goToHome}
                className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAcceptInvitation}
                disabled={!canAccept || isProcessing}
                className={`px-5 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  shouldHighlight
                    ? 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Aceptar invitación'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
