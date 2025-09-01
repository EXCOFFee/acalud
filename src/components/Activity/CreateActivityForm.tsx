// ============================================================================
// FORMULARIO DE CREACIÓN DE ACTIVIDADES
// ============================================================================
// Permite a los docentes crear actividades educativas interactivas

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { ActivityService } from '../../services/implementations/ActivityService';
import { Classroom } from '../../types';
import { 
  BookOpen, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  Info,
  Plus,
  Minus,
  HelpCircle,
  Target,
  Star
} from 'lucide-react';

/**
 * Props del componente CreateActivityForm
 */
interface CreateActivityFormProps {
  onBack: () => void;
  onSuccess: (activityId: string) => void;
  classroomId?: string; // ID del aula preseleccionada (opcional)
}

/**
 * Tipos de actividades disponibles
 */
type ActivityType = 'quiz' | 'game' | 'assignment' | 'interactive' | 'drag-drop' | 'memory';

/**
 * Niveles de dificultad
 */
type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Pregunta para quiz/juego
 */
interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'drag-drop' | 'matching';
  options: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
}

/**
 * Datos del formulario de actividad
 */
interface ActivityFormData {
  title: string;
  description: string;
  subject: string;
  classroomId: string;
  type: ActivityType;
  difficulty: DifficultyLevel;
  timeLimit: number; // En minutos
  maxScore: number;
  instructions: string;
  questions: Question[];
}

/**
 * Errores de validación
 */
interface ValidationErrors {
  title?: string;
  description?: string;
  subject?: string;
  classroomId?: string;
  type?: string;
  difficulty?: string;
  timeLimit?: string;
  maxScore?: string;
  instructions?: string;
  questions?: string;
  general?: string;
}

/**
 * Componente para crear nuevas actividades educativas
 * Incluye diferentes tipos de actividades y validación completa
 */
