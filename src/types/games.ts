// ============================================================================
// 🎮 TIPOS E INTERFACES PARA JUEGOS EDUCATIVOS - ACALUD
// ============================================================================
/**
 * 🎯 PROPÓSITO:
 * Define todos los tipos de datos específicos para el sistema de juegos educativos.
 * Extiende el sistema de tipos existente con estructuras para trivia, crucigramas y simulaciones.
 * 
 * 🏗️ PRINCIPIOS SOLID APLICADOS:
 * - Single Responsibility: Cada interfaz tiene una responsabilidad específica
 * - Open/Closed: Extensible para nuevos tipos de juegos sin modificar existentes
 * - Interface Segregation: Interfaces específicas en lugar de una interfaz grande
 * - Dependency Inversion: Abstracciones en lugar de implementaciones concretas
 */

// 📦 IMPORTACIONES DE TIPOS BASE
import { User } from './index';

// ============================================================================
// 🎯 ENUMERACIONES PARA JUEGOS EDUCATIVOS
// ============================================================================

/**
 * 🎮 Tipos de juegos disponibles en la plataforma
 * Cada tipo define un conjunto específico de mecánicas de juego
 */
export enum GameType {
  TRIVIA = 'trivia',           // 🧠 Preguntas de selección múltiple y verdadero/falso
  CROSSWORD = 'crossword',     // 🔤 Crucigramas educativos
  SIMULATION = 'simulation'    // 🎭 Simulaciones interactivas históricas/científicas
}

/**
 * 📚 Materias educativas disponibles
 * Cubre todo el currículo de primaria y secundaria
 */
export enum Subject {
  MATHEMATICS = 'mathematics',     // 🔢 Matemáticas: aritmética, álgebra, geometría
  SCIENCE = 'science',            // 🔬 Ciencias: física, química, biología
  HISTORY = 'history',            // 📜 Historia: eventos, personajes, culturas
  LITERATURE = 'literature',      // 📖 Literatura: análisis, comprensión lectora
  GEOGRAPHY = 'geography',        // 🌍 Geografía: países, capitales, relieve
  SPANISH = 'spanish',            // 🇪🇸 Español: gramática, ortografía, redacción
  ENGLISH = 'english',            // 🇺🇸 Inglés: vocabulario, gramática, comprensión
  ART = 'art',                   // 🎨 Arte: historia del arte, técnicas, creatividad
  MUSIC = 'music',               // 🎵 Música: teoría, historia, apreciación musical
  PHYSICAL_EDUCATION = 'physical_education' // ⚽ Educación física: deportes, salud
}

/**
 * 📊 Niveles de dificultad progresivos
 * Se adaptan automáticamente según el rendimiento del estudiante
 */
export enum DifficultyLevel {
  BEGINNER = 'beginner',       // 🌱 Principiante: conceptos básicos
  INTERMEDIATE = 'intermediate', // 🌿 Intermedio: aplicación de conceptos
  ADVANCED = 'advanced',       // 🌳 Avanzado: análisis y síntesis
  EXPERT = 'expert'           // 🏆 Experto: pensamiento crítico avanzado
}

/**
 * 🎓 Niveles educativos del sistema colombiano
 * Permite segmentación precisa del contenido educativo
 */
export enum EducationLevel {
  PRIMARY_1 = 'primary_1',     // 📚 1° Primaria (6-7 años)
  PRIMARY_2 = 'primary_2',     // 📚 2° Primaria (7-8 años)
  PRIMARY_3 = 'primary_3',     // 📚 3° Primaria (8-9 años)
  PRIMARY_4 = 'primary_4',     // 📚 4° Primaria (9-10 años)
  PRIMARY_5 = 'primary_5',     // 📚 5° Primaria (10-11 años)
  SECONDARY_6 = 'secondary_6',  // 🎓 6° Secundaria (11-12 años)
  SECONDARY_7 = 'secondary_7',  // 🎓 7° Secundaria (12-13 años)
  SECONDARY_8 = 'secondary_8',  // 🎓 8° Secundaria (13-14 años)
  SECONDARY_9 = 'secondary_9',  // 🎓 9° Secundaria (14-15 años)
  SECONDARY_10 = 'secondary_10', // 🎓 10° Secundaria (15-16 años)
  SECONDARY_11 = 'secondary_11'  // 🎓 11° Secundaria (16-17 años)
}

/**
 * 🎯 Estados de progreso del juego
 * Permite seguimiento detallado del avance del estudiante
 */
export enum GameStatus {
  NOT_STARTED = 'not_started', // ⏸️ No iniciado
  IN_PROGRESS = 'in_progress', // ▶️ En progreso
  COMPLETED = 'completed',     // ✅ Completado exitosamente
  ABANDONED = 'abandoned',     // ❌ Abandonado por el estudiante
  EXPIRED = 'expired'         // ⏰ Expirado por tiempo límite
}

// ============================================================================
// 🎮 INTERFACES PRINCIPALES DE JUEGOS
// ============================================================================

/**
 * 🎯 Interfaz base para cualquier juego educativo
 * Implementa el patrón Template Method - define estructura común
 */
