// ============================================================================
// 🎮 SERVICIO DE JUEGOS EDUCATIVOS - ACALUD
// ============================================================================
/**
 * 🎯 PROPÓSITO:
 * Servicio frontend que gestiona toda la comunicación con el backend para juegos educativos.
 * Implementa el patrón Service Layer siguiendo los principios SOLID.
 * 
 * 🏗️ PRINCIPIOS SOLID APLICADOS:
 * - Single Responsibility: Solo maneja operaciones de juegos
 * - Open/Closed: Extensible para nuevos tipos de juegos
 * - Liskov Substitution: Implementa interfaces consistentes
 * - Interface Segregation: Interfaces específicas por tipo de juego
 * - Dependency Inversion: Depende de abstracciones HTTP, no implementaciones
 * 
 * 🎓 PATRONES DE DISEÑO:
 * - Service Layer: Encapsula lógica de negocio
 * - Repository Pattern: Abstrae acceso a datos
 * - Error Handling Chain: Manejo consistente de errores
 * - Caching Strategy: Cache inteligente de datos frecuentes
 */

// 📦 IMPORTACIONES NECESARIAS
import { httpClient, HttpError } from './http.service';
import {
  // Tipos base de juegos
  BaseGame, AnyGame,
  
  // Enumeraciones principales
  Subject, DifficultyLevel, GameStatus,
  
  // Interfaces de sesión y progreso
  GameSession, GameProgress, GameResponse,
  
  // Interfaces de configuración
  GameConfiguration, GameFilterOptions, SortOptions, PaginationOptions,
  
  // Interfaces de análisis y reportes
  GameStatistics, StudentPerformanceReport, Recommendation,
  
  // Tipos de utilidad
  OperationResult, PaginatedResponse,
  TriviaSessionStart,
  TriviaAnswerResult,
  CrosswordGameData,
  GeneratedCrossword,
  CrosswordGridInput,
  CrosswordClueInput,
  SimulationStartState,
  SimulationActionResult,
  SimulationInteractionResult,
  SubmitGameResponseResult,
  FinishGameSessionResult
} from '../types/games';

// ============================================================================
// 🔧 INTERFACES DE SERVICIO (CONTRATOS)
// ============================================================================

/**
 * 🎮 Interfaz principal del servicio de juegos
 * Define todos los métodos disponibles para gestionar juegos educativos
 * Implementa el principio de Interface Segregation (SOLID)
 */
export interface IGameService {
  // ===== GESTIÓN BÁSICA DE JUEGOS =====
  /**
   * 🔍 Obtener lista de juegos con filtros y paginación
   * @param filters - Filtros de búsqueda opcionales
   * @param sort - Opciones de ordenamiento
   * @param pagination - Configuración de paginación
   * @returns Lista paginada de juegos
   */
  getGames(
    filters?: GameFilterOptions,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AnyGame>>;

  /**
   * 🎮 Obtener detalles específicos de un juego
   * @param gameId - Identificador único del juego
   * @returns Información completa del juego
   */
  getGameById(gameId: string): Promise<AnyGame>;

  /**
   * ✨ Crear un nuevo juego educativo
   * @param gameData - Datos del juego a crear
   * @returns Juego creado con ID asignado
   */
  createGame(gameData: Partial<BaseGame>): Promise<AnyGame>;

  /**
   * 📝 Actualizar un juego existente
   * @param gameId - ID del juego a actualizar
   * @param updates - Datos a actualizar
   * @returns Juego actualizado
   */
  updateGame(gameId: string, updates: Partial<BaseGame>): Promise<AnyGame>;

  /**
   * 🗑️ Eliminar un juego (soft delete)
   * @param gameId - ID del juego a eliminar
   * @returns Confirmación de eliminación
   */
  deleteGame(gameId: string): Promise<OperationResult<void>>;

  // ===== GESTIÓN DE SESIONES DE JUEGO =====
  /**
   * ▶️ Iniciar una nueva sesión de juego
   * @param gameId - ID del juego a iniciar
   * @param configuration - Configuración opcional del juego
   * @returns Sesión de juego iniciada
   */
  startGameSession(gameId: string, configuration?: GameConfiguration): Promise<GameSession>;

  /**
   * 💾 Guardar progreso de sesión actual
   * @param sessionId - ID de la sesión
   * @param progress - Datos de progreso a guardar
   * @returns Confirmación de guardado
   */
  saveGameProgress(sessionId: string, progress: Partial<GameProgress>): Promise<OperationResult<void>>;

  /**
   * 📝 Registrar respuesta del estudiante
   * @param sessionId - ID de la sesión
   * @param response - Respuesta del estudiante
   * @returns Resultado de la respuesta y feedback
   */
  submitGameResponse(sessionId: string, response: Partial<GameResponse>): Promise<OperationResult<{
    isCorrect: boolean;
    feedback: string;
    pointsEarned: number;
    nextStep?: string;
  }>>;

  /**
   * ✅ Finalizar sesión de juego
   * @param sessionId - ID de la sesión a finalizar
   * @returns Resultados finales y estadísticas
   */
  finishGameSession(sessionId: string): Promise<OperationResult<{
    finalScore: number;
    achievements: string[];
    recommendations: Recommendation[];
    certificate?: string;
  }>>;

  /**
   * 📊 Obtener estado actual de una sesión
   * @param sessionId - ID de la sesión
   * @returns Estado completo de la sesión
   */
  getGameSession(sessionId: string): Promise<GameSession>;

  // ===== ANÁLISIS Y REPORTES =====
  /**
   * 📈 Obtener estadísticas de un juego específico
   * @param gameId - ID del juego
   * @returns Estadísticas completas del juego
   */
  getGameStatistics(gameId: string): Promise<GameStatistics>;

  /**
   * 🎓 Obtener reporte de rendimiento del estudiante
   * @param studentId - ID del estudiante
   * @param period - Período del reporte
   * @returns Reporte completo de rendimiento
   */
  getStudentPerformanceReport(studentId: string, period?: { start: Date; end: Date }): Promise<StudentPerformanceReport>;

  /**
   * 💡 Obtener recomendaciones personalizadas
   * @param studentId - ID del estudiante
   * @param subject - Materia específica (opcional)
   * @returns Lista de recomendaciones personalizadas
   */
  getPersonalizedRecommendations(studentId: string, subject?: Subject): Promise<Recommendation[]>;
}

/**
 * 🧠 Interfaz específica para servicios de trivia
 * Métodos especializados para juegos de preguntas y respuestas
 */
export interface ITriviaService {
  /**
   * ▶️ Iniciar sesión de trivia con configuración específica
   * @param gameId - ID del juego de trivia
   * @param questionCount - Número de preguntas (opcional)
   * @param difficulty - Nivel de dificultad (opcional)
   * @returns Sesión de trivia iniciada
   */
  startTriviaSession(
    gameId: string,
    questionCount?: number,
    difficulty?: DifficultyLevel
  ): Promise<TriviaSessionStart>;

