// ============================================================================
// 🎮 FORMULARIO DE CREACIÓN DE JUEGOS EDUCATIVOS - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE COMPONENTE?
 * Permite a los profesores crear juegos educativos gamificados:
 * - Trivias interactivas con preguntas de opción múltiple
 * - Crucigramas educativos
 * - Simulaciones inmersivas
 * 
 * 🏗️ ARQUITECTURA:
 * 1. Formulario paso a paso (wizard)
 * 2. Validación en tiempo real
 * 3. Preview del juego antes de publicar
 * 4. Integración con API de juegos
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import {
  Gamepad2,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  Award
} from 'lucide-react';

// ============================================================================
// 📋 INTERFACES Y TIPOS
// ============================================================================

type CreateGameDestination = 'teacher-dashboard' | 'games';

interface CreateGameFormProps {
  onNavigate: (page: CreateGameDestination) => void;
}

interface Question {
  questionText: string;
  options: string[];
  correctAnswer: number;
  points: number;
  order: number;
}

interface GameFormData {
  title: string;
  description: string;
  gameType: 'trivia' | 'crossword' | 'simulation';
  subject: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  educationLevel: 'PRIMARY' | 'SECONDARY' | 'HIGH_SCHOOL';
  duration: number; // en segundos
  totalPoints: number;
  questions: Question[];
}

// ============================================================================
// 🎨 COMPONENTE PRINCIPAL
// ============================================================================

