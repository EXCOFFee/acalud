// ==========================================================================
// FORMULARIO DE AULAS (CREACIÓN / EDICIÓN)
// ==========================================================================
// Se reutiliza el mismo formulario para cubrir CU-007 y CU-008. Permite crear
// nuevas aulas y actualizar aulas existentes con validaciones completas.

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle, Info, Users } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { Classroom } from '../../types';

// Tipos de modo disponibles
export type ClassroomFormMode = 'create' | 'edit';

// Datos base del formulario
interface ClassroomFormData {
  name: string;
  description: string;
  subject: string;
  grade: string;
}

interface ValidationErrors {
  name?: string;
  description?: string;
  subject?: string;
  grade?: string;
  general?: string;
}

interface BaseFormProps {
  onBack: () => void;
  onSuccess: (classroomId: string) => void;
  mode: ClassroomFormMode;
  classroomId?: string;
}

// Texto reutilizable por modo para mantener Single Source of Truth
const MODE_COPY: Record<ClassroomFormMode, {
  title: string;
  subtitle: string;
  infoPoints: string[];
  successTitle: string;
  successDescription: (name: string) => string;
  submitIdle: string;
  submitLoading: string;
  cancelLabel: string;
  redirectDelay: number;
}> = {
  create: {
    title: 'Crear Nueva Aula',
    subtitle: 'Configura tu aula virtual y organiza a tus estudiantes',
    infoPoints: [
      'Se generará un código único de invitación para compartir',
      'Podrás invitar estudiantes y asignar actividades de inmediato',
      'Desde la vista de aula podrás crear nuevas actividades',
      'El aula quedará activa y visible en tu panel de control'
    ],
    successTitle: '¡Aula Creada Exitosamente!',
    successDescription: (name) => `Tu aula "${name}" está lista para recibir estudiantes. Puedes seguir gestionándola desde Mis Aulas.`,
    submitIdle: 'Crear Aula',
    submitLoading: 'Creando Aula...',
    cancelLabel: 'Cancelar',
    redirectDelay: 2000
  },
  edit: {
    title: 'Editar Aula',
    subtitle: 'Actualiza la información del aula seleccionada',
    infoPoints: [
      'Los estudiantes mantienen el acceso si el aula continúa activa',
      'El código de invitación permanecerá igual a menos que lo regeneres',
      'Puedes actualizar la materia, la descripción y el grado en cualquier momento',
      'Los cambios se mostrarán de inmediato a estudiantes y docentes asociados'
    ],
    successTitle: 'Cambios guardados',
    successDescription: (name) => `El aula "${name}" se actualizó correctamente. Regresa a Mis Aulas para seguir trabajando.`,
    submitIdle: 'Guardar Cambios',
    submitLoading: 'Guardando Cambios...',
    cancelLabel: 'Descartar',
    redirectDelay: 1500
  }
};

// Opciones base de materias y niveles
const BASE_SUBJECT_OPTIONS = [
  'Matemáticas',
  'Lengua y Literatura',
  'Ciencias Naturales',
  'Ciencias Sociales',
  'Inglés',
  'Educación Física',
  'Arte',
  'Música',
  'Tecnología',
  'Programación',
  'Otra'
];

const BASE_GRADE_OPTIONS = [
  'Preescolar',
  '1er Grado',
  '2do Grado',
  '3er Grado',
  '4to Grado',
  '5to Grado',
  '6to Grado',
  '1er Año',
  '2do Año',
  '3er Año',
  '4to Año',
  '5to Año',
  'Universidad',
  'Curso Libre'
];