  /**
   * 📝 Responder pregunta de trivia
   * @param sessionId - ID de la sesión
   * @param questionId - ID de la pregunta
   * @param answer - Respuesta del estudiante
   * @param timeSpent - Tiempo empleado en segundos
   * @returns Resultado inmediato y siguiente pregunta
   */
  answerTriviaQuestion(
    sessionId: string,
    questionId: string,
    answer: string | string[],
    timeSpent: number
  ): Promise<TriviaAnswerResult>;

  /**
   * 📊 Obtener resultados finales de trivia
   * @param sessionId - ID de la sesión completada
   * @returns Resultados detallados de la trivia
   */
  getTriviaResults(sessionId: string): Promise<{
    totalScore: number;
    percentage: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    achievements: string[];
    feedback: string;
  }>;
}

/**
 * 🔤 Interfaz específica para servicios de crucigrama
 * Métodos especializados para crucigramas educativos
 */
export interface ICrosswordService {
  /**
   * 🎯 Generar crucigrama automáticamente
   * @param gameId - ID del juego de crucigrama
   * @param words - Palabras para incluir (opcional)
   * @param gridSize - Tamaño de la grilla (opcional)
   * @returns Crucigrama generado listo para jugar
   */
  generateCrossword(gameId: string, words?: string[], gridSize?: number): Promise<GeneratedCrossword>;

  /**
   * ✅ Validar palabra ingresada en crucigrama
   * @param sessionId - ID de la sesión
   * @param wordId - ID de la palabra
   * @param userInput - Entrada del usuario
   * @returns Validación y feedback
   */
  validateCrosswordWord(sessionId: string, wordId: string, userInput: string): Promise<{
    isCorrect: boolean;
    feedback: string;
    hintsAvailable: boolean;
    progressPercentage: number;
  }>;

  /**
   * 💡 Solicitar pista para crucigrama
   * @param sessionId - ID de la sesión
   * @param wordId - ID de la palabra
   * @param hintLevel - Nivel de pista (1-3)
   * @returns Pista y penalización aplicada
   */
  getCrosswordHint(sessionId: string, wordId: string, hintLevel: number): Promise<{
    hint: string;
    penaltyApplied: number;
    remainingHints: number;
  }>;
}

/**
 * 🎭 Interfaz específica para servicios de simulación
 * Métodos especializados para simulaciones educativas inmersivas
 */
export interface ISimulationService {
  /**
   * 🎬 Iniciar simulación educativa
   * @param gameId - ID del juego de simulación
   * @returns Estado inicial de la simulación
   */
  startSimulation(gameId: string): Promise<SimulationStartState>;