export interface BaseGame {
  readonly id: string;                    // 🆔 Identificador único del juego
  readonly title: string;                 // 📝 Título descriptivo y atractivo
  readonly description: string;           // 📄 Descripción educativa detallada
  readonly type: GameType;               // 🎮 Tipo específico de juego
  readonly subject: Subject;             // 📚 Materia educativa
  readonly educationLevel: EducationLevel; // 🎓 Nivel educativo objetivo
  readonly difficulty: DifficultyLevel;   // 📊 Nivel de dificultad
  readonly estimatedTime: number;        // ⏱️ Tiempo estimado en minutos
  readonly maxScore: number;             // 🏆 Puntuación máxima posible
  readonly tags: string[];               // 🏷️ Etiquetas para búsqueda y filtrado
  readonly createdBy: User;              // 👨‍🏫 Profesor que creó el juego
  readonly createdAt: Date;              // 📅 Fecha de creación
  readonly updatedAt?: Date;             // 📅 Última actualización
  readonly isActive: boolean;            // ✅ ¿Está disponible para jugar?
}

/**
 * 🧠 Interfaz para juegos de trivia educativa
 * Especialización para preguntas de conocimiento
 */
export interface TriviaGame extends BaseGame {
  readonly type: GameType.TRIVIA;        // 🎯 Tipo específico: trivia
  readonly questions: TriviaQuestion[];   // ❓ Lista de preguntas del juego
  readonly timePerQuestion: number;      // ⏱️ Tiempo límite por pregunta (segundos)
  readonly randomizeQuestions: boolean;  // 🔀 ¿Aleatorizar orden de preguntas?
  readonly randomizeAnswers: boolean;    // 🔀 ¿Aleatorizar orden de respuestas?
  readonly showCorrectAnswer: boolean;   // ✅ ¿Mostrar respuesta correcta inmediatamente?
  readonly allowReplay: boolean;         // 🔄 ¿Permitir volver a jugar?
}

/**
 * 🔤 Interfaz para juegos de crucigrama
 * Especialización para crucigramas educativos
 */
export interface CrosswordGame extends BaseGame {
  readonly type: GameType.CROSSWORD;     // 🎯 Tipo específico: crucigrama
  readonly grid: CrosswordGrid;          // 📊 Grilla del crucigrama
  readonly clues: CrosswordClue[];       // 💭 Pistas para resolver
  readonly words: CrosswordWord[];       // 🔤 Palabras a encontrar
  readonly showTimer: boolean;           // ⏱️ ¿Mostrar cronómetro?
  readonly allowHints: boolean;          // 💡 ¿Permitir pistas adicionales?
  readonly hintPenalty: number;          // 📉 Penalización por usar pistas
}

/**
 * 🎭 Interfaz para simulaciones educativas
 * Especialización para experiencias inmersivas
 */
export interface SimulationGame extends BaseGame {
  readonly type: GameType.SIMULATION;    // 🎯 Tipo específico: simulación
  readonly scenario: SimulationScenario; // 🎬 Escenario de la simulación
  readonly characters: SimulationCharacter[]; // 👥 Personajes involucrados
  readonly objectives: LearningObjective[]; // 🎯 Objetivos de aprendizaje
  readonly decisions: SimulationDecision[]; // 🤔 Decisiones disponibles
  readonly outcomes: SimulationOutcome[]; // 📊 Posibles resultados
  readonly maxDuration: number;          // ⏰ Duración máxima (minutos)
}

// ============================================================================
// 🧠 INTERFACES PARA TRIVIA
// ============================================================================

/**
 * ❓ Tipo de preguntas disponibles en trivia
 * Permite variedad en el formato de evaluación
 */
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice', // 🔘 Selección múltiple (4 opciones)
  TRUE_FALSE = 'true_false',          // ✅❌ Verdadero o falso
  FILL_BLANK = 'fill_blank',          // ✏️ Completar espacios en blanco
  MATCHING = 'matching',              // 🔗 Emparejar conceptos
  ORDERING = 'ordering'               // 📊 Ordenar elementos
}

/**
 * ❓ Estructura de una pregunta de trivia
 * Incluye todo lo necesario para evaluar conocimiento
 */
export interface TriviaQuestion {
  readonly id: string;                 // 🆔 Identificador único
  readonly type: QuestionType;         // 🎯 Tipo de pregunta
  readonly question: string;           // ❓ Enunciado de la pregunta
  readonly options: string[];          // 📋 Opciones de respuesta
  readonly correctAnswer: string | string[]; // ✅ Respuesta(s) correcta(s)
  readonly explanation: string;        // 💡 Explicación educativa
  readonly difficulty: DifficultyLevel; // 📊 Nivel de dificultad
  readonly points: number;             // 🏆 Puntos por respuesta correcta
  readonly timeLimit: number;          // ⏱️ Tiempo límite (segundos)
  readonly tags: string[];             // 🏷️ Etiquetas temáticas
  readonly multimedia?: MultimediaContent; // 🎵🖼️ Contenido multimedia opcional
}

/**
 * 🎵🖼️ Contenido multimedia para enriquecer preguntas
 * Mejora la experiencia de aprendizaje visual y auditiva
 */
export interface MultimediaContent {
  readonly images?: MediaFile[];       // 🖼️ Imágenes relacionadas
  readonly audio?: MediaFile[];        // 🎵 Audio relacionado
  readonly videos?: MediaFile[];       // 🎬 Videos relacionados
}

/**
 * 📁 Archivo multimedia
 * Representa cualquier tipo de media usado en preguntas
 */
export interface MediaFile {
  readonly url: string;                // 🔗 URL del archivo
  readonly type: string;               // 📄 Tipo MIME
  readonly caption?: string;           // 📝 Descripción del archivo
  readonly altText?: string;           // ♿ Texto alternativo para accesibilidad
}

// ============================================================================
// 🔤 INTERFACES PARA CRUCIGRAMAS
// ============================================================================

/**
 * 📊 Grilla del crucigrama
 * Representa la estructura bidimensional del juego
 */
