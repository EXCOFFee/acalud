// ============================================================================
// 🧠 COMPONENTE DE JUEGO DE TRIVIA - ACALUD
// ============================================================================
/**
 * 🎯 PROPÓSITO:
 * Componente React para juegos de trivia educativa interactiva.
 * Maneja toda la lógica de presentación de preguntas, respuestas, feedback y progreso.
 * 
 * 🏗️ PRINCIPIOS SOLID APLICADOS:
 * - Single Responsibility: Solo maneja la interfaz de trivia
 * - Open/Closed: Extensible para nuevos tipos de preguntas
 * - Liskov Substitution: Implementa interfaz consistente de componentes
 * - Interface Segregation: Props específicas y bien definidas
 * - Dependency Inversion: Depende de servicios abstraídos
 * 
 * 🎓 PATRONES DE DISEÑO:
 * - State Management: Gestión robusta del estado del juego
 * - Component Composition: Composición modular de elementos UI
 * - Event Handling: Manejo consistente de eventos del usuario
 * - Error Boundary: Manejo elegante de errores
 * - Loading States: Estados de carga bien definidos
 */

// 📦 IMPORTACIONES NECESARIAS
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { gameService, GameServiceError, GameErrorType } from '../../services/games.service';
import {
  // Tipos específicos de trivia
  GameSession, GameResponse, GameStatus,
  
  // Enumeraciones
  QuestionType, DifficultyLevel,
  
  // Tipos de utilidad
  LoadingState
} from '../../types/games';

// ============================================================================
// 📝 INTERFACES Y TIPOS DEL COMPONENTE
// ============================================================================

/**
 * 🎮 Props del componente TriviaGame
 * Define todas las propiedades configurables del juego
 */
interface TriviaGameProps {
  /** 🆔 ID único del juego de trivia */
  readonly gameId: string;
  
  /** 🔢 Número de preguntas a mostrar (opcional, default: 10) */
  readonly questionCount?: number;
  
  /** 📊 Nivel de dificultad específico (opcional, se adapta automáticamente) */
  readonly difficulty?: DifficultyLevel;
  
  /** ⏱️ Tiempo límite por pregunta en segundos (opcional, default: 30) */
  readonly timeLimit?: number;
  
  /** 🔀 ¿Aleatorizar orden de preguntas? (opcional, default: true) */
  readonly randomizeQuestions?: boolean;
  
  /** 🔀 ¿Aleatorizar orden de respuestas? (opcional, default: true) */
  readonly randomizeAnswers?: boolean;
  
  /** ✅ ¿Mostrar respuesta correcta inmediatamente? (opcional, default: true) */
  readonly showImmediateFeedback?: boolean;
  
  /** 💡 ¿Permitir pistas? (opcional, default: true) */
  readonly allowHints?: boolean;
  
  /** 📊 Callback cuando el juego se completa */
  readonly onGameComplete?: (results: TriviaResults) => void;
  
  /** 🚪 Callback cuando el usuario quiere salir */
  readonly onGameExit?: () => void;
  
  /** 🎨 Tema visual personalizado (opcional) */
  readonly theme?: 'default' | 'dark' | 'colorful' | 'minimal';
  
  /** 📱 ¿Optimizado para móvil? (opcional, default: auto-detect) */
  readonly mobileOptimized?: boolean;
}

/**
 * 📊 Resultados finales de la trivia
 * Información completa del rendimiento del estudiante
 */
interface TriviaResults {
  /** 🏆 Puntuación final obtenida */
  readonly finalScore: number;
  
  /** 📈 Porcentaje de acierto (0-100) */
  readonly percentage: number;
  
  /** ✅ Número de respuestas correctas */
  readonly correctAnswers: number;
  
  /** 🔢 Total de preguntas respondidas */
  readonly totalQuestions: number;
  
  /** ⏱️ Tiempo total empleado en segundos */
  readonly timeSpent: number;
  
  /** 🏆 Logros desbloqueados durante el juego */
  readonly achievements: string[];
  
  /** 💬 Feedback personalizado basado en rendimiento */
  readonly feedback: string;
  
  /** 🎓 Nivel de dominio alcanzado */
  readonly masteryLevel: 'principiante' | 'intermedio' | 'avanzado' | 'experto';
  
  /** 💡 Recomendaciones para mejorar */
  readonly recommendations: string[];
}

/**
 * ❓ Estructura de una pregunta de trivia
 * Información completa de cada pregunta del juego
 */