  /**
   * 🎯 Ejecutar acción en simulación
   * @param sessionId - ID de la sesión
   * @param actionId - ID de la acción elegida
   * @returns Consecuencias y nueva escena
   */
  executeSimulationAction(sessionId: string, actionId: string): Promise<SimulationActionResult>;

  /**
   * 💬 Interactuar con personaje
   * @param sessionId - ID de la sesión
   * @param characterId - ID del personaje
   * @param dialogueOption - Opción de diálogo elegida
   * @returns Respuesta del personaje y consecuencias
   */
  interactWithCharacter(
    sessionId: string,
    characterId: string,
    dialogueOption: string
  ): Promise<SimulationInteractionResult>;
}

// ============================================================================
// 🔄 CLASES DE ERROR ESPECÍFICAS
// ============================================================================

/**
 * 🚨 Error específico de juegos educativos
 * Manejo especializado de errores del dominio de juegos
 */
export class GameServiceError extends Error {
  public readonly type: GameErrorType;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(type: GameErrorType, message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'GameServiceError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * 🔄 Crear error desde respuesta HTTP
   * @param httpError - Error HTTP recibido
   * @returns Error específico de juegos
   */
  static fromHttpError(httpError: HttpError): GameServiceError {
    const errorType = GameServiceError.mapHttpStatusToGameError(httpError.statusCode);
    return new GameServiceError(
      errorType,
      httpError.message,
      httpError.statusCode,
      httpError
    );
  }

  /**
   * 🗺️ Mapear código HTTP a tipo de error de juegos
   * @param statusCode - Código de estado HTTP
   * @returns Tipo de error específico
   */
  private static mapHttpStatusToGameError(statusCode: number): GameErrorType {
    switch (statusCode) {
      case 404: return GameErrorType.GAME_NOT_FOUND;
      case 400: return GameErrorType.INVALID_GAME_DATA;
      case 403: return GameErrorType.GAME_ACCESS_DENIED;
      case 409: return GameErrorType.SESSION_CONFLICT;
      case 422: return GameErrorType.INVALID_RESPONSE;
      case 500: return GameErrorType.GAME_SERVER_ERROR;
      default: return GameErrorType.UNKNOWN_ERROR;
    }
  }
}

/**
 * 🏷️ Tipos de errores específicos de juegos
 * Clasificación detallada para manejo específico
 */
export enum GameErrorType {
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',           // 🔍 Juego no encontrado
  INVALID_GAME_DATA = 'INVALID_GAME_DATA',     // 📋 Datos de juego inválidos
  GAME_ACCESS_DENIED = 'GAME_ACCESS_DENIED',   // 🚫 Acceso denegado al juego
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',     // 🎯 Sesión no encontrada
  SESSION_EXPIRED = 'SESSION_EXPIRED',         // ⏰ Sesión expirada
  SESSION_CONFLICT = 'SESSION_CONFLICT',       // ⚡ Conflicto de sesión
  INVALID_RESPONSE = 'INVALID_RESPONSE',       // ❌ Respuesta inválida
  GAME_COMPLETED = 'GAME_COMPLETED',           // ✅ Juego ya completado
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS', // 🔐 Permisos insuficientes
  GAME_SERVER_ERROR = 'GAME_SERVER_ERROR',     // 🔥 Error del servidor de juegos
  NETWORK_ERROR = 'NETWORK_ERROR',             // 🌐 Error de red
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'              // ❓ Error desconocido
}

// ============================================================================
// 🏗️ IMPLEMENTACIÓN PRINCIPAL DEL SERVICIO
// ============================================================================

/**
 * 🎮 Servicio principal de juegos educativos
 * Implementación completa siguiendo principios SOLID y patrones de diseño
 */
export class GameService implements IGameService, ITriviaService, ICrosswordService, ISimulationService {
  
  // 💾 Cache interno para optimizar rendimiento
  private readonly gameCache = new Map<string, { data: AnyGame; timestamp: number }>();
  private readonly sessionCache = new Map<string, { data: GameSession; timestamp: number }>();
  
  // ⚙️ Configuración del cache (5 minutos de vida)
  private readonly CACHE_TTL = 5 * 60 * 1000;
  
  // 🔧 Instancia singleton del servicio
  private static instance: GameService;

  /**
   * 🏭 Obtener instancia singleton del servicio
   * Implementa el patrón Singleton para mantener estado consistente
   */
  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  /**
   * 🔐 Constructor privado para patrón Singleton
   */
  private constructor() {
    // Inicialización del servicio
    this.setupCacheCleanup();
  }

  // ============================================================================
  // 🎮 MÉTODOS PRINCIPALES DE GESTIÓN DE JUEGOS
  // ============================================================================