export interface CrosswordGrid {
  readonly rows: number;               // 📏 Número de filas
  readonly cols: number;               // 📐 Número de columnas
  readonly cells: CrosswordCell[][];   // 🔲 Matriz de celdas
}

/**
 * 🔲 Celda individual del crucigrama
 * Unidad básica de la grilla con toda su información
 */
export interface CrosswordCell {
  readonly row: number;                // 📍 Posición Y en la grilla
  readonly col: number;                // 📍 Posición X en la grilla
  readonly letter: string;             // 🔤 Letra correcta ('' si está vacía)
  readonly belongsToWords: number[];   // 🔗 IDs de palabras que cruzan esta celda
  readonly isBlocked?: boolean;        // 🚫 ¿Es una celda bloqueada?
  readonly number?: number;            // 🔢 Número de referencia (para pistas)
}

/**
 * 💭 Pista del crucigrama
 * Información que guía al estudiante para encontrar la palabra
 */
export interface CrosswordClue {
  readonly id: string;                 // 🆔 Identificador único
  readonly number: number;             // 🔢 Número de referencia
  readonly direction: 'horizontal' | 'vertical'; // ↔️↕️ Dirección de la palabra
  readonly clue: string;               // 💭 Texto de la pista
  readonly answer: string;             // ✅ Respuesta correcta
  readonly startRow: number;           // 📍 Fila de inicio
  readonly startCol: number;           // 📍 Columna de inicio
  readonly difficulty: DifficultyLevel; // 📊 Dificultad específica
}

/**
 * 🔤 Palabra del crucigrama
 * Representa una palabra completa dentro del crucigrama
 */
export interface CrosswordWord {
  readonly id: string;                 // 🆔 Identificador único
  readonly word: string;               // 🔤 La palabra completa
  readonly clueId: string;             // 🔗 ID de la pista asociada
  readonly startPosition: Position;    // 📍 Posición de inicio
  readonly direction: 'horizontal' | 'vertical'; // ↔️↕️ Dirección
  readonly intersections: WordIntersection[]; // ❌ Cruces con otras palabras
}

/**
 * 📍 Posición en la grilla
 * Coordenadas específicas dentro del crucigrama
 */
export interface Position {
  readonly row: number;                // 📍 Fila (Y)
  readonly col: number;                // 📍 Columna (X)
}

/**
 * ❌ Intersección entre palabras
 * Punto donde dos palabras se cruzan en el crucigrama
 */
export interface WordIntersection {
  readonly withWordId: string;         // 🔗 ID de la palabra que cruza
  readonly position: Position;         // 📍 Posición del cruce
  readonly letter: string;             // 🔤 Letra compartida
}

// ============================================================================
// 🎭 INTERFACES PARA SIMULACIONES
// ============================================================================

/**
 * 🎬 Escenario de simulación
 * Define el contexto y ambiente de la experiencia educativa
 */
export interface SimulationScenario {
  readonly id: string;                 // 🆔 Identificador único
  readonly title: string;              // 📝 Título del escenario
  readonly description: string;        // 📄 Descripción detallada
  readonly setting: string;            // 🏛️ Ambientación (época, lugar)
  readonly context: string;            // 📚 Contexto educativo
  readonly initialScene: SimulationScene; // 🎬 Escena inicial
  readonly backgroundInfo: string;     // 📖 Información de trasfondo
}

/**
 * 🎬 Escena de simulación
 * Momento específico dentro de la experiencia
 */
export interface SimulationScene {
  readonly id: string;                 // 🆔 Identificador único
  readonly title: string;              // 📝 Título de la escena
  readonly description: string;        // 📄 Descripción de la situación
  readonly dialogue?: string;          // 💬 Diálogo o narración
  readonly characters: string[];       // 👥 Personajes presentes
  readonly availableActions: SimulationAction[]; // 🎯 Acciones disponibles
  readonly multimedia?: MultimediaContent; // 🎵🖼️ Contenido multimedia
}

/**
 * 🎯 Acción disponible en una escena
 * Decisión que puede tomar el estudiante
 */
export interface SimulationAction {
  readonly id: string;                 // 🆔 Identificador único
  readonly text: string;               // 📝 Texto de la acción
  readonly description?: string;       // 📄 Descripción detallada
  readonly consequences: ActionConsequence[]; // 📊 Consecuencias posibles
  readonly requiredKnowledge?: string[]; // 🧠 Conocimientos requeridos
  readonly difficulty: DifficultyLevel; // 📊 Dificultad de la decisión
}

/**
 * 📊 Consecuencia de una acción
 * Resultado de una decisión del estudiante
 */
export interface ActionConsequence {
  readonly nextSceneId: string;        // 🎬 Siguiente escena
  readonly pointsAwarded: number;      // 🏆 Puntos ganados/perdidos
  readonly feedback: string;           // 💬 Retroalimentación inmediata
  readonly explanation: string;        // 💡 Explicación educativa
  readonly impactDescription: string;  // 📊 Descripción del impacto
}

/**
 * 👤 Personaje de simulación
 * Entidad con la que el estudiante puede interactuar
 */
export interface SimulationCharacter {
  readonly id: string;                 // 🆔 Identificador único
  readonly name: string;               // 📝 Nombre del personaje
  readonly role: string;               // 🎭 Rol en la simulación
  readonly description: string;        // 📄 Descripción del personaje
  readonly personality: string;        // 😊 Personalidad y características
  readonly avatar?: string;            // 🖼️ Imagen del personaje
  readonly dialogue: CharacterDialogue[]; // 💬 Diálogos disponibles
}