// --------------------------------------------------------------------------
// Componente reutilizable
// --------------------------------------------------------------------------
const ClassroomForm: React.FC<BaseFormProps> = ({ onBack, onSuccess, mode, classroomId }) => {
  const { user } = useAuth();
  const classroomService = useMemo(() => ClassroomService.getInstance(), []);

  const [formData, setFormData] = useState<ClassroomFormData>({
    name: '',
    description: '',
    subject: '',
    grade: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingClassroom, setIsLoadingClassroom] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentClassroom, setCurrentClassroom] = useState<Classroom | null>(null);

  const copy = MODE_COPY[mode];
  const isEditMode = mode === 'edit';

  // Cargar datos cuando se edita un aula
  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    if (!classroomId) {
      setLoadError('No se encontró el aula solicitada.');
      setIsLoadingClassroom(false);
      return;
    }

    const fetchClassroom = async () => {
      try {
        setIsLoadingClassroom(true);
        setLoadError(null);

        if (!user || user.role !== 'teacher') {
          throw new Error('Solo los docentes pueden editar aulas');
        }

        const classroom = await classroomService.getClassroomById(classroomId);
        if (!classroom) {
          throw new Error('No se encontró el aula indicada');
        }

        if (classroom.teacherId !== user.id) {
          throw new Error('No tienes permisos para editar esta aula');
        }

        setCurrentClassroom(classroom);
        setFormData({
          name: classroom.name,
          description: classroom.description ?? '',
          subject: classroom.subject ?? '',
          grade: classroom.grade ?? ''
        });
      } catch (error) {
        console.error('[ClassroomForm] Error cargando aula:', error);
        const message = error instanceof Error ? error.message : 'Error al cargar el aula.';
        setLoadError(message);
      } finally {
        setIsLoadingClassroom(false);
      }
    };

    void fetchClassroom();
  }, [classroomId, classroomService, isEditMode, user]);

  // Garantizar que las listas incluyan la materia/grado existente
  const subjectOptions = useMemo(() => {
    if (!isEditMode || !currentClassroom) {
      return BASE_SUBJECT_OPTIONS;
    }

    return BASE_SUBJECT_OPTIONS.includes(currentClassroom.subject)
      ? BASE_SUBJECT_OPTIONS
      : [...BASE_SUBJECT_OPTIONS, currentClassroom.subject];
  }, [currentClassroom, isEditMode]);

  const gradeOptions = useMemo(() => {
    if (!isEditMode || !currentClassroom) {
      return BASE_GRADE_OPTIONS;
    }

    return BASE_GRADE_OPTIONS.includes(currentClassroom.grade)
      ? BASE_GRADE_OPTIONS
      : [...BASE_GRADE_OPTIONS, currentClassroom.grade];
  }, [currentClassroom, isEditMode]);

  // Validación reutilizable
  const validateForm = (): ValidationErrors => {
    const validationErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      validationErrors.name = 'El nombre del aula es obligatorio';
    } else if (formData.name.trim().length < 3) {
      validationErrors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.name.trim().length > 100) {
      validationErrors.name = 'El nombre no puede exceder los 100 caracteres';
    }

    if (!formData.description.trim()) {
      validationErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 10) {
      validationErrors.description = 'La descripción debe tener al menos 10 caracteres';
    } else if (formData.description.trim().length > 500) {
      validationErrors.description = 'La descripción no puede exceder 500 caracteres';
    }

    if (!formData.subject) {
      validationErrors.subject = 'Selecciona una materia para el aula';
    }

    if (!formData.grade) {
      validationErrors.grade = 'Selecciona el grado o nivel educativo';
    }

    return validationErrors;
  };

  const handleInputChange = (field: keyof ClassroomFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      if (!user || user.role !== 'teacher') {
        throw new Error('Solo los docentes pueden gestionar aulas');
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        subject: formData.subject,
        grade: formData.grade
      };

      let classroom: Classroom;

      if (isEditMode) {
        if (!classroomId) {
          throw new Error('No se pudo identificar el aula a actualizar');
        }

        classroom = await classroomService.updateClassroom(classroomId, payload);
        setCurrentClassroom(classroom);
      } else {
        classroom = await classroomService.createClassroom({
          ...payload,
          teacherId: user.id,
          teacher: user,
          isActive: true
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess(classroom.id);
      }, copy.redirectDelay);
    } catch (error) {
      console.error('[ClassroomForm] Error al guardar aula:', error);
      const message = error instanceof Error ? error.message : 'Error inesperado al guardar el aula.';

      if (message.includes('docente')) {
        setErrors({ general: 'No tienes permisos para realizar esta acción.' });
      } else if (message.toLowerCase().includes('red') || message.toLowerCase().includes('network')) {
        setErrors({ general: 'Error de conexión. Verifica tu internet e inténtalo nuevamente.' });
      } else if (message.includes('existe')) {
        setErrors({ name: 'Ya existe un aula con este nombre.' });
      } else {
        setErrors({ general: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{copy.successTitle}</h2>
          <p className="text-gray-600 mb-6">{copy.successDescription(formData.name)}</p>
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (isLoadingClassroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del aula...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No pudimos cargar el aula</h2>
          <p className="text-gray-600 mb-6">{loadError}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
              <p className="text-gray-600 mt-1">{copy.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Información del Aula</h2>
            <p className="text-gray-600 mt-1">Completa los datos y guarda para finalizar.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">No pudimos guardar tu aula</p>
                  <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Aula *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Ej: Lengua y Literatura 2°A"
                  disabled={isSubmitting}
                  maxLength={100}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.name}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">{formData.name.length}/100 caracteres</p>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Materia *
                </label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(event) => handleInputChange('subject', event.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                    errors.subject
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                  disabled={isSubmitting}
                >
                  <option value="">Seleccionar materia</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.subject}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  Grado / Nivel *
                </label>
                <select
                  id="grade"
                  value={formData.grade}
                  onChange={(event) => handleInputChange('grade', event.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                    errors.grade
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                  disabled={isSubmitting}
                >
                  <option value="">Seleccionar grado</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
                {errors.grade && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.grade}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(event) => handleInputChange('description', event.target.value)}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg transition-colors resize-none ${
                  errors.description
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                } focus:outline-none focus:ring-2`}
                placeholder="Describe los objetivos, materiales o metodología del aula"
                disabled={isSubmitting}
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">{formData.description.length}/500 caracteres</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Recordatorios clave</h3>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    {copy.infoPoints.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                {copy.cancelLabel}
              </button>

              <button
                type="submit"
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{copy.submitLoading}</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    <span>{copy.submitIdle}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// Wrappers específicos por caso de uso
// --------------------------------------------------------------------------

interface CreateProps {
  onBack: () => void;
  onSuccess: (classroomId: string) => void;
}

export const CreateClassroomForm: React.FC<CreateProps> = (props) => (
  <ClassroomForm {...props} mode="create" />
);

interface EditProps {
  onBack: () => void;
  onSuccess: (classroomId: string) => void;
  classroomId: string;
}

export const EditClassroomForm: React.FC<EditProps> = (props) => (
  <ClassroomForm {...props} mode="edit" classroomId={props.classroomId} />
);

export default ClassroomForm;