  /**
   * 🔍 Obtener lista de juegos con filtros y paginación
   * Implementa cache inteligente y manejo robusto de errores
   */
  async getGames(
    filters?: GameFilterOptions,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AnyGame>> {
    try {
      // 🔧 Construir parámetros de consulta
      const queryParams = this.buildQueryParams({ filters, sort, pagination });
      
      // 🌐 Realizar petición al backend
      const response = await httpClient.get<PaginatedResponse<AnyGame>>(
        `/games?${queryParams}`
      );

      // 💾 Actualizar cache con juegos obtenidos
      response.items.forEach(game => {
        this.setCacheItem(this.gameCache, game.id, game);
      });

      return response;
    } catch (error) {
      // 🚨 Manejo específico de errores
      throw this.handleError(error, 'Error al obtener lista de juegos');
    }
  }

  /**
   * 🎮 Obtener detalles específicos de un juego
   * Utiliza cache para optimizar rendimiento
   */
  async getGameById(gameId: string): Promise<AnyGame> {
    try {
      // 🔍 Verificar cache primero
      const cachedGame = this.getCacheItem(this.gameCache, gameId);
      if (cachedGame) {
        return cachedGame;
      }

      // 🌐 Obtener del backend si no está en cache
      const game = await httpClient.get<AnyGame>(`/games/${gameId}`);
      
      // 💾 Guardar en cache
      this.setCacheItem(this.gameCache, gameId, game);
      
      return game;
    } catch (error) {
      throw this.handleError(error, `Error al obtener juego ${gameId}`);
    }
  }

  /**
   * ✨ Crear un nuevo juego educativo
   * Valida datos y maneja errores específicos
   */
  async createGame(gameData: Partial<BaseGame>): Promise<AnyGame> {
    try {
      // ✅ Validar datos básicos
      this.validateGameData(gameData);

      // 🌐 Crear en el backend
      const newGame = await httpClient.post<AnyGame>('/games', gameData);
      
      // 💾 Agregar al cache
      this.setCacheItem(this.gameCache, newGame.id, newGame);
      
      return newGame;
    } catch (error) {
      throw this.handleError(error, 'Error al crear nuevo juego');
    }
  }

  /**
   * 📝 Actualizar un juego existente
   * Implementa validación y actualización de cache
   */
  async updateGame(gameId: string, updates: Partial<BaseGame>): Promise<AnyGame> {
    try {
      // ✅ Validar actualizaciones
      this.validateGameUpdates(updates);

      // 🌐 Actualizar en el backend
      const updatedGame = await httpClient.put<AnyGame>(`/games/${gameId}`, updates);
      
      // 💾 Actualizar cache
      this.setCacheItem(this.gameCache, gameId, updatedGame);
      
      return updatedGame;
    } catch (error) {
      throw this.handleError(error, `Error al actualizar juego ${gameId}`);
    }
  }

  /**
   * 🗑️ Eliminar un juego (soft delete)
   * Realiza eliminación lógica y limpia cache
   */
  async deleteGame(gameId: string): Promise<OperationResult<void>> {
    try {
      // 🌐 Eliminar en el backend
      await httpClient.delete(`/games/${gameId}`);
      
      // 💾 Remover del cache
      this.gameCache.delete(gameId);
      
      return { success: true, data: undefined };
    } catch (error) {
      const gameError = this.handleError(error, `Error al eliminar juego ${gameId}`);
      return { success: false, error: gameError.message, details: gameError };
    }
  }

  // ============================================================================
  // 🎯 MÉTODOS DE GESTIÓN DE SESIONES
  // ============================================================================

  /**
   * ▶️ Iniciar una nueva sesión de juego
   * Crea sesión en backend y establece configuración inicial
   */
  async startGameSession(gameId: string, configuration?: GameConfiguration): Promise<GameSession> {
    try {
      // 🎮 Verificar que el juego existe
      await this.getGameById(gameId);

      // 🌐 Iniciar sesión en backend
      const sessionData = {
        gameId,
        configuration: configuration || {}
      };

      const session = await httpClient.post<GameSession>(
        `/games/${gameId}/sessions`,
        sessionData
      );
      
      // 💾 Guardar sesión en cache
      this.setCacheItem(this.sessionCache, session.id, session);
      
      return session;
    } catch (error) {
      throw this.handleError(error, `Error al iniciar sesión del juego ${gameId}`);
    }
  }

  /**
   * 💾 Guardar progreso de sesión actual
   * Actualiza progreso en backend y cache local
   */
  async saveGameProgress(sessionId: string, progress: Partial<GameProgress>): Promise<OperationResult<void>> {
    try {
      // 🌐 Guardar progreso en backend
      await httpClient.patch(`/game-sessions/${sessionId}/progress`, progress);
      
      // 💾 Actualizar cache local
      const cachedSession = this.getCacheItem(this.sessionCache, sessionId);
      if (cachedSession) {
        const updatedSession = {
          ...cachedSession,
          currentProgress: { ...cachedSession.currentProgress, ...progress }
        };
        this.setCacheItem(this.sessionCache, sessionId, updatedSession);
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      const gameError = this.handleError(error, `Error al guardar progreso de sesión ${sessionId}`);
      return { success: false, error: gameError.message, details: gameError };
    }
  }

  /**
   * 📝 Registrar respuesta del estudiante
   * Procesa respuesta y obtiene feedback inmediato
   */
  async submitGameResponse(sessionId: string, response: Partial<GameResponse>): Promise<OperationResult<{
    isCorrect: boolean;
    feedback: string;
    pointsEarned: number;
    nextStep?: string;
  }>> {
    try {
      // 🌐 Enviar respuesta al backend
      const result = await httpClient.post<SubmitGameResponseResult>(
        `/game-sessions/${sessionId}/responses`,
        response
      );
      
      return { 
        success: true, 
        data: {
          isCorrect: result.isCorrect,
          feedback: result.feedback,
          pointsEarned: result.pointsEarned,
          nextStep: result.nextStep
        }
      };
    } catch (error) {
      const gameError = this.handleError(error, `Error al enviar respuesta en sesión ${sessionId}`);
      return { success: false, error: gameError.message, details: gameError };
    }
  }

  /**
   * ✅ Finalizar sesión de juego
   * Completa sesión y obtiene resultados finales
   */
  async finishGameSession(sessionId: string): Promise<OperationResult<{
    finalScore: number;
    achievements: string[];
    recommendations: Recommendation[];
    certificate?: string;
  }>> {
    try {
      // 🌐 Finalizar sesión en backend
      const result = await httpClient.post<FinishGameSessionResult>(
        `/game-sessions/${sessionId}/finish`
      );
      
      // 💾 Actualizar cache con estado final
      const cachedSession = this.getCacheItem(this.sessionCache, sessionId);
      if (cachedSession) {
        const finalSession = {
          ...cachedSession,
          status: GameStatus.COMPLETED,
          completedAt: new Date(),
          score: result.finalScore || 0
        };
        this.setCacheItem(this.sessionCache, sessionId, finalSession);
      }
      
      return { 
        success: true, 
        data: {
          finalScore: result.finalScore,
          achievements: result.achievements,
          recommendations: result.recommendations,
          certificate: result.certificate
        }
      };
    } catch (error) {
      const gameError = this.handleError(error, `Error al finalizar sesión ${sessionId}`);
      return { success: false, error: gameError.message, details: gameError };
    }
  }

  /**
   * 📊 Obtener estado actual de una sesión
   * Retorna información completa de la sesión activa
   */
  async getGameSession(sessionId: string): Promise<GameSession> {
    try {
      // 🔍 Verificar cache primero
      const cachedSession = this.getCacheItem(this.sessionCache, sessionId);
      if (cachedSession) {
        return cachedSession;
      }

      // 🌐 Obtener del backend
      const session = await httpClient.get<GameSession>(`/game-sessions/${sessionId}`);
      
      // 💾 Guardar en cache
      this.setCacheItem(this.sessionCache, sessionId, session);
      
      return session;
    } catch (error) {
      throw this.handleError(error, `Error al obtener sesión ${sessionId}`);
    }
  }

  // ============================================================================
  // 📊 MÉTODOS DE ANÁLISIS Y REPORTES
  // ============================================================================

  /**
   * 📈 Obtener estadísticas de un juego específico
   * Proporciona métricas completas de uso y rendimiento
   */
  async getGameStatistics(gameId: string): Promise<GameStatistics> {
    try {
      return await httpClient.get<GameStatistics>(`/games/${gameId}/statistics`);
    } catch (error) {
      throw this.handleError(error, `Error al obtener estadísticas del juego ${gameId}`);
    }
  }

  /**
   * 🎓 Obtener reporte de rendimiento del estudiante
   * Genera análisis completo del progreso educativo
   */
  async getStudentPerformanceReport(
    studentId: string, 
    period?: { start: Date; end: Date }
  ): Promise<StudentPerformanceReport> {
    try {
      const queryParams = period ? 
        `?startDate=${period.start.toISOString()}&endDate=${period.end.toISOString()}` : '';
      
      return await httpClient.get<StudentPerformanceReport>(
        `/students/${studentId}/performance-report${queryParams}`
      );
    } catch (error) {
      throw this.handleError(error, `Error al obtener reporte de rendimiento del estudiante ${studentId}`);
    }
  }

  /**
   * 💡 Obtener recomendaciones personalizadas
   * Proporciona sugerencias basadas en el perfil del estudiante
   */
  async getPersonalizedRecommendations(studentId: string, subject?: Subject): Promise<Recommendation[]> {
    try {
      const queryParams = subject ? `?subject=${subject}` : '';
      
      return await httpClient.get<Recommendation[]>(
        `/students/${studentId}/recommendations${queryParams}`
      );
    } catch (error) {
      throw this.handleError(error, `Error al obtener recomendaciones para estudiante ${studentId}`);
    }
  }

  // ============================================================================
  // 🧠 MÉTODOS ESPECÍFICOS DE TRIVIA
  // ============================================================================

  /**
   * ▶️ Iniciar sesión de trivia con configuración específica
   * Configura sesión optimizada para preguntas y respuestas
   */
  async startTriviaSession(
    gameId: string, 
    questionCount?: number, 
    difficulty?: DifficultyLevel
  ): Promise<TriviaSessionStart> {
    try {
      const triviaConfig = {
        questionCount: questionCount || 10,
        difficulty: difficulty || DifficultyLevel.INTERMEDIATE
      };

      return await httpClient.post<TriviaSessionStart>(`/games/trivia/${gameId}/start`, triviaConfig);
    } catch (error) {
      throw this.handleError(error, `Error al iniciar trivia ${gameId}`);
    }
  }

  /**
   * 📝 Responder pregunta de trivia
   * Procesa respuesta y proporciona feedback inmediato
   */
  async answerTriviaQuestion(
    sessionId: string,
    questionId: string,
    answer: string | string[],
    timeSpent: number
  ): Promise<TriviaAnswerResult> {
    try {
      const responseData = {
        questionId,
        answer,
        timeSpent
      };

      return await httpClient.post<TriviaAnswerResult>(
        `/games/trivia/sessions/${sessionId}/answer`,
        responseData
      );
    } catch (error) {
      throw this.handleError(error, `Error al responder pregunta de trivia`);
    }
  }

  /**
   * 📊 Obtener resultados finales de trivia
   * Proporciona resumen completo de rendimiento
   */
  async getTriviaResults(sessionId: string): Promise<{
    totalScore: number;
    percentage: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    achievements: string[];
    feedback: string;
  }> {
    try {
      return await httpClient.get(`/games/trivia/sessions/${sessionId}/result`);
    } catch (error) {
      throw this.handleError(error, `Error al obtener resultados de trivia`);
    }
  }

  // ============================================================================
  // 🔤 MÉTODOS ESPECÍFICOS DE CRUCIGRAMA
  // ============================================================================

  /**
   * 🎯 Generar crucigrama automáticamente
   * Crea crucigrama optimizado para el nivel educativo
   */
  async generateCrossword(gameId: string, words?: string[], gridSize?: number): Promise<GeneratedCrossword> {
    try {
      const generationParams = {
        words: words || [],
        gridSize: gridSize || 15
      };

      return await httpClient.post<GeneratedCrossword>(
        `/games/crossword/${gameId}/generate`,
        generationParams
      );
    } catch (error) {
      throw this.handleError(error, `Error al generar crucigrama ${gameId}`);
    }
  }

  /**
   * ✅ Validar palabra ingresada en crucigrama
   * Verifica corrección y proporciona feedback específico
   */
  async validateCrosswordWord(sessionId: string, wordId: string, userInput: string): Promise<{
    isCorrect: boolean;
    feedback: string;
    hintsAvailable: boolean;
    progressPercentage: number;
  }> {
    try {
      const validationData = {
        wordId,
        userInput
      };

      return await httpClient.post(`/games/crossword/sessions/${sessionId}/validate`, validationData);
    } catch (error) {
      throw this.handleError(error, `Error al validar palabra de crucigrama`);
    }
  }

  /**
   * 💡 Solicitar pista para crucigrama
   * Proporciona ayuda graduada con penalización apropiada
   */
  async getCrosswordHint(sessionId: string, wordId: string, hintLevel: number): Promise<{
    hint: string;
    penaltyApplied: number;
    remainingHints: number;
  }> {
    try {
      const hintRequest = {
        wordId,
        hintLevel
      };

      return await httpClient.post(`/games/crossword/sessions/${sessionId}/hint`, hintRequest);
    } catch (error) {
      throw this.handleError(error, `Error al obtener pista de crucigrama`);
    }
  }

  // ============================================================================
  // 🎭 MÉTODOS ESPECÍFICOS DE SIMULACIÓN
  // ============================================================================

  /**
   * 🎬 Iniciar simulación educativa
   * Establece contexto inicial y personajes
   */
  async startSimulation(gameId: string): Promise<SimulationStartState> {
    try {
      return await httpClient.post<SimulationStartState>(`/games/simulation/${gameId}/start`);
    } catch (error) {
      throw this.handleError(error, `Error al iniciar simulación ${gameId}`);
    }
  }

  /**
   * 🎯 Ejecutar acción en simulación
   * Procesa decisión del estudiante y actualiza narrativa
   */
  async executeSimulationAction(sessionId: string, actionId: string): Promise<SimulationActionResult> {
    try {
      const actionData = { choiceId: actionId };

      return await httpClient.post<SimulationActionResult>(
        `/games/simulation/sessions/${sessionId}/choice`,
        actionData
      );
    } catch (error) {
      throw this.handleError(error, `Error al ejecutar acción en simulación`);
    }
  }

  /**
   * 💬 Interactuar con personaje
   * Maneja diálogo y relaciones en simulación
   */
  async interactWithCharacter(
    sessionId: string,
    characterId: string,
    dialogueOption: string
  ): Promise<SimulationInteractionResult> {
    try {
      const interactionData = {
        characterId,
        dialogueOption
      };

      return await httpClient.post<SimulationInteractionResult>(
        `/games/simulation/sessions/${sessionId}/interact`,
        interactionData
      );
    } catch (error) {
      throw this.handleError(error, `Error al interactuar con personaje en simulación`);
    }
  }

  // ============================================================================
  // 🔧 MÉTODOS AUXILIARES Y UTILIDADES
  // ============================================================================

  /**
   * 🔧 Construir parámetros de consulta para URLs
   * Convierte objetos de filtro en query strings válidos
   */
  private buildQueryParams(params: {
    filters?: GameFilterOptions;
    sort?: SortOptions;
    pagination?: PaginationOptions;
  }): string {
    const queryParams = new URLSearchParams();

    // Agregar filtros
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => queryParams.append(`${key}[]`, item.toString()));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    // Agregar ordenamiento
    if (params.sort) {
      queryParams.append('sortBy', params.sort.field);
      queryParams.append('sortOrder', params.sort.direction);
    }

    // Agregar paginación
    if (params.pagination) {
      queryParams.append('page', params.pagination.page.toString());
      queryParams.append('limit', params.pagination.limit.toString());
    }

    return queryParams.toString();
  }

  /**
   * ✅ Validar datos básicos de juego
   * Verifica que los datos obligatorios estén presentes
   */
  private validateGameData(gameData: Partial<BaseGame>): void {
    if (!gameData.title?.trim()) {
      throw new GameServiceError(
        GameErrorType.INVALID_GAME_DATA,
        'El título del juego es obligatorio'
      );
    }

    if (!gameData.description?.trim()) {
      throw new GameServiceError(
        GameErrorType.INVALID_GAME_DATA,
        'La descripción del juego es obligatoria'
      );
    }

    if (!gameData.type) {
      throw new GameServiceError(
        GameErrorType.INVALID_GAME_DATA,
        'El tipo de juego es obligatorio'
      );
    }

    if (!gameData.subject) {
      throw new GameServiceError(
        GameErrorType.INVALID_GAME_DATA,
        'La materia del juego es obligatoria'
      );
    }
  }

  /**
   * ✅ Validar actualizaciones de juego
   * Verifica que las actualizaciones sean válidas
   */
  private validateGameUpdates(updates: Partial<BaseGame>): void {
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new GameServiceError(
        GameErrorType.INVALID_GAME_DATA,
        'El título no puede estar vacío'
      );
    }

    if (updates.description !== undefined && !updates.description.trim()) {
      throw new GameServiceError(
        GameErrorType.INVALID_GAME_DATA,
        'La descripción no puede estar vacía'
      );
    }
  }