/**
 * 💬 Diálogo de personaje
 * Interacción específica con un personaje
 */
export interface CharacterDialogue {
  readonly id: string;                 // 🆔 Identificador único
  readonly trigger: string;            // 🎯 Condición que activa el diálogo
  readonly text: string;               // 💬 Texto del diálogo
  readonly responses: DialogueResponse[]; // 📋 Respuestas disponibles
}

/**
 * 📋 Respuesta de diálogo
 * Opción de respuesta del estudiante
 */
export interface DialogueResponse {
  readonly id: string;                 // 🆔 Identificador único
  readonly text: string;               // 💬 Texto de la respuesta
  readonly consequence: ActionConsequence; // 📊 Consecuencia de la respuesta
}

/**
 * 🎯 Objetivo de aprendizaje
 * Meta educativa específica de la simulación
 */
export interface LearningObjective {
  readonly id: string;                 // 🆔 Identificador único
  readonly description: string;        // 📄 Descripción del objetivo
  readonly category: string;           // 📚 Categoría educativa
  readonly competency: string;         // 🎓 Competencia desarrollada
  readonly assessmentCriteria: string[]; // 📊 Criterios de evaluación
  readonly weight: number;             // ⚖️ Peso en la calificación final
}

/**
 * 🤔 Decisión de simulación
 * Punto de decisión crítico en la experiencia
 */
export interface SimulationDecision {
  readonly id: string;                 // 🆔 Identificador único
  readonly description: string;        // 📄 Descripción de la decisión
  readonly options: DecisionOption[];  // 📋 Opciones disponibles
  readonly timeLimit?: number;         // ⏱️ Tiempo límite para decidir
  readonly importance: 'low' | 'medium' | 'high' | 'critical'; // 🚨 Importancia
}

/**
 * 📋 Opción de decisión
 * Alternativa específica en un punto de decisión
 */
export interface DecisionOption {
  readonly id: string;                 // 🆔 Identificador único
  readonly text: string;               // 📝 Texto de la opción
  readonly rationale: string;          // 🤔 Justificación educativa
  readonly outcome: SimulationOutcome; // 📊 Resultado de elegir esta opción
}

/**
 * 📊 Resultado de simulación
 * Consecuencia final de las decisiones tomadas
 */
export interface SimulationOutcome {
  readonly id: string;                 // 🆔 Identificador único
  readonly title: string;              // 📝 Título del resultado
  readonly description: string;        // 📄 Descripción detallada
  readonly score: number;              // 🏆 Puntuación obtenida
  readonly feedback: string;           // 💬 Retroalimentación final
  readonly educationalValue: string;   // 🎓 Valor educativo del resultado
  readonly nextSteps: string[];        // 🚀 Pasos siguientes sugeridos
}

// ============================================================================
// 🏆 INTERFACES DE PROGRESO Y RESULTADOS
// ============================================================================

/**
 * 📊 Sesión de juego activa
 * Representa una instancia específica de un estudiante jugando
 */
export interface GameSession {
  readonly id: string;                 // 🆔 Identificador único de la sesión
  readonly gameId: string;             // 🎮 ID del juego que se está jugando
  readonly playerId: string;           // 👤 ID del estudiante
  readonly status: GameStatus;         // 🎯 Estado actual de la sesión
  readonly startedAt: Date;            // ⏰ Momento de inicio
  readonly completedAt?: Date;         // ✅ Momento de finalización
  readonly currentProgress: GameProgress; // 📈 Progreso actual
  readonly responses: GameResponse[];  // 📋 Respuestas del estudiante
  readonly score: number;              // 🏆 Puntuación actual
  readonly timeSpent: number;          // ⏱️ Tiempo transcurrido (segundos)
  readonly hintsUsed: number;          // 💡 Pistas utilizadas
  readonly metadata: SessionMetadata;  // 📊 Metadatos adicionales
}

/**
 * 📈 Progreso dentro del juego
 * Seguimiento detallado del avance del estudiante
 */
export interface GameProgress {
  readonly currentStep: number;        // 📍 Paso actual en el juego
  readonly totalSteps: number;         // 📊 Total de pasos en el juego
  readonly percentage: number;         // 📈 Porcentaje completado (0-100)
  readonly checkpoints: Checkpoint[];  // 🚩 Puntos de control alcanzados
  readonly achievements: Achievement[]; // 🏆 Logros desbloqueados
}

/**
 * 🚩 Punto de control
 * Momento específico guardado en el progreso
 */
export interface Checkpoint {
  readonly id: string;                 // 🆔 Identificador único
  readonly name: string;               // 📝 Nombre del checkpoint
  readonly reachedAt: Date;            // ⏰ Momento en que se alcanzó
  readonly scoreAtCheckpoint: number;  // 🏆 Puntuación al llegar
  readonly data: any;                  // 💾 Datos específicos del estado
}

/**
 * 🏆 Logro desbloqueado
 * Reconocimiento por un hito específico
 */
export interface Achievement {
  readonly id: string;                 // 🆔 Identificador único
  readonly name: string;               // 📝 Nombre del logro
  readonly description: string;        // 📄 Descripción del logro
  readonly icon: string;               // 🎨 Icono representativo
  readonly points: number;             // 🏆 Puntos otorgados
  readonly rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'; // ✨ Rareza
  readonly unlockedAt: Date;           // ⏰ Momento de desbloqueo
}

/**
 * 📋 Respuesta del estudiante
 * Registro de una respuesta específica
 */