interface TriviaQuestion {
  /** 🆔 Identificador único de la pregunta */
  readonly id: string;
  
  /** 🎯 Tipo de pregunta (múltiple, verdadero/falso, etc.) */
  readonly type: QuestionType;
  
  /** ❓ Enunciado de la pregunta */
  readonly question: string;
  
  /** 📋 Opciones de respuesta disponibles */
  readonly options: string[];
  
  /** ✅ Respuesta correcta */
  readonly correctAnswer: string | string[];
  
  /** 💡 Explicación educativa */
  readonly explanation: string;
  
  /** 📊 Nivel de dificultad */
  readonly difficulty: DifficultyLevel;
  
  /** 🏆 Puntos por respuesta correcta */
  readonly points: number;
  
  /** ⏱️ Tiempo límite específico */
  readonly timeLimit: number;
  
  /** 🏷️ Etiquetas temáticas */
  readonly tags: string[];
  
  /** 🖼️ Contenido multimedia opcional */
  readonly multimedia?: {
    images?: string[];
    audio?: string;
    video?: string;
  };
}

/**
 * 🎮 Estado interno del componente de trivia
 * Gestión completa del estado del juego
 */
interface TriviaState {
  /** 📊 Estado de carga general */
  loadingState: LoadingState;
  
  /** 🎯 Sesión de juego activa */
  session: GameSession | null;
  
  /** ❓ Pregunta actual siendo mostrada */
  currentQuestion: TriviaQuestion | null;
  
  /** 🔢 Índice de la pregunta actual (0-based) */
  currentQuestionIndex: number;
  
  /** 📝 Respuesta seleccionada por el usuario */
  selectedAnswer: string | string[] | null;
  
  /** ⏱️ Tiempo restante para la pregunta actual */
  timeRemaining: number;
  
  /** ▶️ ¿El temporizador está activo? */
  timerActive: boolean;
  
  /** ✅ ¿Se mostró feedback para la pregunta actual? */
  feedbackShown: boolean;
  
  /** 📊 Lista de todas las respuestas del usuario */
  userResponses: GameResponse[];
  
  /** 🏆 Puntuación acumulada */
  currentScore: number;
  
  /** 🔥 Racha actual de respuestas correctas */
  currentStreak: number;
  
  /** 💡 Número de pistas utilizadas */
  hintsUsed: number;
  
  /** 🚨 Error actual si existe */
  error: GameServiceError | null;
  
  /** ✅ ¿El juego está completado? */
  isCompleted: boolean;
  
  /** 📊 Resultados finales */
  results: TriviaResults | null;
}

/**
 * 🎨 Configuración de tema visual
 * Estilos personalizables para diferentes temas
 */
interface ThemeConfig {
  /** 🎨 Clases CSS para el contenedor principal */
  containerClasses: string;
  
  /** 🎨 Clases CSS para las tarjetas */
  cardClasses: string;
  
  /** 🎨 Clases CSS para botones primarios */
  primaryButtonClasses: string;
  
  /** 🎨 Clases CSS para botones secundarios */
  secondaryButtonClasses: string;
  
  /** 🎨 Clases CSS para texto */
  textClasses: string;
  
  /** 🎨 Clases CSS para elementos de progreso */
  progressClasses: string;
}

// ============================================================================
// 🎨 CONFIGURACIONES DE TEMA
// ============================================================================

/**
 * 🎨 Temas visuales predefinidos
 * Configuraciones de estilo para diferentes experiencias visuales
 */
const THEME_CONFIGS: Record<string, ThemeConfig> = {
  // 🌅 Tema por defecto - amigable y profesional
  default: {
    containerClasses: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100',
    cardClasses: 'bg-white rounded-xl shadow-lg border border-gray-200',
    primaryButtonClasses: 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105',
    secondaryButtonClasses: 'bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200',
    textClasses: 'text-gray-800',
    progressClasses: 'bg-indigo-600'
  },
  
  // 🌙 Tema oscuro - para ambientes con poca luz
  dark: {
    containerClasses: 'min-h-screen bg-gradient-to-br from-gray-900 to-black',
    cardClasses: 'bg-gray-800 rounded-xl shadow-lg border border-gray-700',
    primaryButtonClasses: 'bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105',
    secondaryButtonClasses: 'bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-3 px-6 rounded-lg transition-all duration-200',
    textClasses: 'text-gray-100',
    progressClasses: 'bg-purple-600'
  },
  
  // 🌈 Tema colorido - divertido y estimulante
  colorful: {
    containerClasses: 'min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200',
    cardClasses: 'bg-white rounded-xl shadow-lg border-2 border-purple-300',
    primaryButtonClasses: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105',
    secondaryButtonClasses: 'bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200',
    textClasses: 'text-gray-800',
    progressClasses: 'bg-gradient-to-r from-purple-500 to-pink-500'
  },
  
  // ⚪ Tema minimalista - limpio y sin distracciones
  minimal: {
    containerClasses: 'min-h-screen bg-gray-50',
    cardClasses: 'bg-white rounded-lg shadow-sm border border-gray-100',
    primaryButtonClasses: 'bg-black hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-md transition-all duration-150',
    secondaryButtonClasses: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-md transition-all duration-150',
    textClasses: 'text-gray-900',
    progressClasses: 'bg-black'
  }
};