  /**
   * 💾 Obtener elemento del cache
   * Verifica validez temporal antes de retornar
   */
  private getCacheItem<T>(cache: Map<string, { data: T; timestamp: number }>, key: string): T | null {
    const item = cache.get(key);
    if (!item) return null;

    // Verificar si el item ha expirado
    if (Date.now() - item.timestamp > this.CACHE_TTL) {
      cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 💾 Establecer elemento en cache
   * Guarda con timestamp para control de expiración
   */
  private setCacheItem<T>(cache: Map<string, { data: T; timestamp: number }>, key: string, data: T): void {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 🧹 Configurar limpieza automática de cache
   * Ejecuta limpieza periódica de elementos expirados
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Limpiar cache de juegos
      for (const [key, value] of this.gameCache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.gameCache.delete(key);
        }
      }
      
      // Limpiar cache de sesiones
      for (const [key, value] of this.sessionCache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.sessionCache.delete(key);
        }
      }
    }, this.CACHE_TTL); // Ejecutar cada 5 minutos
  }

  /**
   * 🚨 Manejo centralizado de errores
   * Convierte errores HTTP en errores específicos de juegos
   */
  private handleError(error: unknown, context: string): GameServiceError {
    if (error instanceof GameServiceError) {
      return error;
    }

    if (error instanceof HttpError) {
      return GameServiceError.fromHttpError(error);
    }

    if (error instanceof Error) {
      return new GameServiceError(
        GameErrorType.UNKNOWN_ERROR,
        `${context}: ${error.message || 'Error desconocido'}`,
        500,
        error
      );
    }

    return new GameServiceError(
      GameErrorType.UNKNOWN_ERROR,
      `${context}: Error desconocido`,
      500,
      error
    );
  }