export interface GameResponse {
  readonly questionId: string;         // ❓ ID de la pregunta respondida
  readonly userAnswer: any;            // 📝 Respuesta del estudiante
  readonly correctAnswer: any;         // ✅ Respuesta correcta
  readonly isCorrect: boolean;         // ✅ ¿Es correcta la respuesta?
  readonly timeSpent: number;          // ⏱️ Tiempo para responder (segundos)
  readonly pointsEarned: number;       // 🏆 Puntos ganados
  readonly hintsUsed: number;          // 💡 Pistas utilizadas
  readonly timestamp: Date;            // ⏰ Momento de la respuesta
  readonly explanation?: string;       // 💡 Explicación mostrada
}

/**
 * 📊 Metadatos de sesión
 * Información adicional sobre la sesión de juego
 */
export interface SessionMetadata {
  readonly deviceType: string;         // 📱 Tipo de dispositivo usado
  readonly browserInfo: string;        // 🌐 Información del navegador
  readonly screenResolution: string;   // 🖥️ Resolución de pantalla
  readonly connectionQuality: string;  // 📶 Calidad de conexión
  readonly interruptions: number;      // ⏸️ Número de interrupciones
  readonly pauseDuration: number;      // ⏸️ Tiempo total en pausa (segundos)
}

// ============================================================================
// 📊 INTERFACES DE ANÁLISIS Y REPORTES
// ============================================================================

/**
 * 📈 Estadísticas del juego
 * Métricas agregadas de rendimiento
 */
export interface GameStatistics {
  readonly gameId: string;             // 🎮 ID del juego
  readonly totalPlayers: number;       // 👥 Total de jugadores únicos
  readonly totalSessions: number;      // 🎯 Total de sesiones de juego
  readonly completionRate: number;     // 📊 Tasa de finalización (0-100)
  readonly averageScore: number;       // 🏆 Puntuación promedio
  readonly averageTime: number;        // ⏱️ Tiempo promedio (minutos)
  readonly difficultyAnalysis: DifficultyAnalysis; // 📊 Análisis de dificultad
  readonly popularityTrend: PopularityData[]; // 📈 Tendencia de popularidad
  readonly lastUpdated: Date;          // 🔄 Última actualización de stats
}

/**
 * 📊 Análisis de dificultad
 * Evaluación de qué tan apropiado es el nivel de dificultad
 */
export interface DifficultyAnalysis {
  readonly isAppropriate: boolean;     // ✅ ¿Es apropiada la dificultad?
  readonly tooEasy: number;            // 😴 % que consideran muy fácil
  readonly justRight: number;          // 👍 % que consideran apropiada
  readonly tooHard: number;            // 😰 % que consideran muy difícil
  readonly suggestions: string[];      // 💡 Sugerencias de mejora
}

/**
 * 📈 Datos de popularidad
 * Tendencia de uso a lo largo del tiempo
 */
export interface PopularityData {
  readonly date: Date;                 // 📅 Fecha del dato
  readonly sessions: number;           // 🎯 Sesiones en esa fecha
  readonly uniquePlayers: number;      // 👥 Jugadores únicos
  readonly averageRating: number;      // ⭐ Calificación promedio
}

/**
 * 🎓 Reporte de rendimiento del estudiante
 * Análisis completo del progreso individual
 */
export interface StudentPerformanceReport {
  readonly studentId: string;          // 👤 ID del estudiante
  readonly period: ReportPeriod;       // 📅 Período del reporte
  readonly gamesPlayed: GameSummary[]; // 🎮 Resumen de juegos jugados
  readonly overallProgress: OverallProgress; // 📊 Progreso general
  readonly strengths: string[];        // 💪 Fortalezas identificadas
  readonly improvements: string[];     // 🚀 Áreas de mejora
  readonly recommendations: Recommendation[]; // 💡 Recomendaciones personalizadas
  readonly parentSummary: string;      // 👨‍👩‍👧‍👦 Resumen para padres
}

/**
 * 📅 Período de reporte
 * Rango temporal para el análisis
 */
export interface ReportPeriod {
  readonly startDate: Date;            // 📅 Fecha de inicio
  readonly endDate: Date;              // 📅 Fecha de fin
  readonly label: string;              // 📝 Etiqueta del período
}

/**
 * 🎮 Resumen de juego jugado
 * Información condensada de un juego específico
 */
export interface GameSummary {
  readonly gameInfo: BaseGame;         // 🎮 Información del juego
  readonly sessionsPlayed: number;     // 🎯 Sesiones jugadas
  readonly bestScore: number;          // 🏆 Mejor puntuación
  readonly averageScore: number;       // 📊 Puntuación promedio
  readonly totalTime: number;          // ⏱️ Tiempo total jugado
  readonly masteryLevel: number;       // 🎓 Nivel de dominio (0-100)
  readonly lastPlayed: Date;           // 📅 Última vez jugado
}

/**
 * 📊 Progreso general del estudiante
 * Métricas consolidadas de todo el aprendizaje
 */
export interface OverallProgress {
  readonly totalGamesPlayed: number;   // 🎮 Total de juegos diferentes
  readonly totalSessions: number;      // 🎯 Total de sesiones
  readonly totalTimeSpent: number;     // ⏱️ Tiempo total (horas)
  readonly averageScore: number;       // 🏆 Puntuación promedio general
  readonly subjectProgress: SubjectProgress[]; // 📚 Progreso por materia
  readonly skillsProgress: SkillProgress[]; // 🧠 Progreso por habilidad
  readonly learningVelocity: number;   // 🚀 Velocidad de aprendizaje
  readonly consistency: number;        // 📈 Consistencia (0-100)
}