export const CreateActivityForm: React.FC<CreateActivityFormProps> = ({ 
  onBack, 
  onSuccess,
  classroomId 
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    description: '',
    subject: '',
    classroomId: classroomId || '',
    type: 'quiz',
    difficulty: 'medium',
    timeLimit: 30,
    maxScore: 100,
    instructions: '',
    questions: [
      {
        id: '1',
        text: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '0',
        explanation: '',
        points: 10
      }
    ]
  });

  const classroomService = ClassroomService.getInstance();
  const activityService = ActivityService.getInstance();

  /**
   * Configuración de tipos de actividades
   */
  const activityTypes = [
    {
      value: 'quiz' as ActivityType,
      label: 'Quiz',
      description: 'Preguntas de opción múltiple',
      icon: HelpCircle,
      color: 'blue'
    },
    {
      value: 'game' as ActivityType,
      label: 'Juego',
      description: 'Actividad gamificada interactiva',
      icon: Target,
      color: 'green'
    },
    {
      value: 'memory' as ActivityType,
      label: 'Memoria',
      description: 'Juego de memoria y asociación',
      icon: Star,
      color: 'purple'
    },
    {
      value: 'puzzle' as ActivityType,
      label: 'Rompecabezas',
      description: 'Actividades de resolución de problemas',
      icon: BookOpen,
      color: 'yellow'
    }
  ];

  /**
   * Cargar aulas del docente al montar el componente
   */
  useEffect(() => {
    const loadClassrooms = async () => {
      if (!user) return;

      try {
        setLoadingClassrooms(true);
        const userClassrooms = await classroomService.getClassroomsByTeacher(user.id);
        setClassrooms(userClassrooms);
        
        // Si no hay aula preseleccionada y hay aulas disponibles, seleccionar la primera
        if (!classroomId && userClassrooms.length > 0) {
          setFormData(prev => ({ ...prev, classroomId: userClassrooms[0].id }));
        }
      } catch (error) {
        console.error('Error al cargar aulas:', error);
        setErrors({ general: 'Error al cargar las aulas disponibles' });
      } finally {
        setLoadingClassrooms(false);
      }
    };

    loadClassrooms();
  }, [user, classroomId]);

  /**
   * Valida el formulario y retorna los errores
   */
  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    // Validar título
    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'El título debe tener al menos 5 caracteres';
    } else if (formData.title.trim().length > 150) {
      newErrors.title = 'El título no puede exceder 150 caracteres';
    }

    // Validar descripción
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'La descripción no puede exceder 500 caracteres';
    }

    // Validar aula
    if (!formData.classroomId) {
      newErrors.classroomId = 'Debes seleccionar un aula';
    }

    // Validar tiempo límite
    if (formData.timeLimit < 5) {
      newErrors.timeLimit = 'El tiempo mínimo es 5 minutos';
    } else if (formData.timeLimit > 240) {
      newErrors.timeLimit = 'El tiempo máximo es 240 minutos (4 horas)';
    }

    // Validar puntuación máxima
    if (formData.maxScore < 10) {
      newErrors.maxScore = 'La puntuación mínima es 10 puntos';
    } else if (formData.maxScore > 1000) {
      newErrors.maxScore = 'La puntuación máxima es 1000 puntos';
    }

    // Validar instrucciones
    if (!formData.instructions.trim()) {
      newErrors.instructions = 'Las instrucciones son obligatorias';
    } else if (formData.instructions.trim().length < 20) {
      newErrors.instructions = 'Las instrucciones deben tener al menos 20 caracteres';
    }

    // Validar preguntas (solo para quiz y juegos)
    if (formData.type === 'quiz' || formData.type === 'game') {
      const validQuestions = formData.questions.filter(q => 
        q.text.trim() && 
        q.options && q.options.every(opt => opt.trim()) &&
        typeof q.correctAnswer === 'string' && parseInt(q.correctAnswer) >= 0 && 
        parseInt(q.correctAnswer) < q.options.length
      );

      if (validQuestions.length < 1) {
        newErrors.questions = 'Debes crear al menos 1 pregunta válida';
      } else if (validQuestions.length < 3) {
        newErrors.questions = 'Se recomienda tener al menos 3 preguntas';
      }
    }

    return newErrors;
  };

  /**
   * Maneja el cambio en los campos básicos del formulario
   */
  const handleInputChange = (field: keyof ActivityFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error específico
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Agrega una nueva pregunta
   */
  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '0',
      explanation: '',
      points: 10
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  /**
   * Elimina una pregunta
   */
  const removeQuestion = (questionId: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  /**
   * Actualiza una pregunta específica
   */
  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
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

      // Verificar permisos
      if (!user || user.role !== 'teacher') {
        throw new Error('Solo los docentes pueden crear actividades');
      }

      // Preparar datos para envío
      const activityData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        classroomId: formData.classroomId,
        type: formData.type,
        difficulty: formData.difficulty,
        subject: formData.subject || 'General',
        teacherId: user.id,
        isPublic: false,
        tags: [],
        estimatedTime: formData.timeLimit,
        rewards: {
          coins: formData.maxScore,
          experience: Math.floor(formData.maxScore * 1.5),
          achievements: []
        },
        isActive: true,
        content: {
          questions: formData.questions.filter(q => 
            q.text.trim() && q.options.every(opt => opt.trim())
          ),
          instructions: formData.instructions.trim()
        }
      };

      // Crear la actividad
      const newActivity = await activityService.createActivity(activityData);

      // Mostrar mensaje de éxito
      setShowSuccess(true);
      
      // Redirigir después de delay
      setTimeout(() => {
        onSuccess(newActivity.id);
      }, 2000);

    } catch (error) {
      console.error('Error al crear actividad:', error);
      
      // Manejar errores específicos
      if (error instanceof Error) {
        if (error.message.includes('permisos')) {
          setErrors({ general: 'No tienes permisos para crear actividades en esta aula' });
        } else if (error.message.includes('aula')) {
          setErrors({ classroomId: 'Aula no válida o no accesible' });
        } else if (error.message.includes('red') || error.message.includes('network')) {
          setErrors({ general: 'Error de conexión. Verifica tu internet e intenta nuevamente.' });
        } else {
          setErrors({ general: 'Error al crear la actividad. Intenta nuevamente.' });
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
            ¡Actividad Creada Exitosamente!
          </h2>
          <p className="text-gray-600 mb-6">
            Tu actividad "{formData.title}" ha sido creada y ya está disponible para tus estudiantes.
          </p>
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Crear Nueva Actividad</h1>
              <p className="text-gray-600 mt-1">
                Diseña contenido educativo interactivo para tus estudiantes
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error general */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error al crear actividad</p>
                <p className="text-sm text-red-700 mt-1">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Información Básica */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Información Básica</h2>
              <p className="text-gray-600 mt-1">Configure los datos principales de la actividad</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Título */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Título de la Actividad *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      errors.title
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    } focus:outline-none focus:ring-2`}
                    placeholder="Ej: Tabla de Multiplicar del 7"
                    disabled={isLoading}
                    maxLength={150}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.title}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.title.length}/150 caracteres
                  </p>
                </div>

                {/* Aula */}
                <div>
                  <label htmlFor="classroom" className="block text-sm font-medium text-gray-700 mb-2">
                    Aula de Destino *
                  </label>
                  {loadingClassrooms ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-gray-500">Cargando aulas...</span>
                    </div>
                  ) : (
                    <select
                      id="classroom"
                      value={formData.classroomId}
                      onChange={(e) => handleInputChange('classroomId', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                        errors.classroomId
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                      } focus:outline-none focus:ring-2`}
                      disabled={isLoading}
                    >
                      <option value="">Seleccionar aula</option>
                      {classrooms.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.name} - {classroom.subject} ({classroom.students.length} estudiantes)
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.classroomId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.classroomId}
                    </p>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors resize-none ${
                    errors.description
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Describe los objetivos y contenido de esta actividad..."
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
            </div>
          </div>

          {/* Configuración de la Actividad */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Configuración</h2>
              <p className="text-gray-600 mt-1">Define el tipo y parámetros de la actividad</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Tipo de Actividad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Tipo de Actividad *
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {activityTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.value;
                    
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleInputChange('type', type.value)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? `border-${type.color}-500 bg-${type.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        disabled={isLoading}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                          isSelected ? `bg-${type.color}-100` : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            isSelected ? `text-${type.color}-600` : 'text-gray-600'
                          }`} />
                        </div>
                        <h3 className={`font-semibold ${
                          isSelected ? `text-${type.color}-900` : 'text-gray-900'
                        }`}>
                          {type.label}
                        </h3>
                        <p className={`text-sm ${
                          isSelected ? `text-${type.color}-700` : 'text-gray-600'
                        }`}>
                          {type.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configuración adicional */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Dificultad */}
                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                    Dificultad *
                  </label>
                  <select
                    id="difficulty"
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty', e.target.value as DifficultyLevel)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-200 focus:outline-none focus:ring-2"
                    disabled={isLoading}
                  >
                    <option value="easy">Fácil</option>
                    <option value="medium">Medio</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>

                {/* Tiempo límite */}
                <div>
                  <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo Límite (minutos) *
                  </label>
                  <input
                    id="timeLimit"
                    type="number"
                    min="5"
                    max="240"
                    value={formData.timeLimit}
                    onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value) || 30)}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      errors.timeLimit
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    } focus:outline-none focus:ring-2`}
                    disabled={isLoading}
                  />
                  {errors.timeLimit && (
                    <p className="mt-1 text-sm text-red-600">{errors.timeLimit}</p>
                  )}
                </div>

                {/* Puntuación máxima */}
                <div>
                  <label htmlFor="maxScore" className="block text-sm font-medium text-gray-700 mb-2">
                    Puntuación Máxima *
                  </label>
                  <input
                    id="maxScore"
                    type="number"
                    min="10"
                    max="1000"
                    step="10"
                    value={formData.maxScore}
                    onChange={(e) => handleInputChange('maxScore', parseInt(e.target.value) || 100)}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      errors.maxScore
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    } focus:outline-none focus:ring-2`}
                    disabled={isLoading}
                  />
                  {errors.maxScore && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxScore}</p>
                  )}
                </div>
              </div>

              {/* Instrucciones */}
              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                  Instrucciones para los Estudiantes *
                </label>
                <textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors resize-none ${
                    errors.instructions
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Explica claramente cómo deben resolver la actividad, qué se espera de ellos y cualquier consideración especial..."
                  disabled={isLoading}
                />
                {errors.instructions && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.instructions}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Preguntas (solo para quiz y juegos) */}
          {(formData.type === 'quiz' || formData.type === 'game') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Preguntas</h2>
                    <p className="text-gray-600 mt-1">Crea las preguntas para tu actividad</p>
                  </div>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Pregunta
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {errors.questions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <p className="text-sm text-yellow-700">{errors.questions}</p>
                  </div>
                )}

                {formData.questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Pregunta {index + 1}
                      </h3>
                      {formData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={isLoading}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Texto de la pregunta */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pregunta *
                        </label>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-200 focus:outline-none focus:ring-2"
                          placeholder="Escribe tu pregunta aquí..."
                          disabled={isLoading}
                        />
                      </div>

                      {/* Opciones */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Opciones de Respuesta *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={question.correctAnswer === optionIndex.toString()}
                                onChange={() => updateQuestion(question.id, { correctAnswer: optionIndex.toString() })}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                disabled={isLoading}
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...question.options];
                                  newOptions[optionIndex] = e.target.value;
                                  updateQuestion(question.id, { options: newOptions });
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-200 focus:outline-none focus:ring-1"
                                placeholder={`Opción ${optionIndex + 1}`}
                                disabled={isLoading}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Selecciona la opción correcta marcando el círculo correspondiente
                        </p>
                      </div>

                      {/* Explicación (opcional) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explicación (Opcional)
                        </label>
                        <textarea
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-200 focus:outline-none focus:ring-1 resize-none"
                          placeholder="Explica por qué esta es la respuesta correcta..."
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información para otros tipos */}
          {formData.type === 'memory' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    {formData.type === 'memory' ? 'Actividad de Memoria' : 'Rompecabezas'}
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {formData.type === 'memory' 
                      ? 'Este tipo de actividad se configurará automáticamente con elementos de memoria basados en el contenido de tu aula.'
                      : 'Los rompecabezas se generarán automáticamente según el nivel de dificultad seleccionado.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-between pt-6">
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
              className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creando Actividad...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Crear Actividad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