  // ============================================================================
  // 🧩 MÉTODOS ESPECÍFICOS PARA CRUCIGRAMAS
  // ============================================================================

  /**
   * 🧩 Obtener datos de un crucigrama
   * Carga la estructura completa del crucigrama con pistas y cuadrícula
   */
  async getCrosswordData(
    gameId: string, 
    difficulty?: DifficultyLevel, 
    subject?: Subject
  ): Promise<CrosswordGameData> {
    try {
      const params = new URLSearchParams();
      if (difficulty) params.append('difficulty', difficulty);
      if (subject) params.append('subject', subject);
      
      // const _result = await httpClient.get(`/games/crossword/${gameId}?${params.toString()}`);
      // TODO: Usar datos reales del backend cuando esté implementado
      
      // Simular datos mientras se implementa el backend
      return {
        sessionId: `crossword-${Date.now()}`,
        grid: this.generateSampleGrid(),
        clues: this.generateSampleClues(),
        totalPoints: 100,
        timeLimit: 1800 // 30 minutos
      };
    } catch (error) {
      throw this.handleError(error, `Error al cargar crucigrama ${gameId}`);
    }
  }

  /**
   * 💡 Obtener pista para una palabra del crucigrama
   * Proporciona ayuda adicional para resolver una palabra específica
   */
  // Método removido - usar getCrosswordHint existente