/**
 * 📚 Progreso por materia
 * Avance específico en cada área de conocimiento
 */
export interface SubjectProgress {
  readonly subject: Subject;           // 📚 Materia específica
  readonly level: EducationLevel;      // 🎓 Nivel educativo
  readonly progress: number;           // 📊 Progreso (0-100)
  readonly gamesCompleted: number;     // ✅ Juegos completados
  readonly averageScore: number;       // 🏆 Puntuación promedio
  readonly timeSpent: number;          // ⏱️ Tiempo dedicado (horas)
  readonly masteredTopics: string[];   // 🎯 Temas dominados
  readonly strugglingTopics: string[]; // 😰 Temas con dificultad
}

/**
 * 🧠 Progreso por habilidad
 * Desarrollo de competencias específicas
 */
export interface SkillProgress {
  readonly skillName: string;          // 🧠 Nombre de la habilidad
  readonly category: string;           // 📂 Categoría de la habilidad
  readonly level: number;              // 📊 Nivel actual (0-100)
  readonly gamesContributing: string[]; // 🎮 Juegos que desarrollan esta habilidad
  readonly improvementRate: number;    // 📈 Tasa de mejora
  readonly lastImprovement: Date;      // 📅 Última mejora registrada
}

/**
 * 💡 Recomendación personalizada
 * Sugerencia específica para el estudiante
 */
export interface Recommendation {
  readonly type: 'game' | 'practice' | 'review' | 'break'; // 🎯 Tipo de recomendación
  readonly priority: 'low' | 'medium' | 'high';           // 🚨 Prioridad
  readonly title: string;              // 📝 Título de la recomendación
  readonly description: string;        // 📄 Descripción detallada
  readonly actionItems: string[];      // ✅ Elementos de acción
  readonly expectedBenefit: string;    // 🎯 Beneficio esperado
  readonly timeEstimate: number;       // ⏱️ Tiempo estimado (minutos)
  readonly gameId?: string;            // 🎮 ID del juego recomendado (si aplica)
}

// ============================================================================
// 🎮 INTERFACES PARA CONFIGURACIÓN DE JUEGOS
// ============================================================================

/**
 * ⚙️ Configuración de juego
 * Ajustes personalizables para cada tipo de juego
 */
export interface GameConfiguration {
  readonly gameId: string;             // 🎮 ID del juego
  readonly playerSettings: PlayerSettings; // 👤 Configuración del jugador
  readonly gameplaySettings: GameplaySettings; // 🎯 Configuración de jugabilidad
  readonly accessibilitySettings: AccessibilitySettings; // ♿ Configuración de accesibilidad
  readonly assessmentSettings: AssessmentSettings; // 📊 Configuración de evaluación
}

/**
 * 👤 Configuración del jugador
 * Ajustes específicos del estudiante
 */
export interface PlayerSettings {
  readonly showTimer: boolean;         // ⏱️ ¿Mostrar cronómetro?
  readonly allowPause: boolean;        // ⏸️ ¿Permitir pausar?
  readonly soundEnabled: boolean;      // 🔊 ¿Habilitar sonido?
  readonly animationsEnabled: boolean; // 🎨 ¿Habilitar animaciones?
  readonly hints: HintSettings;        // 💡 Configuración de pistas
  readonly feedback: FeedbackSettings; // 💬 Configuración de retroalimentación
}

/**
 * 💡 Configuración de pistas
 * Control sobre el sistema de ayuda
 */
export interface HintSettings {
  readonly enabled: boolean;           // ✅ ¿Pistas habilitadas?
  readonly maxHints: number;           // 🔢 Máximo de pistas permitidas
  readonly penaltyPerHint: number;     // 📉 Penalización por pista
  readonly cooldownTime: number;       // ⏱️ Tiempo entre pistas (segundos)
  readonly adaptiveHints: boolean;     // 🧠 ¿Pistas adaptativas?
}

/**
 * 💬 Configuración de retroalimentación
 * Control sobre cómo se muestra el feedback
 */
export interface FeedbackSettings {
  readonly immediate: boolean;         // ⚡ ¿Feedback inmediato?
  readonly showCorrectAnswer: boolean; // ✅ ¿Mostrar respuesta correcta?
  readonly showExplanation: boolean;   // 💡 ¿Mostrar explicación?
  readonly encouragementMessages: boolean; // 💪 ¿Mensajes de ánimo?
  readonly detailedReports: boolean;   // 📊 ¿Reportes detallados?
}

/**
 * 🎯 Configuración de jugabilidad
 * Ajustes que afectan la mecánica del juego
 */
export interface GameplaySettings {
  readonly difficulty: DifficultyLevel; // 📊 Nivel de dificultad
  readonly adaptiveDifficulty: boolean; // 🧠 ¿Dificultad adaptativa?
  readonly randomization: RandomizationSettings; // 🔀 Configuración de aleatorización
  readonly timeSettings: TimeSettings; // ⏱️ Configuración de tiempo
  readonly scoring: ScoringSettings;   // 🏆 Configuración de puntuación
}

/**
 * 🔀 Configuración de aleatorización
 * Control sobre elementos aleatorios del juego
 */
export interface RandomizationSettings {
  readonly randomizeQuestions: boolean; // ❓ ¿Aleatorizar preguntas?
  readonly randomizeAnswers: boolean;   // 📋 ¿Aleatorizar respuestas?
  readonly randomizeOrder: boolean;     // 🔢 ¿Aleatorizar orden?
  readonly seed?: number;              // 🌱 Semilla para reproducibilidad
}