// ============================================================================
// 🎮 COMPONENTE PRINCIPAL DE TRIVIA
// ============================================================================

/**
 * 🧠 Componente principal del juego de trivia
 * Implementa toda la lógica de juego siguiendo principios SOLID
 */
export const TriviaGameComponent: React.FC<TriviaGameProps> = ({
  gameId,
  questionCount = 10,
  difficulty,
  timeLimit = 30,
  randomizeQuestions: _randomizeQuestions = true, // TODO: Implementar aleatorización de preguntas
  randomizeAnswers: _randomizeAnswers = true, // TODO: Implementar aleatorización de respuestas
  showImmediateFeedback = true,
  allowHints = true,
  onGameComplete,
  onGameExit,
  theme = 'default',
  mobileOptimized: _mobileOptimized = true // TODO: Implementar optimizaciones específicas móvil
}) => {
  
  // 🔐 Obtener información del usuario autenticado
  const { user } = useAuth();
  
  // 📊 Estado principal del componente
  const [state, setState] = useState<TriviaState>({
    loadingState: 'idle',
    session: null,
    currentQuestion: null,
    currentQuestionIndex: 0,
    selectedAnswer: null,
    timeRemaining: timeLimit,
    timerActive: false,
    feedbackShown: false,
    userResponses: [],
    currentScore: 0,
    currentStreak: 0,
    hintsUsed: 0,
    error: null,
    isCompleted: false,
    results: null
  });
  
  // ⏱️ Referencia para el temporizador
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🎨 Configuración de tema memoizada
  const themeConfig = useMemo(() => THEME_CONFIGS[theme] || THEME_CONFIGS.default, [theme]);
  
  // 📱 Detección de dispositivo móvil
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);
  
  // ============================================================================
  // 🔄 EFECTOS Y CICLO DE VIDA
  // ============================================================================
  
  /**
   * 🎬 Efecto de inicialización del juego
   * Se ejecuta una sola vez al montar el componente
   */
  useEffect(() => {
    initializeGame();
    
    // 🧹 Cleanup al desmontar
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameId]);
  
  /**
   * ⏱️ Efecto del temporizador
   * Maneja la cuenta regresiva de cada pregunta
   */
  useEffect(() => {
    if (state.timerActive && state.timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setState(prevState => {
          const newTime = prevState.timeRemaining - 1;
          
          // ⏰ Si se acaba el tiempo, auto-enviar respuesta
          if (newTime <= 0) {
            handleTimeOut();
            return {
              ...prevState,
              timeRemaining: 0,
              timerActive: false
            };
          }
          
          return {
            ...prevState,
            timeRemaining: newTime
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.timerActive, state.timeRemaining]);
  
  // ============================================================================
  // 🎮 FUNCIONES PRINCIPALES DEL JUEGO
  // ============================================================================
  
  /**
   * 🚀 Inicializar el juego de trivia
   * Configura la sesión y carga la primera pregunta
   */
  const initializeGame = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loadingState: 'loading' }));
      
      // 🎯 Iniciar sesión de trivia en el backend
      const triviaSession = await gameService.startTriviaSession(
        gameId,
        questionCount,
        difficulty
      );
      
      // 📊 Actualizar estado con la sesión iniciada
      setState(prev => ({
        ...prev,
        loadingState: 'success',
        session: {
          id: triviaSession.sessionId,
          gameId,
          playerId: user?.id || 'anonymous',
          status: GameStatus.IN_PROGRESS,
          startedAt: new Date(),
          currentProgress: {
            currentStep: 0,
            totalSteps: triviaSession.totalQuestions,
            percentage: 0,
            checkpoints: [],
            achievements: []
          },
          responses: [],
          score: 0,
          timeSpent: 0,
          hintsUsed: 0,
          metadata: {
            deviceType: isMobile ? 'mobile' : 'desktop',
            browserInfo: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            connectionQuality: 'good',
            interruptions: 0,
            pauseDuration: 0
          }
        },
        currentQuestion: triviaSession.firstQuestion,
        timeRemaining: triviaSession.timePerQuestion || timeLimit,
        timerActive: true
      }));
      
    } catch (error) {
      // 🚨 Manejar errores de inicialización
      const gameError = error instanceof GameServiceError ? error : 
        new GameServiceError(GameErrorType.UNKNOWN_ERROR, 'Error al inicializar el juego');
      
      setState(prev => ({
        ...prev,
        loadingState: 'error',
        error: gameError
      }));
    }
  }, [gameId, questionCount, difficulty, timeLimit, user?.id, isMobile]);
  
  /**
   * 📝 Manejar selección de respuesta
   * Procesa la elección del estudiante
   */
  const handleAnswerSelection = useCallback((answer: string) => {
    // 🚫 No permitir cambios si ya se mostró feedback
    if (state.feedbackShown) return;
    
    setState(prev => ({
      ...prev,
      selectedAnswer: answer,
      timerActive: false // Pausar temporizador al seleccionar
    }));
  }, [state.feedbackShown]);
  
  /**
   * ✅ Confirmar y enviar respuesta
   * Envía la respuesta al backend y procesa el resultado
   */
  const handleAnswerSubmit = useCallback(async () => {
    if (!state.selectedAnswer || !state.currentQuestion || !state.session) return;
    
    try {
      // ⏱️ Calcular tiempo empleado
      const timeSpent = timeLimit - state.timeRemaining;
      
      // 🌐 Enviar respuesta al backend
      const result = await gameService.answerTriviaQuestion(
        state.session.id,
        state.currentQuestion.id,
        state.selectedAnswer,
        timeSpent
      );
      
      // 📊 Crear registro de respuesta
      const response: GameResponse = {
        questionId: state.currentQuestion.id,
        userAnswer: state.selectedAnswer,
        correctAnswer: result.correctAnswer,
        isCorrect: result.isCorrect,
        timeSpent,
        pointsEarned: result.pointsEarned,
        hintsUsed: 0, // TODO: implementar sistema de pistas
        timestamp: new Date(),
        explanation: result.explanation
      };
      
      // 🔄 Actualizar estado con resultado
      setState(prev => ({
        ...prev,
        userResponses: [...prev.userResponses, response],
        currentScore: prev.currentScore + result.pointsEarned,
        currentStreak: result.isCorrect ? prev.currentStreak + 1 : 0,
        feedbackShown: true
      }));
      
      // ⏭️ Verificar si hay más preguntas
      if (result.isCompleted) {
        await completeGame();
      } else if (showImmediateFeedback) {
        // ⏱️ Mostrar feedback y continuar después de 3 segundos
        setTimeout(() => {
          loadNextQuestion(result.nextQuestion);
        }, 3000);
      }
      
    } catch (error) {
      // 🚨 Manejar errores al enviar respuesta
      const gameError = error instanceof GameServiceError ? error : 
        new GameServiceError(GameErrorType.INVALID_RESPONSE, 'Error al enviar respuesta');
      
      setState(prev => ({ ...prev, error: gameError }));
    }
  }, [state.selectedAnswer, state.currentQuestion, state.session, state.timeRemaining, timeLimit, showImmediateFeedback]);
  
  /**
   * ⏭️ Cargar siguiente pregunta
   * Prepara la interfaz para la próxima pregunta
   */
  const loadNextQuestion = useCallback((nextQuestion: TriviaQuestion) => {
    setState(prev => ({
      ...prev,
      currentQuestion: nextQuestion,
      currentQuestionIndex: prev.currentQuestionIndex + 1,
      selectedAnswer: null,
      timeRemaining: nextQuestion.timeLimit || timeLimit,
      timerActive: true,
      feedbackShown: false
    }));
  }, [timeLimit]);
  
  /**
   * ⏰ Manejar tiempo agotado
   * Procesa automáticamente cuando se acaba el tiempo
   */
  const handleTimeOut = useCallback(async () => {
    if (!state.currentQuestion || !state.session) return;
    
    try {
      // 📝 Enviar respuesta vacía por tiempo agotado
      const result = await gameService.answerTriviaQuestion(
        state.session.id,
        state.currentQuestion.id,
        '', // Respuesta vacía
        timeLimit
      );
      
      // 📊 Registrar respuesta por tiempo agotado
      const response: GameResponse = {
        questionId: state.currentQuestion.id,
        userAnswer: '',
        correctAnswer: result.correctAnswer,
        isCorrect: false,
        timeSpent: timeLimit,
        pointsEarned: 0,
        hintsUsed: 0,
        timestamp: new Date(),
        explanation: 'Tiempo agotado'
      };
      
      // 🔄 Actualizar estado
      setState(prev => ({
        ...prev,
        userResponses: [...prev.userResponses, response],
        currentStreak: 0,
        feedbackShown: true
      }));
      
      // ⏭️ Continuar con siguiente pregunta o completar
      if (result.isCompleted) {
        await completeGame();
      } else {
        setTimeout(() => {
          loadNextQuestion(result.nextQuestion);
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error al procesar tiempo agotado:', error);
    }
  }, [state.currentQuestion, state.session, timeLimit, loadNextQuestion]);
  
  /**
   * ✅ Completar el juego
   * Finaliza la sesión y calcula resultados
   */
  const completeGame = useCallback(async () => {
    if (!state.session) return;
    
    try {
      // 🌐 Obtener resultados finales del backend
      const finalResults = await gameService.getTriviaResults(state.session.id);
      
      // 📊 Crear objeto de resultados
      const results: TriviaResults = {
        finalScore: finalResults.totalScore,
        percentage: finalResults.percentage,
        correctAnswers: finalResults.correctAnswers,
        totalQuestions: finalResults.totalQuestions,
        timeSpent: finalResults.timeSpent,
        achievements: finalResults.achievements,
        feedback: finalResults.feedback,
        masteryLevel: calculateMasteryLevel(finalResults.percentage),
        recommendations: generateRecommendations(finalResults.percentage, state.userResponses)
      };
      
      // 🔄 Actualizar estado final
      setState(prev => ({
        ...prev,
        isCompleted: true,
        results
      }));
      
      // 📞 Llamar callback si existe
      if (onGameComplete) {
        onGameComplete(results);
      }
      
    } catch (error) {
      console.error('Error al completar el juego:', error);
    }
  }, [state.session, state.userResponses, onGameComplete]);
  
  /**
   * 💡 Solicitar pista
   * Obtiene ayuda adicional para la pregunta actual
   */
  const handleHintRequest = useCallback(async () => {
    if (!allowHints || !state.currentQuestion || !state.session) return;
    
    try {
      // TODO: Implementar solicitud de pista al backend
      // const hint = await gameService.getQuestionHint(state.session.id, state.currentQuestion.id);
      
      setState(prev => ({
        ...prev,
        hintsUsed: prev.hintsUsed + 1
      }));
      
    } catch (error) {
      console.error('Error al solicitar pista:', error);
    }
  }, [allowHints, state.currentQuestion, state.session]);
  
  /**
   * 🚪 Manejar salida del juego
   * Confirma y procesa la salida del estudiante
   */
  const handleGameExit = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres salir? Tu progreso se perderá.')) {
      if (onGameExit) {
        onGameExit();
      }
    }
  }, [onGameExit]);
  
  // ============================================================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================================================
  
  /**
   * 🎓 Calcular nivel de dominio
   * Determina el nivel alcanzado basado en el porcentaje
   */
  const calculateMasteryLevel = (percentage: number): TriviaResults['masteryLevel'] => {
    if (percentage >= 90) return 'experto';
    if (percentage >= 75) return 'avanzado';
    if (percentage >= 60) return 'intermedio';
    return 'principiante';
  };
  
  /**
   * 💡 Generar recomendaciones
   * Crea sugerencias personalizadas basadas en el rendimiento
   */
  const generateRecommendations = (percentage: number, _responses: GameResponse[]): string[] => {
    const recommendations: string[] = [];
    
    if (percentage < 60) {
      recommendations.push('Repasa los conceptos básicos del tema');
      recommendations.push('Practica con ejercicios adicionales');
    } else if (percentage < 80) {
      recommendations.push('Continúa practicando para dominar completamente el tema');
      recommendations.push('Enfócate en las áreas donde tuviste dificultades');
    } else {
      recommendations.push('¡Excelente trabajo! Estás listo para temas más avanzados');
      recommendations.push('Considera ayudar a otros estudiantes');
    }
    
    return recommendations;
  };
  
  /**
   * 📊 Calcular progreso
   * Determina el porcentaje de progreso actual
   */
  const calculateProgress = (): number => {
    if (questionCount === 0) return 0;
    return Math.round((state.currentQuestionIndex / questionCount) * 100);
  };
  
  // ============================================================================
  // 🎨 RENDERIZADO CONDICIONAL
  // ============================================================================
  
  /**
   * ⏳ Renderizar estado de carga
   */
  if (state.loadingState === 'loading') {
    return (
      <div className={`${themeConfig.containerClasses} flex items-center justify-center p-4`}>
        <div className={`${themeConfig.cardClasses} p-8 text-center max-w-md w-full`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className={`text-xl font-semibold ${themeConfig.textClasses} mb-2`}>
            Preparando tu trivia...
          </h2>
          <p className={`${themeConfig.textClasses} opacity-70`}>
            Estamos configurando las preguntas perfectas para ti
          </p>
        </div>
      </div>
    );
  }
  
  /**
   * 🚨 Renderizar estado de error
   */
  if (state.loadingState === 'error' || state.error) {
    return (
      <div className={`${themeConfig.containerClasses} flex items-center justify-center p-4`}>
        <div className={`${themeConfig.cardClasses} p-8 text-center max-w-md w-full`}>
          <div className="text-red-500 text-5xl mb-4">😞</div>
          <h2 className={`text-xl font-semibold ${themeConfig.textClasses} mb-2`}>
            ¡Ups! Algo salió mal
          </h2>
          <p className={`${themeConfig.textClasses} opacity-70 mb-6`}>
            {state.error?.message || 'Error al cargar el juego'}
          </p>
          <div className="space-y-3">
            <button
              onClick={initializeGame}
              className={themeConfig.primaryButtonClasses}
            >
              🔄 Intentar de nuevo
            </button>
            <button
              onClick={handleGameExit}
              className={themeConfig.secondaryButtonClasses}
            >
              🚪 Salir
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  /**
   * 🏆 Renderizar resultados finales
   */
  if (state.isCompleted && state.results) {
    return (
      <div className={`${themeConfig.containerClasses} flex items-center justify-center p-4`}>
        <div className={`${themeConfig.cardClasses} p-8 text-center max-w-2xl w-full`}>
          {/* 🎉 Celebración */}
          <div className="text-6xl mb-4">
            {state.results.percentage >= 80 ? '🎉' : state.results.percentage >= 60 ? '👏' : '💪'}
          </div>
          
          {/* 📊 Puntuación principal */}
          <h2 className={`text-3xl font-bold ${themeConfig.textClasses} mb-2`}>
            ¡Trivia Completada!
          </h2>
          <div className={`text-5xl font-bold mb-4 ${state.results.percentage >= 80 ? 'text-green-500' : state.results.percentage >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
            {state.results.percentage}%
          </div>
          
          {/* 📈 Estadísticas detalladas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`${themeConfig.cardClasses} p-4`}>
              <div className={`text-2xl font-bold ${themeConfig.textClasses}`}>
                {state.results.correctAnswers}
              </div>
              <div className={`text-sm ${themeConfig.textClasses} opacity-70`}>
                Correctas
              </div>
            </div>
            <div className={`${themeConfig.cardClasses} p-4`}>
              <div className={`text-2xl font-bold ${themeConfig.textClasses}`}>
                {state.results.totalQuestions}
              </div>
              <div className={`text-sm ${themeConfig.textClasses} opacity-70`}>
                Total
              </div>
            </div>
            <div className={`${themeConfig.cardClasses} p-4`}>
              <div className={`text-2xl font-bold ${themeConfig.textClasses}`}>
                {Math.round(state.results.timeSpent / 60)}m
              </div>
              <div className={`text-sm ${themeConfig.textClasses} opacity-70`}>
                Tiempo
              </div>
            </div>
            <div className={`${themeConfig.cardClasses} p-4`}>
              <div className={`text-2xl font-bold ${themeConfig.textClasses}`}>
                {state.results.finalScore}
              </div>
              <div className={`text-sm ${themeConfig.textClasses} opacity-70`}>
                Puntos
              </div>
            </div>
          </div>
          
          {/* 🎓 Nivel de dominio */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold ${themeConfig.textClasses} mb-2`}>
              Nivel alcanzado
            </h3>
            <div className={`inline-block px-4 py-2 rounded-full text-white font-semibold ${
              state.results.masteryLevel === 'experto' ? 'bg-purple-500' :
              state.results.masteryLevel === 'avanzado' ? 'bg-green-500' :
              state.results.masteryLevel === 'intermedio' ? 'bg-yellow-500' : 'bg-blue-500'
            }`}>
              {state.results.masteryLevel.charAt(0).toUpperCase() + state.results.masteryLevel.slice(1)}
            </div>
          </div>
          
          {/* 💬 Feedback personalizado */}
          <div className="mb-6">
            <p className={`${themeConfig.textClasses} text-lg`}>
              {state.results.feedback}
            </p>
          </div>
          
          {/* 🏆 Logros desbloqueados */}
          {state.results.achievements.length > 0 && (
            <div className="mb-6">
              <h3 className={`text-lg font-semibold ${themeConfig.textClasses} mb-2`}>
                🏆 Logros desbloqueados
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {state.results.achievements.map((achievement, index) => (
                  <span key={index} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                    {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 💡 Recomendaciones */}
          {state.results.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className={`text-lg font-semibold ${themeConfig.textClasses} mb-2`}>
                💡 Recomendaciones
              </h3>
              <ul className={`text-left ${themeConfig.textClasses} space-y-1`}>
                {state.results.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 🎮 Acciones finales */}
          <div className="space-y-3">
            <button
              onClick={initializeGame}
              className={themeConfig.primaryButtonClasses}
            >
              🔄 Jugar de nuevo
            </button>
            <button
              onClick={handleGameExit}
              className={themeConfig.secondaryButtonClasses}
            >
              🏠 Regresar al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  /**
   * 🎮 Renderizar juego principal
   */
  return (
    <div className={`${themeConfig.containerClasses} min-h-screen p-4`}>
      <div className="max-w-4xl mx-auto">
        
        {/* 📊 Barra de progreso superior */}
        <div className={`${themeConfig.cardClasses} p-4 mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm font-medium ${themeConfig.textClasses}`}>
              Pregunta {state.currentQuestionIndex + 1} de {questionCount}
            </div>
            <div className={`text-sm font-medium ${themeConfig.textClasses}`}>
              Puntuación: {state.currentScore}
            </div>
            <button
              onClick={handleGameExit}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ❌
            </button>
          </div>
          
          {/* Barra de progreso visual */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${themeConfig.progressClasses} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
        </div>
        
        {/* ⏱️ Temporizador */}
        {state.timerActive && (
          <div className={`${themeConfig.cardClasses} p-4 mb-6 text-center`}>
            <div className={`text-2xl font-bold ${
              state.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : themeConfig.textClasses
            }`}>
              ⏱️ {state.timeRemaining}s
            </div>
            <div className={`text-sm ${themeConfig.textClasses} opacity-70`}>
              Tiempo restante
            </div>
          </div>
        )}
        
        {/* ❓ Pregunta actual */}
        {state.currentQuestion && (
          <div className={`${themeConfig.cardClasses} p-6 mb-6`}>
            
            {/* 📝 Enunciado de la pregunta */}
            <div className="mb-6">
              <h2 className={`text-xl md:text-2xl font-semibold ${themeConfig.textClasses} mb-4`}>
                {state.currentQuestion.question}
              </h2>
              
              {/* 🖼️ Contenido multimedia si existe */}
              {state.currentQuestion.multimedia?.images && (
                <div className="flex flex-wrap gap-4 mb-4">
                  {state.currentQuestion.multimedia.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Imagen ${index + 1} de la pregunta`}
                      className="max-w-xs rounded-lg shadow-md"
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* 📋 Opciones de respuesta */}
            <div className="space-y-3">
              {state.currentQuestion.options.map((option, index) => {
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = state.selectedAnswer === option;
                const isCorrect = state.feedbackShown && state.currentQuestion!.correctAnswer === option;
                const isIncorrect = state.feedbackShown && isSelected && !isCorrect;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelection(option)}
                    disabled={state.feedbackShown}
                    className={`
                      w-full p-4 text-left rounded-lg border-2 transition-all duration-200 
                      ${isSelected && !state.feedbackShown ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'}
                      ${isCorrect ? 'border-green-500 bg-green-50' : ''}
                      ${isIncorrect ? 'border-red-500 bg-red-50' : ''}
                      ${state.feedbackShown ? 'cursor-not-allowed' : 'cursor-pointer'}
                      ${isMobile ? 'text-base' : 'text-lg'}
                    `}
                  >
                    <div className="flex items-center">
                      <span className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-semibold mr-4
                        ${isSelected && !state.feedbackShown ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}
                        ${isCorrect ? 'bg-green-500 text-white' : ''}
                        ${isIncorrect ? 'bg-red-500 text-white' : ''}
                      `}>
                        {optionLetter}
                      </span>
                      <span className={themeConfig.textClasses}>
                        {option}
                      </span>
                      {/* ✅ Iconos de feedback */}
                      {state.feedbackShown && isCorrect && (
                        <span className="ml-auto text-green-500 text-xl">✅</span>
                      )}
                      {state.feedbackShown && isIncorrect && (
                        <span className="ml-auto text-red-500 text-xl">❌</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* 💡 Explicación después de responder */}
            {state.feedbackShown && state.userResponses.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">💡 Explicación</h3>
                <p className="text-blue-700">
                  {state.userResponses[state.userResponses.length - 1].explanation}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* 🎮 Controles del juego */}
        <div className={`${themeConfig.cardClasses} p-4`}>
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
            
            {/* 💡 Botón de pista */}
            {allowHints && state.currentQuestion && !state.feedbackShown && (
              <button
                onClick={handleHintRequest}
                className={`${themeConfig.secondaryButtonClasses} ${isMobile ? 'w-full' : ''}`}
                disabled={state.hintsUsed >= 3}
              >
                💡 Pista ({3 - state.hintsUsed} restantes)
              </button>
            )}
            
            {/* ✅ Botón de confirmar respuesta */}
            {state.selectedAnswer && !state.feedbackShown && (
              <button
                onClick={handleAnswerSubmit}
                className={`${themeConfig.primaryButtonClasses} ${isMobile ? 'w-full' : ''}`}
              >
                ✅ Confirmar respuesta
              </button>
            )}
            
            {/* ⏭️ Información de progreso */}
            {!state.feedbackShown && (
              <div className={`text-sm ${themeConfig.textClasses} opacity-70 text-center`}>
                {state.selectedAnswer ? 'Confirma tu respuesta para continuar' : 'Selecciona una respuesta'}
              </div>
            )}
          </div>
          
          {/* 🔥 Indicador de racha */}
          {state.currentStreak > 0 && (
            <div className="mt-3 text-center">
              <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                🔥 Racha: {state.currentStreak} {state.currentStreak === 1 ? 'acierto' : 'aciertos'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 📚 DOCUMENTACIÓN Y EXPORT
// ============================================================================

/**
 * 📚 RESUMEN DEL COMPONENTE:
 * 
 * 🎯 CARACTERÍSTICAS PRINCIPALES:
 * - Interfaz completamente responsive (móvil y desktop)
 * - Temporizador con cuenta regresiva visual
 * - Feedback inmediato con explicaciones educativas
 * - Sistema de puntuación y rachas
 * - Múltiples temas visuales personalizables
 * - Manejo robusto de errores
 * - Optimización de rendimiento con memoización
 * - Accesibilidad y usabilidad mejorada
 * 
 * 🎓 PRINCIPIOS SOLID IMPLEMENTADOS:
 * - Single Responsibility: Cada función tiene una responsabilidad específica
 * - Open/Closed: Extensible para nuevos tipos de preguntas y temas
 * - Liskov Substitution: Interfaces consistentes y predecibles
 * - Interface Segregation: Props específicas y bien definidas
 * - Dependency Inversion: Depende de servicios abstraídos
 * 
 * 💡 CARACTERÍSTICAS EDUCATIVAS:
 * - Feedback constructivo inmediato
 * - Explicaciones detalladas para cada respuesta
 * - Sistema de recomendaciones personalizado
 * - Tracking de progreso y rendimiento
 * - Niveles de dominio motivacionales
 * - Logros y gamificación educativa
 * 
 * 🔧 USO RECOMENDADO:
 * ```tsx
 * <TriviaGame
 *   gameId="matematicas-5to-grado"
 *   questionCount={15}
 *   difficulty={DifficultyLevel.INTERMEDIATE}
 *   theme="colorful"
 *   onGameComplete={(results) => console.log('Completado:', results)}
 *   onGameExit={() => navigate('/dashboard')}
 * />
 * ```
 */

// Export del componente como TriviaGame para compatibilidad
export const TriviaGame = TriviaGameComponent;
export default TriviaGame;