export const CreateGameForm: React.FC<CreateGameFormProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  
  // Estados del formulario
  const [formData, setFormData] = useState<GameFormData>({
    title: '',
    description: '',
    gameType: 'trivia',
    subject: 'MATHEMATICS',
    difficulty: 'EASY',
    educationLevel: 'PRIMARY',
    duration: 600, // 10 minutos por defecto
    totalPoints: 1000,
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 100,
    order: 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ========================================================================
  // 🔧 FUNCIONES AUXILIARES
  // ========================================================================

  const handleInputChange = <K extends keyof GameFormData>(field: K, value: GameFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionChange = <K extends keyof Question>(field: K, value: Question[K]) => {
    setCurrentQuestion(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addQuestion = () => {
    // Validar que la pregunta esté completa
    if (!currentQuestion.questionText.trim()) {
      setError('El texto de la pregunta es obligatorio');
      return;
    }

    if (currentQuestion.options.some(opt => !opt.trim())) {
      setError('Todas las opciones deben tener texto');
      return;
    }

    const newQuestion = {
      ...currentQuestion,
      order: formData.questions.length + 1
    };

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    // Resetear formulario de pregunta
    setCurrentQuestion({
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 100,
      order: formData.questions.length + 2
    });

    setError(null);
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validaciones finales
      if (!formData.title.trim()) {
        throw new Error('El título del juego es obligatorio');
      }

      if (formData.questions.length === 0) {
        throw new Error('Debes agregar al menos una pregunta');
      }

      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No estás autenticado. Por favor, inicia sesión.');
      }

      // Preparar datos para enviar al backend
      const gameData = {
        ...formData,
        createdBy: user?.id,
        isActive: true
      };

      // Enviar al backend
      const response = await fetch('http://localhost:3001/api/v1/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gameData)
      });

      if (!response.ok) {
        const errorData: unknown = await response.json();

        if (
          errorData &&
          typeof errorData === 'object' &&
          'message' in errorData &&
          typeof (errorData as { message: unknown }).message === 'string'
        ) {
          throw new Error((errorData as { message: string }).message);
        }

        throw new Error('Error al crear el juego');
      }

      const createdGame: unknown = await response.json();
      console.log('✅ Juego creado exitosamente:', createdGame);

      setSuccess(true);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        onNavigate('games');
      }, 2000);

    } catch (err) {
      console.error('❌ Error al crear juego:', err);

      if (err instanceof Error) {
        setError(err.message || 'Error desconocido al crear el juego');
        return;
      }

      setError('Error desconocido al crear el juego');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================================
  // 🎨 RENDERIZADO
  // ========================================================================

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Juego creado exitosamente! 🎉</h2>
          <p className="text-gray-600 mb-4">Tu juego "{formData.title}" ya está disponible.</p>
          <p className="text-sm text-gray-500">Redirigiendo a la lista de juegos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => onNavigate('teacher-dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Gamepad2 className="w-8 h-8 mr-3 text-pink-600" />
              Crear Nuevo Juego Educativo
            </h1>
            <p className="text-gray-600 mt-2">Diseña un juego interactivo para tus estudiantes</p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Información Básica */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Información Básica</h2>
            
            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del Juego *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Ej: Trivia Matemáticas Básicas"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Describe de qué trata este juego..."
                />
              </div>

              {/* Grid de opciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Juego */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Juego *
                  </label>
                  <select
                    value={formData.gameType}
                    onChange={(e) => handleInputChange('gameType', e.target.value as GameFormData['gameType'])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="trivia">🎯 Trivia (Preguntas)</option>
                    <option value="crossword">📝 Crucigrama</option>
                    <option value="simulation">🎮 Simulación</option>
                  </select>
                </div>

                {/* Materia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materia *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value as GameFormData['subject'])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="MATHEMATICS">📐 Matemáticas</option>
                    <option value="LANGUAGE">📚 Lenguaje</option>
                    <option value="SCIENCE">🔬 Ciencias</option>
                    <option value="HISTORY">🏛️ Historia</option>
                    <option value="GEOGRAPHY">🌍 Geografía</option>
                    <option value="ARTS">🎨 Arte</option>
                    <option value="PHYSICAL_EDUCATION">⚽ Educación Física</option>
                  </select>
                </div>

                {/* Dificultad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dificultad *
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty', e.target.value as GameFormData['difficulty'])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="EASY">🟢 Fácil</option>
                    <option value="MEDIUM">🟡 Medio</option>
                    <option value="HARD">🔴 Difícil</option>
                  </select>
                </div>

                {/* Nivel Educativo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nivel Educativo *
                  </label>
                  <select
                    value={formData.educationLevel}
                    onChange={(e) => handleInputChange('educationLevel', e.target.value as GameFormData['educationLevel'])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="PRIMARY">👶 Primaria</option>
                    <option value="SECONDARY">🧒 Secundaria</option>
                    <option value="HIGH_SCHOOL">🎓 Bachillerato</option>
                  </select>
                </div>

                {/* Duración */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    Duración (minutos) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration / 60}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) * 60)}
                    min="1"
                    max="120"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                {/* Puntos Totales */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Award className="w-4 h-4 mr-2" />
                    Puntos Totales *
                  </label>
                  <input
                    type="number"
                    value={formData.totalPoints}
                    onChange={(e) => handleInputChange('totalPoints', parseInt(e.target.value))}
                    min="100"
                    step="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Agregar Preguntas */}
          {formData.gameType === 'trivia' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">❓ Preguntas</h2>
              
              {/* Pregunta Actual */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto de la Pregunta
                  </label>
                  <input
                    type="text"
                    value={currentQuestion.questionText}
                    onChange={(e) => handleQuestionChange('questionText', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="¿Cuánto es 2 + 2?"
                  />
                </div>

                {/* Opciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={currentQuestion.correctAnswer === index}
                        onChange={() => handleQuestionChange('correctAnswer', index)}
                        className="text-pink-600 focus:ring-pink-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        placeholder={`Opción ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Puntos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Puntos por Respuesta Correcta
                  </label>
                  <input
                    type="number"
                    value={currentQuestion.points}
                    onChange={(e) => handleQuestionChange('points', parseInt(e.target.value))}
                    min="10"
                    step="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Pregunta</span>
                </button>
              </div>

              {/* Lista de Preguntas Agregadas */}
              {formData.questions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Preguntas Agregadas ({formData.questions.length})
                  </h3>
                  {formData.questions.map((q, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {index + 1}. {q.questionText}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Respuesta correcta: {q.options[q.correctAnswer]} • {q.points} puntos
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700 ml-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mensajes de Error/Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => onNavigate('teacher-dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.questions.length === 0}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Creando...' : 'Crear Juego'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