/**
 * ⏱️ Configuración de tiempo
 * Ajustes relacionados con límites temporales
 */
export interface TimeSettings {
  readonly globalTimeLimit: number;    // 🕰️ Límite global (minutos)
  readonly questionTimeLimit: number;  // ❓ Límite por pregunta (segundos)
  readonly warningTime: number;        // ⚠️ Aviso antes de tiempo límite
  readonly gracePeriod: number;        // 🙏 Período de gracia (segundos)
  readonly pauseEnabled: boolean;      // ⏸️ ¿Permitir pausar?
}

/**
 * 🏆 Configuración de puntuación
 * Ajustes del sistema de puntos
 */
export interface ScoringSettings {
  readonly basePoints: number;         // 🎯 Puntos base por respuesta correcta
  readonly timeBonus: boolean;         // ⚡ ¿Bonificación por velocidad?
  readonly streakBonus: boolean;       // 🔥 ¿Bonificación por racha?
  readonly penaltyForWrong: number;    // ❌ Penalización por respuesta incorrecta
  readonly penaltyForHints: number;    // 💡 Penalización por usar pistas
  readonly multipliers: ScoreMultiplier[]; // ✨ Multiplicadores especiales
}

/**
 * ✨ Multiplicador de puntuación
 * Bonificaciones especiales en la puntuación
 */
export interface ScoreMultiplier {
  readonly condition: string;          // 🎯 Condición para activar
  readonly multiplier: number;         // ✨ Factor multiplicador
  readonly description: string;        // 📄 Descripción del multiplicador
}

/**
 * ♿ Configuración de accesibilidad
 * Ajustes para usuarios con necesidades especiales
 */
export interface AccessibilitySettings {
  readonly fontSize: 'small' | 'medium' | 'large' | 'extra-large'; // 📝 Tamaño de fuente
  readonly highContrast: boolean;      // ⚫⚪ ¿Alto contraste?
  readonly screenReader: boolean;      // 🔊 ¿Compatible con lector de pantalla?
  readonly keyboardNavigation: boolean; // ⌨️ ¿Navegación por teclado?
  readonly reducedMotion: boolean;     // 🎨 ¿Movimiento reducido?
  readonly audioDescriptions: boolean; // 🎵 ¿Descripciones de audio?
  readonly alternativeFormats: boolean; // 📄 ¿Formatos alternativos?
}

/**
 * 📊 Configuración de evaluación
 * Ajustes para la evaluación y assessment
 */
export interface AssessmentSettings {
  readonly rubric: AssessmentRubric;   // 📋 Rúbrica de evaluación
  readonly competencyMapping: CompetencyMapping[]; // 🎓 Mapeo de competencias
  readonly reportGeneration: ReportSettings; // 📊 Configuración de reportes
  readonly adaptiveAssessment: boolean; // 🧠 ¿Evaluación adaptativa?
}

/**
 * 📋 Rúbrica de evaluación
 * Criterios específicos para evaluar el desempeño
 */
export interface AssessmentRubric {
  readonly criteria: AssessmentCriterion[]; // 📊 Criterios de evaluación
  readonly scale: ScaleDefinition;     // 📏 Definición de escala
  readonly weightings: CriterionWeight[]; // ⚖️ Pesos de criterios
}

/**
 * 📊 Criterio de evaluación
 * Aspecto específico a evaluar
 */
export interface AssessmentCriterion {
  readonly id: string;                 // 🆔 Identificador único
  readonly name: string;               // 📝 Nombre del criterio
  readonly description: string;        // 📄 Descripción detallada
  readonly levels: PerformanceLevel[]; // 📊 Niveles de desempeño
  readonly examples: string[];         // 💡 Ejemplos específicos
}

/**
 * 📊 Nivel de desempeño
 * Grado específico de dominio en un criterio
 */
export interface PerformanceLevel {
  readonly level: number;              // 🔢 Número del nivel
  readonly label: string;              // 📝 Etiqueta del nivel
  readonly description: string;        // 📄 Descripción del nivel
  readonly pointRange: [number, number]; // 🎯 Rango de puntos
}

/**
 * 📏 Definición de escala
 * Sistema de puntuación usado
 */
export interface ScaleDefinition {
  readonly type: 'numeric' | 'letter' | 'descriptive'; // 📊 Tipo de escala
  readonly min: number;                // 📉 Valor mínimo
  readonly max: number;                // 📈 Valor máximo
  readonly increments: number;         // 📏 Incrementos permitidos
  readonly labels?: string[];          // 📝 Etiquetas (si aplica)
}

/**
 * ⚖️ Peso de criterio
 * Importancia relativa de cada criterio
 */
export interface CriterionWeight {
  readonly criterionId: string;        // 🆔 ID del criterio
  readonly weight: number;             // ⚖️ Peso (0-1)
  readonly justification: string;      // 💭 Justificación del peso
}

/**
 * 🎓 Mapeo de competencias
 * Relación entre juegos y competencias educativas
 */
export interface CompetencyMapping {
  readonly competencyId: string;       // 🎓 ID de la competencia
  readonly competencyName: string;     // 📝 Nombre de la competencia
  readonly gameElements: string[];     // 🎮 Elementos del juego que la desarrollan
  readonly assessmentMethods: string[]; // 📊 Métodos de evaluación
  readonly evidenceTypes: string[];    // 🔍 Tipos de evidencia requerida
}

/**
 * 📊 Configuración de reportes
 * Ajustes para la generación de informes
 */
