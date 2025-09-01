// ============================================================================
// FORMULARIO DE CREACIÓN DE AULAS
// ============================================================================
// Permite a los docentes crear nuevas aulas virtuales con validación completa

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { 
  Users, 
  BookOpen, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  Info
} from 'lucide-react';

/**
 * Props del componente CreateClassroomForm
 */
interface CreateClassroomFormProps {
  onBack: () => void;
  onSuccess: (classroomId: string) => void;
}

/**
 * Datos del formulario para crear un aula
 */
interface ClassroomFormData {
  name: string;
  description: string;
  subject: string;
  grade: string;
}

/**
 * Estado de validación del formulario
 */
interface ValidationErrors {
  name?: string;
  description?: string;
  subject?: string;
  grade?: string;
  general?: string;
}

/**
 * Componente para crear nuevas aulas virtuales
 * Incluye validación en tiempo real y manejo de errores completo
 */
export const CreateClassroomForm: React.FC<CreateClassroomFormProps> = ({ 
  onBack, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: '',
    description: '',
    subject: '',
    grade: ''
  });

  const classroomService = ClassroomService.getInstance();

  /**
   * Opciones predefinidas para materias y grados
   */
  const subjectOptions = [
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

  const gradeOptions = [
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

  /**
   * Valida el formulario y retorna los errores encontrados
   */
  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    // Validar nombre del aula
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del aula es obligatorio';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }

    // Validar descripción
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'La descripción no puede exceder 500 caracteres';
    }

    // Validar materia
    if (!formData.subject) {
      newErrors.subject = 'Debes seleccionar una materia';
    }

    // Validar grado
    if (!formData.grade) {
      newErrors.grade = 'Debes seleccionar un grado';
    }

    return newErrors;
  };

  /**
   * Maneja el cambio en los campos del formulario
   */
  const handleInputChange = (field: keyof ClassroomFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error específico cuando el usuario corrige
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar formulario
      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
      }

      setIsLoading(true);
      setErrors({});

      // Verificar que el usuario sea docente
      if (!user || user.role !== 'teacher') {
        throw new Error('Solo los docentes pueden crear aulas');
      }

      // Crear el aula
      const newClassroom = await classroomService.createClassroom({
        name: formData.name.trim(),
        description: formData.description.trim(),
        subject: formData.subject,
        grade: formData.grade,
        teacherId: user.id,
        teacher: user,
        isActive: true
      });

      // Mostrar mensaje de éxito
      setShowSuccess(true);
      
      // Redirigir después de un breve delay
      setTimeout(() => {
        onSuccess(newClassroom.id);
      }, 2000);

    } catch (error) {
      console.error('Error al crear aula:', error);
      
      // Manejar diferentes tipos de errores
      if (error instanceof Error) {
        if (error.message.includes('docente')) {
          setErrors({ general: 'No tienes permisos para crear aulas' });
        } else if (error.message.includes('red') || error.message.includes('network')) {
          setErrors({ general: 'Error de conexión. Verifica tu internet e intenta nuevamente.' });
        } else if (error.message.includes('existe')) {
          setErrors({ name: 'Ya existe un aula con este nombre' });
        } else {
          setErrors({ general: 'Error al crear el aula. Intenta nuevamente.' });
        }
      } else {
        setErrors({ general: 'Error inesperado. Contacta al soporte técnico.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar mensaje de éxito
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ¡Aula Creada Exitosamente!
          </h2>
          <p className="text-gray-600 mb-6">
            Tu aula "{formData.name}" ha sido creada y ya puedes empezar a agregar estudiantes.
          </p>
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            disabled={isLoading}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Crear Nueva Aula</h1>
              <p className="text-gray-600 mt-1">
                Configura tu aula virtual para organizar a tus estudiantes
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Información del Aula</h2>
            <p className="text-gray-600 mt-1">
              Completa los datos básicos de tu nueva aula virtual
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error general */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error al crear aula</p>
                  <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Nombre del aula */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Aula *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Ej: Matemáticas 5to Grado A"
                  disabled={isLoading}
                  maxLength={100}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.name}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {formData.name.length}/100 caracteres
                </p>
              </div>

              {/* Materia */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Materia *
                </label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                    errors.subject
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                  disabled={isLoading}
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

              {/* Grado */}
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  Grado/Nivel *
                </label>
                <select
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                    errors.grade
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                  } focus:outline-none focus:ring-2`}
                  disabled={isLoading}
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

            {/* Descripción */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Aula *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg transition-colors resize-none ${
                  errors.description
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                } focus:outline-none focus:ring-2`}
                placeholder="Describe los objetivos y contenido de tu aula virtual..."
                disabled={isLoading}
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/500 caracteres
              </p>
            </div>

            {/* Información importante */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">¿Qué sucede después?</h3>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Se generará un código único de invitación</li>
                    <li>• Podrás compartir el código con tus estudiantes</li>
                    <li>• Los estudiantes podrán unirse usando el código</li>
                    <li>• Podrás crear actividades para esta aula</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creando Aula...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    <span>Crear Aula</span>
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
