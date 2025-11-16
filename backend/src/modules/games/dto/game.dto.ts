/**
 * 🎮 DTOs PARA SISTEMA DE JUEGOS EDUCATIVOS
 * 
 * Data Transfer Objects para la gestión completa de juegos educativos.
 * Incluye validación robusta y documentación Swagger.
 * 
 * FUNCIONALIDADES CUBIERTAS:
 * - Creación y edición de juegos
 * - Gestión de sesiones multijugador
 * - Resultados y estadísticas
 * - Filtros y consultas
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  IsDateString,
  IsInt,
  Min,
  Max,
  Length,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsPositive,
  IsUrl,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Importar enums
import { GameType, GameStatus, DifficultyLevel, GameMode } from '../entities/game.entity';
import { GameResultStatus, CompletionType } from '../entities/game-result.entity';
import { SessionStatus, SessionType, JoinMode } from '../entities/game-session.entity';

// =============================================================================
// DTOs DE CONFIGURACIÓN DE JUEGO
// =============================================================================

/**
 * 🎯 Configuración específica para Trivia
 */
export class TriviaConfigDto {
  @ApiProperty({ description: 'Número de preguntas por partida', minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  questionsPerGame: number;

  @ApiProperty({ description: 'Usar formato de selección múltiple' })
  @IsBoolean()
  multipleChoice: boolean;

  @ApiProperty({ description: 'Mostrar respuesta correcta al fallar' })
  @IsBoolean()
  showCorrectAnswer: boolean;

  @ApiProperty({ description: 'Incluir explicaciones de respuestas' })
  @IsBoolean()
  explanations: boolean;
}

/**
 * 🧩 Configuración específica para Crucigramas
 */
export class CrosswordConfigDto {
  @ApiProperty({ description: 'Tamaño de la cuadrícula' })
  @ValidateNested()
  @Type(() => Object)
  gridSize: { width: number; height: number };

  @ApiProperty({ description: 'Mostrar números de pistas' })
  @IsBoolean()
  showClueNumbers: boolean;

  @ApiProperty({ description: 'Permitir verificación de palabras' })
  @IsBoolean()
  allowChecking: boolean;

  @ApiProperty({ description: 'Revelar letras como pista' })
  @IsBoolean()
  revealLetters: boolean;
}

/**
 * 🧠 Configuración específica para Juegos de Memoria
 */
export class MemoryConfigDto {
  @ApiProperty({ description: 'Número de pares de cartas', minimum: 4, maximum: 50 })
  @IsInt()
  @Min(4)
  @Max(50)
  cardPairs: number;

  @ApiProperty({ description: 'Tiempo de visualización en segundos', minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  flipTime: number;

  @ApiProperty({ description: 'Tipo de contenido de matching', enum: ['image', 'text', 'mixed'] })
  @IsEnum(['image', 'text', 'mixed'])
  matchingType: 'image' | 'text' | 'mixed';
}

/**
 * 🎲 Configuración específica para Simulaciones
 */
export class SimulationConfigDto {
  @ApiProperty({ description: 'Escenarios disponibles', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  scenarios: string[];

  @ApiProperty({ description: 'Puntos de decisión por escenario', minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  decisionPoints: number;

  @ApiProperty({ description: 'Actualizaciones en tiempo real' })
  @IsBoolean()
  realTimeUpdates: boolean;
}

/**
 * ⚙️ Configuración general de juego
 */
export class GameConfigDto {
  @ApiPropertyOptional({ description: 'Tiempo límite en segundos', minimum: 30, maximum: 3600 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Permitir pausar el juego' })
  @IsOptional()
  @IsBoolean()
  allowPause?: boolean;

  @ApiPropertyOptional({ description: 'Mostrar pistas durante el juego' })
  @IsOptional()
  @IsBoolean()
  showHints?: boolean;

  @ApiPropertyOptional({ description: 'Aleatorizar preguntas' })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @ApiPropertyOptional({ description: 'Puntos base por respuesta correcta', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  basePoints?: number;

  @ApiPropertyOptional({ description: 'Bonificación por tiempo' })
  @IsOptional()
  @IsBoolean()
  timeBonus?: boolean;

  @ApiPropertyOptional({ description: 'Bonificación por racha' })
  @IsOptional()
  @IsBoolean()
  streakBonus?: boolean;

  @ApiPropertyOptional({ description: 'Penalización por respuesta incorrecta', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  penaltyForWrong?: number;

  @ApiPropertyOptional({ description: 'Configuración específica para Trivia' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TriviaConfigDto)
  triviaConfig?: TriviaConfigDto;

  @ApiPropertyOptional({ description: 'Configuración específica para Crucigrama' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CrosswordConfigDto)
  crosswordConfig?: CrosswordConfigDto;

  @ApiPropertyOptional({ description: 'Configuración específica para Memoria' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MemoryConfigDto)
  memoryConfig?: MemoryConfigDto;

  @ApiPropertyOptional({ description: 'Configuración específica para Simulación' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SimulationConfigDto)
  simulationConfig?: SimulationConfigDto;
}

/**
 * 🏆 Sistema de recompensas
 */
export class RewardSystemDto {
  @ApiProperty({ description: 'Monedas por respuesta correcta', minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  coinsPerCorrect: number;

  @ApiProperty({ description: 'Monedas por completar juego', minimum: 1, maximum: 5000 })
  @IsInt()
  @Min(1)
  @Max(5000)
  coinsPerCompletion: number;

  @ApiProperty({ description: 'Experiencia por respuesta correcta', minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  experiencePerCorrect: number;

  @ApiProperty({ description: 'Experiencia por completar juego', minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  experiencePerCompletion: number;

  @ApiPropertyOptional({ description: 'IDs de logros asociados', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievementIds?: string[];

  @ApiProperty({ description: 'Multiplicadores de bonificación' })
  @ValidateNested()
  @Type(() => Object)
  bonusMultipliers: {
    perfectScore: number;
    fastCompletion: number;
    streak: number;
  };
}

// =============================================================================
// DTOs PRINCIPALES DE JUEGO
// =============================================================================

/**
 * 🎮 DTO para crear un nuevo juego
 */
export class CreateGameDto {
  @ApiProperty({ description: 'Título del juego', minLength: 3, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @Length(3, 200)
  title: string;

  @ApiPropertyOptional({ description: 'Descripción del juego', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiProperty({ description: 'Tipo de juego', enum: GameType })
  @IsEnum(GameType)
  type: GameType;

  @ApiProperty({ description: 'Nivel de dificultad', enum: DifficultyLevel })
  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Modo de juego', enum: GameMode })
  @IsOptional()
  @IsEnum(GameMode)
  mode?: GameMode;

  @ApiPropertyOptional({ description: 'ID del aula asociada' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'Materia o tema del juego', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  subject?: string;

  @ApiPropertyOptional({ description: 'Etiquetas del juego', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ description: 'URL de la imagen de portada' })
  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @ApiProperty({ description: 'Configuración del juego' })
  @ValidateNested()
  @Type(() => GameConfigDto)
  config: GameConfigDto;

  @ApiProperty({ description: 'Contenido del juego (preguntas, datos, etc.)' })
  @IsObject()
  content: any;

  @ApiPropertyOptional({ description: 'Sistema de recompensas' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RewardSystemDto)
  rewards?: RewardSystemDto;

  @ApiPropertyOptional({ description: 'Tiempo estimado en minutos', minimum: 1, maximum: 300 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Puntuación máxima posible', minimum: 100, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(100000)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Puntuación mínima para aprobar', minimum: 0, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Número máximo de intentos', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Permitir comentarios' })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional({ description: 'Juego público' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

/**
 * ✏️ DTO para actualizar un juego existente
 */
export class UpdateGameDto {
  @ApiPropertyOptional({ description: 'Título del juego', minLength: 3, maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(3, 200)
  title?: string;

  @ApiPropertyOptional({ description: 'Descripción del juego', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Estado del juego', enum: GameStatus })
  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @ApiPropertyOptional({ description: 'Nivel de dificultad', enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Modo de juego', enum: GameMode })
  @IsOptional()
  @IsEnum(GameMode)
  mode?: GameMode;

  @ApiPropertyOptional({ description: 'Materia o tema del juego', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  subject?: string;

  @ApiPropertyOptional({ description: 'Etiquetas del juego', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ description: 'URL de la imagen de portada' })
  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @ApiPropertyOptional({ description: 'Configuración del juego' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GameConfigDto)
  config?: GameConfigDto;

  @ApiPropertyOptional({ description: 'Contenido del juego' })
  @IsOptional()
  @IsObject()
  content?: any;

  @ApiPropertyOptional({ description: 'Sistema de recompensas' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RewardSystemDto)
  rewards?: RewardSystemDto;

  @ApiPropertyOptional({ description: 'Tiempo estimado en minutos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Puntuación máxima posible' })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(100000)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Puntuación mínima para aprobar' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Número máximo de intentos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Permitir comentarios' })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional({ description: 'Juego público' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Juego destacado' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

// =============================================================================
// DTOs DE CONSULTA Y FILTROS
// =============================================================================

/**
 * 🔍 DTO para filtrar juegos
 */
export class GameFilterDto {
  @ApiPropertyOptional({ description: 'Tipo de juego', enum: GameType })
  @IsOptional()
  @IsEnum(GameType)
  type?: GameType;

  @ApiPropertyOptional({ description: 'Estado del juego', enum: GameStatus })
  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @ApiPropertyOptional({ description: 'Nivel de dificultad', enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Modo de juego', enum: GameMode })
  @IsOptional()
  @IsEnum(GameMode)
  mode?: GameMode;

  @ApiPropertyOptional({ description: 'ID del creador' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'ID del aula' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'Materia o tema' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Solo juegos públicos' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Solo juegos destacados' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Etiquetas a incluir', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Calificación mínima', minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Duración máxima en minutos', minimum: 1, maximum: 300 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'Término de búsqueda', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  search?: string;

  @ApiPropertyOptional({ description: 'Ordenar por campo', enum: ['title', 'createdAt', 'updatedAt', 'playCount', 'averageRating'] })
  @IsOptional()
  @IsString()
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'playCount' | 'averageRating';

  @ApiPropertyOptional({ description: 'Orden de clasificación', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Página actual', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}

// =============================================================================
// DTOs DE RESPUESTA
// =============================================================================

/**
 * 📊 DTO de respuesta para juego
 */
export class GameResponseDto {
  @ApiProperty({ description: 'ID único del juego' })
  id: string;

  @ApiProperty({ description: 'Título del juego' })
  title: string;

  @ApiProperty({ description: 'Descripción del juego' })
  description: string;

  @ApiProperty({ description: 'Tipo de juego', enum: GameType })
  type: GameType;

  @ApiProperty({ description: 'Estado del juego', enum: GameStatus })
  status: GameStatus;

  @ApiProperty({ description: 'Nivel de dificultad', enum: DifficultyLevel })
  difficulty: DifficultyLevel;

  @ApiProperty({ description: 'Texto de dificultad' })
  difficultyText: string;

  @ApiProperty({ description: 'Modo de juego', enum: GameMode })
  mode: GameMode;

  @ApiProperty({ description: 'ID del creador' })
  createdBy: string;

  @ApiProperty({ description: 'ID del aula asociada' })
  classroomId: string;

  @ApiProperty({ description: 'Materia o tema' })
  subject: string;

  @ApiProperty({ description: 'Etiquetas', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'URL de imagen de portada' })
  thumbnail: string;

  @ApiProperty({ description: 'Configuración del juego' })
  config: any;

  @ApiProperty({ description: 'Contenido del juego' })
  content: any;

  @ApiProperty({ description: 'Sistema de recompensas' })
  rewards: any;

  @ApiProperty({ description: 'Estadísticas del juego' })
  stats: any;

  @ApiProperty({ description: 'Duración estimada en minutos' })
  estimatedDuration: number;

  @ApiProperty({ description: 'Puntuación máxima' })
  maxScore: number;

  @ApiProperty({ description: 'Puntuación para aprobar' })
  passingScore: number;

  @ApiProperty({ description: 'Intentos máximos permitidos' })
  maxAttempts: number;

  @ApiProperty({ description: 'Calificación promedio' })
  averageRating: number;

  @ApiProperty({ description: 'Número de veces jugado' })
  playCount: number;

  @ApiProperty({ description: 'Número de "me gusta"' })
  likes: number;

  @ApiProperty({ description: 'Permitir comentarios' })
  allowComments: boolean;

  @ApiProperty({ description: 'Es público' })
  isPublic: boolean;

  @ApiProperty({ description: 'Es destacado' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Fecha de publicación' })
  publishedAt: Date;

  @ApiProperty({ description: 'Color representativo' })
  typeColor: string;

  @ApiProperty({ description: 'Emoji representativo' })
  typeEmoji: string;

  @ApiProperty({ description: 'Disponible para jugar' })
  isPlayable: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: Date;
}

/**
 * 📃 DTO de respuesta paginada para juegos
 */
export class GamePaginatedResponseDto {
  @ApiProperty({ description: 'Lista de juegos', type: [GameResponseDto] })
  data: GameResponseDto[];

  @ApiProperty({ description: 'Total de elementos' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ description: 'Hay página siguiente' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Hay página anterior' })
  hasPrevPage: boolean;
}