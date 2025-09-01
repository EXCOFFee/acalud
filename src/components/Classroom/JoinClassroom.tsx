// ============================================================================
// FORMULARIO PARA UNIRSE A AULA
// ============================================================================
// Permite a los estudiantes unirse a aulas usando código de invitación

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { 
  Users, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  Info,
  BookOpen,
  Key,
  UserPlus
} from 'lucide-react';

/**
 * Props del componente JoinClassroom
 */
interface JoinClassroomProps {
  onBack: () => void;
  onSuccess: (classroomId: string) => void;
}

/**
 * Información del aula antes de unirse
 */
interface ClassroomPreview {
  id: string;
  name: string;
  description: string;
  subject: string;
  grade: string;
  teacherName: string;
  studentCount: number;
  isActive: boolean;
  inviteCode: string;
}

/**
 * Estados del proceso de unión
 */
type JoinState = 'entering-code' | 'preview' | 'joining' | 'success' | 'error';

/**
 * Errores posibles
 */
interface JoinErrors {
  code?: string;
  general?: string;
}

/**
 * Componente para que estudiantes se unan a aulas
 * Incluye validación de código y vista previa del aula
 */
export const JoinClassroom: React.FC<JoinClassroomProps> = ({ onBack, onSuccess }) => {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [state, setState] = useState<JoinState>('entering-code');
  const [errors, setErrors] = useState<JoinErrors>({});
  const [classroomPreview, setClassroomPreview] = useState<ClassroomPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const classroomService = ClassroomService.getInstance();

  /**
   * Valida el código de invitación
   */
  const validateCode = (code: string): string | null => {
    if (!code.trim()) {
      return 'El código de invitación es obligatorio';
    }
    
    if (code.trim().length < 6) {
      return 'El código debe tener al menos 6 caracteres';
    }
    
    if (code.trim().length > 12) {
      return 'El código no puede tener más de 12 caracteres';
    }
    
    // Validar formato (solo letras y números)
    if (!/^[A-Za-z0-9]+$/.test(code.trim())) {
      return 'El código solo puede contener letras y números';
    }
    
    return null;
  };

  /**
   * Buscar aula por código de invitación
   */
  const searchClassroom = async () => {
    const codeError = validateCode(inviteCode);
    if (codeError) {
      setErrors({ code: codeError });
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});
      setState('entering-code');

      // Buscar aula por código
      const classroom = await classroomService.getClassroomByInviteCode(inviteCode.trim().toUpperCase());
      
      if (!classroom) {
        setErrors({ code: 'Código de invitación no válido' });
        return;
      }

      if (!classroom.isActive) {
        setErrors({ code: 'Esta aula no está activa actualmente' });
        return;
      }

      // Verificar si ya está inscrito
      if (classroom.students.some(student => student.id === user?.id)) {
        setErrors({ code: 'Ya estás inscrito en esta aula' });
        return;
      }

      // Preparar vista previa
      const preview: ClassroomPreview = {
        id: classroom.id,
        name: classroom.name,
        description: classroom.description,
        subject: classroom.subject,
        grade: classroom.grade,
        teacherName: classroom.teacher.firstName + ' ' + classroom.teacher.lastName,
        studentCount: classroom.students.length,
        isActive: classroom.isActive,
        inviteCode: classroom.inviteCode
      };

      setClassroomPreview(preview);
      setState('preview');

    } catch (error) {
      console.error('Error al buscar aula:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          setErrors({ general: 'Error de conexión. Verifica tu internet e intenta nuevamente.' });
        } else if (error.message.includes('unauthorized')) {
          setErrors({ general: 'No tienes permisos para acceder a esta funcionalidad' });
        } else if (error.message.includes('not found')) {
          setErrors({ code: 'Código de invitación no encontrado' });
        } else {
          setErrors({ general: 'Error al buscar el aula. Intenta nuevamente.' });
        }
      } else {
        setErrors({ general: 'Error inesperado. Contacta al soporte técnico.' });
      }
      setState('error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Confirmar unión al aula
   */
  const confirmJoin = async () => {
    if (!classroomPreview || !user) return;

    try {
      setState('joining');
      setErrors({});

      await classroomService.joinClassroomByCode(classroomPreview.inviteCode, user.id);
      
      setState('success');
      
      // Redirigir después de mostrar éxito
      setTimeout(() => {
        onSuccess(classroomPreview.id);
      }, 2000);

    } catch (error) {
      console.error('Error al unirse al aula:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already enrolled')) {
          setErrors({ general: 'Ya estás inscrito en esta aula' });
        } else if (error.message.includes('capacity')) {
          setErrors({ general: 'El aula ha alcanzado su capacidad máxima' });
        } else if (error.message.includes('inactive')) {
          setErrors({ general: 'El aula no está activa actualmente' });
        } else if (error.message.includes('permission')) {
          setErrors({ general: 'No tienes permisos para unirte a esta aula' });
        } else {
          setErrors({ general: 'Error al unirse al aula. Intenta nuevamente.' });
        }
      } else {
        setErrors({ general: 'Error inesperado. Contacta al soporte técnico.' });
      }
      setState('error');
    }
  };

  /**
   * Reiniciar proceso
   */
  const resetProcess = () => {
    setInviteCode('');
    setErrors({});
    setClassroomPreview(null);
    setState('entering-code');
  };

  /**
   * Manejo de cambio en el código
   */
  const handleCodeChange = (value: string) => {
    setInviteCode(value.toUpperCase());
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: undefined }));
    }
  };

  /**
   * Renderizar estado de éxito
   */
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ¡Unido Exitosamente!
          </h2>
          <p className="text-gray-600 mb-6">
            Te has unido al aula "{classroomPreview?.name}" correctamente. 
            Ya puedes acceder a las actividades disponibles.
          </p>
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            disabled={isLoading || state === 'joining'}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Unirse a un Aula</h1>
              <p className="text-gray-600 mt-1">
                Ingresa el código de invitación para unirte a un aula virtual
              </p>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Estado: Ingresando código */}
          {state === 'entering-code' && (
            <>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Código de Invitación</h2>
                <p className="text-gray-600 mt-1">
                  Solicita el código a tu docente para acceder al aula
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Error general */}
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                    </div>
                  </div>
                )}

                {/* Campo de código */}
                <div>
                  <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Invitación *
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      className={`w-full pl-10 pr-4 py-4 border rounded-lg text-center text-lg font-mono tracking-wider transition-colors ${
                        errors.code
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-green-500 focus:ring-green-200'
                      } focus:outline-none focus:ring-2`}
                      placeholder="ABC123"
                      disabled={isLoading}
                      maxLength={12}
                      autoComplete="off"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isLoading) {
                          searchClassroom();
                        }
                      }}
                    />
                  </div>
                  {errors.code && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.code}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    El código contiene letras y números (6-12 caracteres)
                  </p>
                </div>

                {/* Información sobre códigos */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">¿Cómo obtener un código?</h3>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1">
                        <li>• Solicítalo a tu docente</li>
                        <li>• El docente puede compartirlo por chat, email o en clase</li>
                        <li>• Cada aula tiene un código único</li>
                        <li>• Los códigos pueden cambiar por seguridad</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Botón de búsqueda */}
                <button
                  onClick={searchClassroom}
                  disabled={isLoading || !inviteCode.trim()}
                  className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-semibold"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      Buscando Aula...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5 mr-3" />
                      Buscar Aula
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Estado: Vista previa del aula */}
          {(state === 'preview' || state === 'joining') && classroomPreview && (
            <>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Información del Aula</h2>
                <p className="text-gray-600 mt-1">
                  Revisa los detalles antes de unirte
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Información del aula */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {classroomPreview.name}
                      </h3>
                      <p className="text-gray-700 mb-3">
                        {classroomPreview.description}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Materia:</span>
                          <span className="ml-2 text-gray-900">{classroomPreview.subject}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Grado:</span>
                          <span className="ml-2 text-gray-900">{classroomPreview.grade}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Docente:</span>
                          <span className="ml-2 text-gray-900">{classroomPreview.teacherName}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Estudiantes:</span>
                          <span className="ml-2 text-gray-900">{classroomPreview.studentCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirmación */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">¿Quieres unirte a esta aula?</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Al unirte tendrás acceso a todas las actividades y podrás participar en las clases virtuales.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex space-x-4">
                  <button
                    onClick={resetProcess}
                    className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={state === 'joining'}
                  >
                    Cambiar Código
                  </button>
                  <button
                    onClick={confirmJoin}
                    disabled={state === 'joining'}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {state === 'joining' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Uniéndose...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Unirse al Aula
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Estado: Error */}
          {state === 'error' && (
            <>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Error al Unirse</h2>
                <p className="text-gray-600 mt-1">
                  Ocurrió un problema durante el proceso
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Mensaje de error */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">No se pudo completar la operación</p>
                    <p className="text-sm text-red-700 mt-1">
                      {errors.general || errors.code || 'Error desconocido'}
                    </p>
                  </div>
                </div>

                {/* Botón para reintentar */}
                <button
                  onClick={resetProcess}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Intentar Nuevamente
                </button>
              </div>
            </>
          )}
        </div>

        {/* Ayuda adicional */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            ¿Problemas para unirte?{' '}
            <button 
              onClick={onBack}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Contacta a tu docente
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