export interface ReportSettings {
  readonly frequency: 'immediate' | 'daily' | 'weekly' | 'monthly'; // 📅 Frecuencia
  readonly recipients: ReportRecipient[]; // 👥 Destinatarios
  readonly format: 'pdf' | 'html' | 'json' | 'csv'; // 📄 Formato
  readonly includeDetails: boolean;    // 📋 ¿Incluir detalles?
  readonly includeRecommendations: boolean; // 💡 ¿Incluir recomendaciones?
  readonly language: string;           // 🌐 Idioma del reporte
}

/**
 * 👥 Destinatario de reporte
 * Persona que recibe informes de progreso
 */
export interface ReportRecipient {
  readonly type: 'student' | 'teacher' | 'parent' | 'administrator'; // 👤 Tipo de destinatario
  readonly userId: string;             // 🆔 ID del usuario
  readonly email: string;              // 📧 Email para envío
  readonly preferences: ReportPreferences; // ⚙️ Preferencias específicas
}

/**
 * ⚙️ Preferencias de reporte
 * Configuración específica por destinatario
 */
export interface ReportPreferences {
  readonly detailLevel: 'summary' | 'detailed' | 'comprehensive'; // 📊 Nivel de detalle
  readonly focusAreas: string[];       // 🎯 Áreas de enfoque
  readonly excludeAreas: string[];     // ❌ Áreas a excluir
  readonly includeComparisons: boolean; // 📊 ¿Incluir comparaciones?
  readonly visualizations: boolean;    // 📈 ¿Incluir gráficos?
}

// ============================================================================
// 🔧 TIPOS DE UTILIDAD Y AUXILIARES
// ============================================================================

/**
 * 🎮 Unión de todos los tipos de juegos
 * Permite trabajar con cualquier tipo de juego de forma polimórfica
 */
export type AnyGame = TriviaGame | CrosswordGame | SimulationGame;

/**
 * 📊 Estado de carga para componentes
 * Estado común para operaciones asíncronas
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * 🎯 Resultado de operación
 * Patrón común para resultados de funciones
 */
export type OperationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: any;
};

/**
 * 📝 Opciones de filtrado para juegos
 * Permite búsqueda y filtrado avanzado
 */
export interface GameFilterOptions {
  readonly subjects?: Subject[];       // 📚 Filtrar por materias
  readonly types?: GameType[];         // 🎮 Filtrar por tipos
  readonly difficulties?: DifficultyLevel[]; // 📊 Filtrar por dificultad
  readonly educationLevels?: EducationLevel[]; // 🎓 Filtrar por nivel
  readonly tags?: string[];            // 🏷️ Filtrar por etiquetas
  readonly searchTerm?: string;        // 🔍 Término de búsqueda
  readonly createdBy?: string;         // 👨‍🏫 Filtrar por creador
  readonly isActive?: boolean;         // ✅ Filtrar por estado activo
  readonly minDuration?: number;       // ⏱️ Duración mínima
  readonly maxDuration?: number;       // ⏱️ Duración máxima
}

/**
 * 📊 Opciones de ordenamiento
 * Diferentes criterios para ordenar resultados
 */
export interface SortOptions {
  readonly field: 'title' | 'createdAt' | 'difficulty' | 'popularity' | 'rating'; // 📊 Campo de ordenamiento
  readonly direction: 'asc' | 'desc';  // ↕️ Dirección del ordenamiento
}

/**
 * 📄 Opciones de paginación
 * Control de páginas en listados grandes
 */
export interface PaginationOptions {
  readonly page: number;               // 📄 Página actual (base 1)
  readonly limit: number;              // 🔢 Elementos por página
  readonly offset: number;             // 📍 Desplazamiento
}

/**
 * 📋 Respuesta paginada
 * Estructura estándar para resultados paginados
 */
export interface PaginatedResponse<T> {
  readonly items: T[];                 // 📋 Elementos de la página actual
  readonly total: number;              // 🔢 Total de elementos
  readonly page: number;               // 📄 Página actual
  readonly limit: number;              // 🔢 Elementos por página
  readonly totalPages: number;         // 📚 Total de páginas
  readonly hasNext: boolean;           // ➡️ ¿Hay página siguiente?
  readonly hasPrev: boolean;           // ⬅️ ¿Hay página anterior?
}

// ============================================================================
// 📱 INTERFACES PARA RESPONSIVE DESIGN
// ============================================================================

/**
 * 📱 Configuración responsive
 * Ajustes para diferentes tamaños de pantalla
 */
export interface ResponsiveConfiguration {
  readonly mobile: DeviceConfiguration;   // 📱 Configuración para móviles
  readonly tablet: DeviceConfiguration;   // 📱 Configuración para tablets
  readonly desktop: DeviceConfiguration;  // 🖥️ Configuración para desktop
}

/**
 * 📱 Configuración por dispositivo
 * Ajustes específicos según el tipo de dispositivo
 */
export interface DeviceConfiguration {
  readonly layout: 'single-column' | 'multi-column' | 'grid'; // 📐 Diseño de layout
  readonly fontSize: number;           // 📝 Tamaño base de fuente
  readonly buttonSize: 'small' | 'medium' | 'large'; // 🔘 Tamaño de botones
  readonly spacing: number;            // 📏 Espaciado base
  readonly gesturesEnabled: boolean;   // 👆 ¿Gestos habilitados?
  readonly touchOptimized: boolean;    // 👆 ¿Optimizado para touch?
}

// ============================================================================
// 🎯 EXPORTACIONES PRINCIPALES
// ============================================================================

// Los tipos ya están exportados individualmente arriba, no necesitamos re-exportar