  /**
   * 🧩 Generar cuadrícula de ejemplo (temporal)
   * TODO: Remover cuando el backend esté implementado
   */
  private generateSampleGrid(): CrosswordGridInput {
    const grid: CrosswordGridInput = Array.from({ length: 15 }, () =>
      Array.from({ length: 15 }, () => ({
        letter: '',
        isBlocked: Math.random() > 0.7,
        number: null,
        isHorizontal: false,
        isVertical: false
      }))
    );
    
    // Agregar algunas palabras de ejemplo
    // Palabra horizontal: "EDUCACION" en fila 5
    const word1 = "EDUCACION";
    for (let i = 0; i < word1.length; i++) {
      grid[5][i + 3] = {
        letter: word1[i],
        isBlocked: false,
        number: i === 0 ? 1 : null,
        isHorizontal: true,
        isVertical: false
      };
    }
    
    // Palabra vertical: "APRENDER" en columna 6
    const word2 = "APRENDER";
    for (let i = 0; i < word2.length; i++) {
      grid[i + 2][6] = {
        letter: word2[i],
        isBlocked: false,
        number: i === 0 ? 2 : null,
        isHorizontal: false,
        isVertical: true
      };
    }
    
    return grid;
  }

  /**
   * 💭 Generar pistas de ejemplo (temporal)
   * TODO: Remover cuando el backend esté implementado
   */
  private generateSampleClues(): CrosswordClueInput[] {
    return [
      {
        id: 'clue-1',
        number: 1,
        direction: 'horizontal',
        clue: 'Proceso de enseñanza y aprendizaje',
        answer: 'EDUCACION',
        startPosition: [5, 3],
        length: 9,
      },
      {
        id: 'clue-2',
        number: 2,
        direction: 'vertical',
        clue: 'Adquirir conocimientos o habilidades',
        answer: 'APRENDER',
        startPosition: [2, 6],
        length: 8
      }
    ];
  }
}

