import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameType, Subject, DifficultyLevel, EducationLevel } from './game.entity';
import { GameResult, GameStatus } from './game-result.entity';
import { Question } from './question.entity';

export interface CreateGameDto {
  title: string;
  description?: string;
  type: GameType;
  subject: Subject;
  difficulty: DifficultyLevel;
  educationLevel: EducationLevel;
  maxPoints?: number;
  timeLimit?: number;
  gameConfig?: Record<string, any>;
  tags?: string[];
  imageUrl?: string;
}

export interface UpdateGameDto {
  title?: string;
  description?: string;
  difficulty?: DifficultyLevel;
  maxPoints?: number;
  timeLimit?: number;
  gameConfig?: Record<string, any>;
  tags?: string[];
  imageUrl?: string;
  isActive?: boolean;
}

export interface GameFilters {
  type?: GameType;
  subject?: Subject;
  difficulty?: DifficultyLevel;
  educationLevel?: EducationLevel;
  isActive?: boolean;
  createdById?: string;
  tags?: string[];
  search?: string;
}

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameResult)
    private readonly gameResultRepository: Repository<GameResult>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  /**
   * Crear un nuevo juego
   */
  async createGame(createGameDto: CreateGameDto, createdById: string): Promise<Game> {
    const game = this.gameRepository.create({
      ...createGameDto,
      createdById,
      maxPoints: createGameDto.maxPoints || 100,
    });

    return await this.gameRepository.save(game);
  }

  /**
   * Obtener todos los juegos con filtros opcionales
   */
  async findAllGames(filters: GameFilters = {}): Promise<Game[]> {
    const queryBuilder = this.gameRepository.createQueryBuilder('game')
      .leftJoinAndSelect('game.createdBy', 'createdBy')
      .leftJoinAndSelect('game.questions', 'questions')
      .leftJoinAndSelect('game.results', 'results');

    // Aplicar filtros
    if (filters.type) {
      queryBuilder.andWhere('game.type = :type', { type: filters.type });
    }

    if (filters.subject) {
      queryBuilder.andWhere('game.subject = :subject', { subject: filters.subject });
    }

    if (filters.difficulty) {
      queryBuilder.andWhere('game.difficulty = :difficulty', { difficulty: filters.difficulty });
    }

    if (filters.educationLevel) {
      queryBuilder.andWhere('game.educationLevel = :educationLevel', { educationLevel: filters.educationLevel });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('game.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.createdById) {
      queryBuilder.andWhere('game.createdById = :createdById', { createdById: filters.createdById });
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('game.tags && :tags', { tags: filters.tags });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(game.title ILIKE :search OR game.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    queryBuilder.orderBy('game.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Obtener un juego por ID
   */
  async findGameById(id: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id },
      relations: ['createdBy', 'questions', 'results'],
    });

    if (!game) {
      throw new NotFoundException(`Juego con ID ${id} no encontrado`);
    }

    return game;
  }

  /**
   * Actualizar un juego
   */
  async updateGame(id: string, updateGameDto: UpdateGameDto, userId: string): Promise<Game> {
    const game = await this.findGameById(id);

    // Verificar que el usuario puede editar este juego
    if (game.createdById !== userId) {
      throw new BadRequestException('No tienes permisos para editar este juego');
    }

    Object.assign(game, updateGameDto);
    return await this.gameRepository.save(game);
  }

  /**
   * Eliminar un juego
   */
  async deleteGame(id: string, userId: string): Promise<void> {
    const game = await this.findGameById(id);

    // Verificar que el usuario puede eliminar este juego
    if (game.createdById !== userId) {
      throw new BadRequestException('No tienes permisos para eliminar este juego');
    }

    // Verificar que no hay resultados asociados
    const resultCount = await this.gameResultRepository.count({ where: { gameId: id } });
    if (resultCount > 0) {
      throw new BadRequestException('No se puede eliminar un juego que ya ha sido jugado');
    }

    await this.gameRepository.remove(game);
  }

  /**
   * Iniciar una sesión de juego
   */
  async startGameSession(gameId: string, userId: string): Promise<GameResult> {
    const game = await this.findGameById(gameId);

    if (!game.isActive) {
      throw new BadRequestException('Este juego no está disponible');
    }

    // Verificar si ya hay una sesión en progreso
    const existingSession = await this.gameResultRepository.findOne({
      where: {
        gameId,
        userId,
        status: GameStatus.IN_PROGRESS,
      },
    });

    if (existingSession) {
      return existingSession;
    }

    // Crear nueva sesión
    const gameResult = this.gameResultRepository.create({
      gameId,
      userId,
      maxScore: game.maxPoints,
      startedAt: new Date(),
      status: GameStatus.IN_PROGRESS,
    });

    return await this.gameResultRepository.save(gameResult);
  }

  /**
   * Finalizar una sesión de juego
   */
  async finishGameSession(
    sessionId: string,
    userId: string,
    finalData: {
      score: number;
      timeSpent: number;
      correctAnswers: number;
      totalAnswers: number;
      detailedAnswers: any[];
      gameProgress?: Record<string, any>;
    }
  ): Promise<GameResult> {
    const session = await this.gameResultRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Sesión de juego no encontrada');
    }

    if (session.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Esta sesión ya ha finalizado');
    }

    // Actualizar datos de la sesión
    session.score = finalData.score;
    session.timeSpent = finalData.timeSpent;
    session.correctAnswers = finalData.correctAnswers;
    session.totalAnswers = finalData.totalAnswers;
    session.detailedAnswers = finalData.detailedAnswers;
    session.gameProgress = finalData.gameProgress || {};
    session.accuracy = session.calculateAccuracy();
    session.completedAt = new Date();
    session.status = GameStatus.COMPLETED;

    return await this.gameResultRepository.save(session);
  }

  /**
   * Obtener estadísticas de un juego
   */
  async getGameStatistics(gameId: string): Promise<{
    totalPlays: number;
    averageScore: number;
    averageTime: number;
    completionRate: number;
    difficultyDistribution: Record<string, number>;
    recentResults: GameResult[];
  }> {
    const results = await this.gameResultRepository.find({
      where: { gameId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const completedResults = results.filter(r => r.status === GameStatus.COMPLETED);

    const stats = {
      totalPlays: results.length,
      averageScore: 0,
      averageTime: 0,
      completionRate: 0,
      difficultyDistribution: {} as Record<string, number>,
      recentResults: results.slice(0, 10),
    };

    if (completedResults.length > 0) {
      stats.averageScore = completedResults.reduce((sum, r) => sum + r.score, 0) / completedResults.length;
      stats.averageTime = completedResults.reduce((sum, r) => sum + r.timeSpent, 0) / completedResults.length;
      stats.completionRate = (completedResults.length / results.length) * 100;
    }

    return stats;
  }

  /**
   * Obtener juegos recomendados para un usuario
   */
  async getRecommendedGames(
    userId: string,
    educationLevel?: EducationLevel,
    subjects?: Subject[]
  ): Promise<Game[]> {
    const queryBuilder = this.gameRepository.createQueryBuilder('game')
      .leftJoinAndSelect('game.results', 'results', 'results.userId = :userId', { userId })
      .where('game.isActive = :isActive', { isActive: true });

    if (educationLevel) {
      queryBuilder.andWhere('game.educationLevel = :educationLevel', { educationLevel });
    }

    if (subjects && subjects.length > 0) {
      queryBuilder.andWhere('game.subject IN (:...subjects)', { subjects });
    }

    // Priorizar juegos no jugados
    queryBuilder.orderBy('CASE WHEN results.id IS NULL THEN 0 ELSE 1 END', 'ASC')
               .addOrderBy('game.createdAt', 'DESC');

    return await queryBuilder.limit(10).getMany();
  }

  /**
   * Buscar juegos por texto
   */
  async searchGames(searchTerm: string, filters: GameFilters = {}): Promise<Game[]> {
    return await this.findAllGames({
      ...filters,
      search: searchTerm,
    });
  }

  /**
   * Clonar un juego existente
   */
  async cloneGame(gameId: string, userId: string, newTitle?: string): Promise<Game> {
    const originalGame = await this.findGameById(gameId);
    
    const clonedGame = this.gameRepository.create({
      ...originalGame,
      id: undefined, // Generar nuevo ID
      title: newTitle || `${originalGame.title} (Copia)`,
      createdById: userId,
      createdAt: undefined,
      updatedAt: undefined,
    });

    const savedGame = await this.gameRepository.save(clonedGame);

    // Clonar preguntas asociadas
    if (originalGame.questions && originalGame.questions.length > 0) {
      const clonedQuestions = originalGame.questions.map(question => ({
        ...question,
        id: undefined,
        gameId: savedGame.id,
        game: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      }));

      await this.questionRepository.save(clonedQuestions);
    }

    return savedGame;
  }
}
