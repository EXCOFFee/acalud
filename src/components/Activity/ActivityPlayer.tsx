// ============================================================================
// REPRODUCTOR/EJECUTOR DE ACTIVIDADES
// ============================================================================
// Permite a los estudiantes realizar/jugar las actividades creadas por docentes

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { ActivityService } from '../../services/implementations/ActivityService';
import { Activity } from '../../types';
import {
  ArrowLeft,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  Play,
  Send
} from 'lucide-react';

interface ActivityPlayerProps {
  activityId: string;
  classroomId: string;
  onBack: () => void;
  onComplete: (score: number) => void;
}

interface QuestionData {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  points: number;
}

interface Answer {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number;
}

type QuestionPayload = {
  question?: string;
  text?: string;
  options?: string[];
  correctAnswer?: number | string;
  explanation?: string;
  points?: number;
};

const isQuestionPayload = (value: unknown): value is QuestionPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<QuestionPayload>;
  const hasOptions = !candidate.options || Array.isArray(candidate.options);
  const hasQuestionText = typeof candidate.question === 'string' || typeof candidate.text === 'string';

  return hasOptions && hasQuestionText;
};

/**
 * Componente para que los estudiantes realicen actividades
 */
export const ActivityPlayer: React.FC<ActivityPlayerProps> = ({
  activityId,
  onBack,
  onComplete
}) => {
  const { user } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const activityService = useMemo(() => ActivityService.getInstance(), []);

  /**
   * Cargar actividad y preguntas
   */
  useEffect(() => {
    const loadActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const activityData = await activityService.getActivityById(activityId);
        
        if (!activityData) {
          setError('Actividad no encontrada');
          setIsLoading(false);
          return;
        }
        
    setActivity(activityData);

    // Extraer preguntas del contenido y convertir al formato esperado
    const rawQuestions = activityData.content?.questions as unknown;

        if (Array.isArray(rawQuestions)) {
          const questionsData: QuestionData[] = rawQuestions
            .filter(isQuestionPayload)
            .map((question) => ({
              question: question.question ?? question.text ?? 'Pregunta',
              options: question.options ?? [],
              correctAnswer: typeof question.correctAnswer === 'number'
                ? question.correctAnswer
                : parseInt(String(question.correctAnswer ?? '0'), 10),
              explanation: question.explanation,
              points: question.points ?? 10
            }));
          setQuestions(questionsData);
        }

        // Configurar tiempo límite (en segundos)
        if (activityData.estimatedTime) {
          setTimeRemaining(activityData.estimatedTime * 60); // Convertir minutos a segundos
        }

        setQuestionStartTime(Date.now());
      } catch (error) {
        console.error('Error al cargar actividad:', error);
        setError('No se pudo cargar la actividad. Intenta nuevamente.');
      } finally {
        setIsLoading(false);
      }
    };

    loadActivity();
  }, [activityId, activityService]);

  /**
   * Seleccionar una opción
   */
  const handleSelectOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  /**
   * Confirmar respuesta y pasar a siguiente pregunta
   */
  const handleNextQuestion = () => {
    if (selectedOption === null) return;

    const question = questions[currentQuestionIndex];
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = selectedOption === question.correctAnswer;

    // Guardar respuesta
    const answer: Answer = {
      questionIndex: currentQuestionIndex,
      selectedOption,
      isCorrect,
      timeSpent
    };

    setAnswers(prev => [...prev, answer]);

    // Pasar a siguiente pregunta o finalizar
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setQuestionStartTime(Date.now());
    } else {
      // Última pregunta - mostrar resultados
      submitActivity([...answers, answer]);
    }
  };

  /**
   * Enviar actividad completada al backend
   * Guarda la completación y recibe recompensas (monedas y experiencia)
   */
  const submitActivity = useCallback(async (finalAnswers: Answer[]) => {
    try {
      setIsSubmitting(true);

      // Calcular puntuación final
      const correctAnswers = finalAnswers.filter(a => a.isCorrect).length;
      const totalQuestions = questions.length;
      const score = Math.round((correctAnswers / totalQuestions) * 100); // Score de 0 a 100
      const totalTimeSpent = Math.floor((Date.now() - startTime) / 1000); // Tiempo en segundos

      console.log('📊 Enviando completación al backend:', {
        activityId,
        studentId: user!.id,
        score,
        timeSpent: totalTimeSpent,
        correctAnswers,
        totalQuestions
      });

      // 🚀 Enviar al backend para registrar completación y otorgar recompensas
      try {
        const completion = await activityService.completeActivity(activityId, {
          score,
          timeSpent: totalTimeSpent,
          answers: finalAnswers.map((a, index) => ({
            questionId: `question-${index}`, // ID de pregunta (en este caso usamos índice)
            answer: a.selectedOption.toString(), // Respuesta seleccionada (índice de opción)
            isCorrect: a.isCorrect, // Si fue correcta
            timeSpent: a.timeSpent // Tiempo en esta pregunta
          }))
        });

        console.log('✅ Actividad completada exitosamente:', completion);
        console.log('💰 Recompensas otorgadas - Recarga para ver tu nuevo saldo');
      } catch (backendError) {
        console.error('❌ Error al guardar en backend:', backendError);
        // Continuar mostrando resultados incluso si falla el backend
      }

      // ✅ Mostrar resultados primero, NO redirigir automáticamente
      // La redirección ocurrirá cuando el usuario haga clic en "Volver"
      setShowResults(true);
    } catch (error) {
      console.error('Error al enviar actividad:', error);
      setError('Error al guardar tus respuestas. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [activityId, activityService, questions, startTime, user]);

  /**
   * Finalizar actividad (tiempo agotado)
   */
  const handleFinish = useCallback(() => {
    // Agregar respuesta actual si hay una seleccionada
    const finalAnswers = [...answers];
    
    if (selectedOption !== null && answers.length < questions.length) {
      const question = questions[currentQuestionIndex];
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      const isCorrect = selectedOption === question.correctAnswer;

      finalAnswers.push({
        questionIndex: currentQuestionIndex,
        selectedOption,
        isCorrect,
        timeSpent
      });
    }
    submitActivity(finalAnswers);
  }, [answers, currentQuestionIndex, questionStartTime, questions, selectedOption, submitActivity]);

  /**
   * Timer para tiempo restante
   */
  useEffect(() => {
    if (timeRemaining <= 0 || showResults) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Tiempo agotado - enviar automáticamente
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleFinish, showResults, timeRemaining]);

  /**
   * Formatear tiempo en MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Calcular estadísticas finales
   */
  const getResults = () => {
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const totalQuestions = questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const score = Math.round((correctAnswers / totalQuestions) * (activity?.rewards.coins || 100));

    return { correctAnswers, totalQuestions, percentage, score };
  };

  /**
   * Manejar el cierre de resultados y volver a actividades
   */
  const handleFinishAndReturn = () => {
    const results = getResults();
    // Notificar al padre sobre la puntuación obtenida
    onComplete(results.score);
    // Volver a la vista anterior
    onBack();
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando actividad...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Actividad no encontrada'}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de resultados
  if (showResults) {
    const results = getResults();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
              results.percentage >= 70 ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <Trophy className={`w-10 h-10 ${
                results.percentage >= 70 ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Actividad Completada!
            </h1>
            <p className="text-gray-600">{activity.title}</p>
          </div>

          {/* Resultados principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {results.percentage}%
              </div>
              <div className="text-sm text-gray-600">Puntuación</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {results.correctAnswers}/{results.totalQuestions}
              </div>
              <div className="text-sm text-gray-600">Respuestas correctas</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {results.score}
              </div>
              <div className="text-sm text-gray-600">Puntos ganados</div>
            </div>
          </div>

          {/* Revisión de respuestas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revisión de Respuestas</h2>
            <div className="space-y-4">
              {answers.map((answer, index) => {
                const question = questions[answer.questionIndex];
                return (
                  <div key={index} className={`p-4 rounded-lg border-2 ${
                    answer.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 flex-1">
                        {index + 1}. {question.question}
                      </h3>
                      {answer.isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 ml-2" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 ml-2" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Tu respuesta: </span>
                        <span className={answer.isCorrect ? 'text-green-700' : 'text-red-700'}>
                          {question.options[answer.selectedOption]}
                        </span>
                      </div>

                      {!answer.isCorrect && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Respuesta correcta: </span>
                          <span className="text-green-700">
                            {question.options[question.correctAnswer]}
                          </span>
                        </div>
                      )}

                      {question.explanation && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          💡 {question.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón volver */}
          <div className="text-center">
            <button
              onClick={handleFinishAndReturn}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Volver a Actividades
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de juego
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header con info */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Salir
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{activity.title}</h1>
              <div className={`flex items-center px-4 py-2 rounded-lg ${
                timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-5 h-5 mr-2" />
                <span className="font-bold">{formatTime(timeRemaining)}</span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progreso</span>
                <span>{currentQuestionIndex + 1} / {questions.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pregunta actual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-purple-600">
                Pregunta {currentQuestionIndex + 1}
              </span>
              <div className="flex items-center text-sm text-gray-600">
                <Star className="w-4 h-4 mr-1 text-yellow-500" />
                <span>{currentQuestion.points} puntos</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Opciones */}
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectOption(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedOption === index
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 bg-white'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                    selectedOption === index
                      ? 'border-purple-600 bg-purple-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedOption === index && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="font-medium text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Botón siguiente */}
          <button
            onClick={handleNextQuestion}
            disabled={selectedOption === null || isSubmitting}
            className={`w-full py-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              selectedOption === null || isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Enviando...
              </>
            ) : currentQuestionIndex < questions.length - 1 ? (
              <>
                Siguiente Pregunta
                <Play className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                Finalizar
                <Send className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