// ============================================================================
// 🏭 INSTANCIA SINGLETON EXPORTADA
// ============================================================================

/**
 * 🎮 Instancia principal del servicio de juegos
 * Utiliza patrón Singleton para mantener consistencia
 */
export const gameService = GameService.getInstance();

/**
 * 📚 DOCUMENTACIÓN DE USO:
 * 
 * 🎯 EJEMPLOS DE USO BÁSICO:
 * 
 * ```typescript
 * // Obtener lista de juegos
 * const games = await gameService.getGames({
 *   subjects: [Subject.MATHEMATICS, Subject.SCIENCE],
 *   difficulties: [DifficultyLevel.INTERMEDIATE],
 *   educationLevels: [EducationLevel.PRIMARY_5]
 * });
 * 
 * // Iniciar sesión de trivia
 * const triviaSession = await gameService.startTriviaSession(
 *   'game-123',
 *   10, // 10 preguntas
 *   DifficultyLevel.INTERMEDIATE
 * );
 * 
 * // Responder pregunta
 * const result = await gameService.answerTriviaQuestion(
 *   triviaSession.sessionId,
 *   'question-456',
 *   'Respuesta del estudiante',
 *   30 // 30 segundos
 * );
 * 
 * // Iniciar crucigrama
 * const crossword = await gameService.generateCrossword('crossword-789');
 * 
 * // Iniciar simulación
 * const simulation = await gameService.startSimulation('simulation-101');
 * ```
 * 
 * 🎓 PRINCIPIOS APLICADOS:
 * - Manejo robusto de errores con tipos específicos
 * - Cache inteligente para optimizar rendimiento
 * - Validación exhaustiva de datos de entrada
 * - Interfaz consistente para todos los tipos de juegos
 * - Separación clara de responsabilidades
 * - Código testeable y mantenible
 */