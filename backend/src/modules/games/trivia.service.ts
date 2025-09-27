import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, QuestionType } from './question.entity';
import { Game, Subject, DifficultyLevel, EducationLevel } from './game.entity';
import { GameResult, GameStatus } from './game-result.entity';

export interface TriviaQuestionDto {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  points?: number;
  timeLimit?: number;
  subject: Subject;
  difficulty: DifficultyLevel;
  educationLevel: EducationLevel;
  tags?: string[];
}

export interface TriviaSessionData {
  currentQuestionIndex: number;
  questionIds: string[];
  answers: Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    pointsEarned: number;
  }>;
  totalScore: number;
  startTime: Date;
}

@Injectable()
export class TriviaService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameResult)
    private readonly gameResultRepository: Repository<GameResult>,
  ) {}

  /**
   * Crear una pregunta de trivia
   */
  async createTriviaQuestion(gameId: string, questionDto: TriviaQuestionDto): Promise<Question> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    if (game.type !== 'trivia') {
      throw new BadRequestException('Este juego no es de tipo trivia');
    }

    const question = this.questionRepository.create({
      ...questionDto,
      gameId,
      type: QuestionType.MULTIPLE_CHOICE,
      points: questionDto.points || 10,
    });

    return await this.questionRepository.save(question);
  }

  /**
   * Obtener preguntas de trivia para un juego
   */
  async getTriviaQuestions(
    gameId: string,
    limit: number = 10,
    difficulty?: DifficultyLevel,
    excludeUsed?: string[]
  ): Promise<Question[]> {
    const queryBuilder = this.questionRepository.createQueryBuilder('question')
      .where('question.gameId = :gameId', { gameId })
      .andWhere('question.type IN (:...types)', { 
        types: [QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE] 
      })
      .andWhere('question.isActive = :isActive', { isActive: true });

    if (difficulty) {
      queryBuilder.andWhere('question.difficulty = :difficulty', { difficulty });
    }

    if (excludeUsed && excludeUsed.length > 0) {
      queryBuilder.andWhere('question.id NOT IN (:...excludeUsed)', { excludeUsed });
    }

    queryBuilder.orderBy('RANDOM()').limit(limit);

    return await queryBuilder.getMany();
  }

  /**
   * Iniciar una sesión de trivia
   */
  async startTriviaSession(
    gameId: string,
    userId: string,
    questionCount: number = 10,
    difficulty?: DifficultyLevel
  ): Promise<{
    sessionId: string;
    questions: Array<{
      id: string;
      questionText: string;
      options: string[];
      points: number;
      timeLimit?: number;
    }>;
    totalQuestions: number;
    maxScore: number;
  }> {
    // Obtener preguntas aleatorias
    const questions = await this.getTriviaQuestions(gameId, questionCount, difficulty);
    
    if (questions.length === 0) {
      throw new BadRequestException('No hay preguntas disponibles para esta trivia');
    }

    // Crear sesión de juego
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    const gameResult = this.gameResultRepository.create({
      game: { id: gameId },
      user: { id: userId },
      maxScore,
      startedAt: new Date(),
      status: GameStatus.IN_PROGRESS,
      gameProgress: {
        currentQuestionIndex: 0,
        questionIds: questions.map(q => q.id),
        answers: [],
      },
    });

    const session = await this.gameResultRepository.save(gameResult);

    // Formatear preguntas para el frontend (sin respuestas correctas)
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: this.shuffleArray([...q.options]), // Mezclar opciones
      points: q.points,
      timeLimit: q.timeLimit,
    }));

    return {
      sessionId: session.id,
      questions: formattedQuestions,
      totalQuestions: questions.length,
      maxScore,
    };
  }

  /**
   * Procesar respuesta de trivia
   */
  async processTriviaAnswer(
    sessionId: string,
    userId: string,
    questionId: string,
    userAnswer: string,
    timeSpent: number
  ): Promise<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
    pointsEarned: number;
    currentScore: number;
    nextQuestion?: {
      id: string;
      questionText: string;
      options: string[];
      points: number;
      timeLimit?: number;
    };
    isComplete: boolean;
  }> {
    // Obtener la sesión
    const session = await this.gameResultRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    // Obtener la pregunta
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Pregunta no encontrada');
    }

    // Verificar respuesta
    const isCorrect = question.isCorrectAnswer(userAnswer);
    const pointsEarned = isCorrect ? question.points : 0;

    // Actualizar progreso de la sesión
    const gameProgress = session.gameProgress as TriviaSessionData;
    gameProgress.answers.push({
      questionId,
      userAnswer,
      isCorrect,
      timeSpent,
      pointsEarned,
    });

    gameProgress.currentQuestionIndex++;
    gameProgress.totalScore = (gameProgress.totalScore || 0) + pointsEarned;

    // Verificar si hay más preguntas
    const hasMoreQuestions = gameProgress.currentQuestionIndex < gameProgress.questionIds.length;
    let nextQuestion = null;

    if (hasMoreQuestions) {
      const nextQuestionId = gameProgress.questionIds[gameProgress.currentQuestionIndex];
      const nextQuestionData = await this.questionRepository.findOne({
        where: { id: nextQuestionId },
      });

      if (nextQuestionData) {
        nextQuestion = {
          id: nextQuestionData.id,
          questionText: nextQuestionData.questionText,
          options: this.shuffleArray([...nextQuestionData.options]),
          points: nextQuestionData.points,
          timeLimit: nextQuestionData.timeLimit,
        };
      }
    }

    // Actualizar sesión
    session.gameProgress = gameProgress;
    session.score = gameProgress.totalScore;
    session.correctAnswers = gameProgress.answers.filter(a => a.isCorrect).length;
    session.totalAnswers = gameProgress.answers.length;

    if (!hasMoreQuestions) {
      session.status = GameStatus.COMPLETED;
      session.completedAt = new Date();
      session.timeSpent = Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000);
      session.accuracy = session.calculateAccuracy();
    }

    await this.gameResultRepository.save(session);

    return {
      isCorrect,
      correctAnswer: question.correctAnswer as string,
      explanation: question.explanation,
      pointsEarned,
      currentScore: gameProgress.totalScore,
      nextQuestion,
      isComplete: !hasMoreQuestions,
    };
  }

  /**
   * Obtener resultado final de trivia
   */
  async getTriviaResult(sessionId: string, userId: string): Promise<{
    finalScore: number;
    maxScore: number;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent: number;
    grade: string;
    detailedAnswers: any[];
    achievements: string[];
  }> {
    const session = await this.gameResultRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const gameProgress = session.gameProgress as TriviaSessionData;
    const achievements = this.calculateAchievements(session);

    return {
      finalScore: session.score,
      maxScore: session.maxScore,
      accuracy: session.accuracy,
      totalQuestions: session.totalAnswers,
      correctAnswers: session.correctAnswers,
      timeSpent: session.timeSpent,
      grade: session.getGrade(),
      detailedAnswers: gameProgress.answers,
      achievements,
    };
  }

  /**
   * Obtener estadísticas de trivia por tema
   */
  async getTriviaStatsBySubject(userId: string): Promise<Record<Subject, {
    totalPlayed: number;
    averageScore: number;
    bestScore: number;
    averageAccuracy: number;
  }>> {
    const results = await this.gameResultRepository.createQueryBuilder('result')
      .leftJoin('result.game', 'game')
      .where('result.userId = :userId', { userId })
      .andWhere('game.type = :type', { type: 'trivia' })
      .andWhere('result.status = :status', { status: GameStatus.COMPLETED })
      .select([
        'game.subject as subject',
        'COUNT(*) as totalPlayed',
        'AVG(result.score) as averageScore',
        'MAX(result.score) as bestScore',
        'AVG(result.accuracy) as averageAccuracy',
      ])
      .groupBy('game.subject')
      .getRawMany();

    const stats = {} as any;
    
    for (const result of results) {
      stats[result.subject] = {
        totalPlayed: parseInt(result.totalplayed),
        averageScore: parseFloat(result.averagescore),
        bestScore: parseInt(result.bestscore),
        averageAccuracy: parseFloat(result.averageaccuracy),
      };
    }

    return stats;
  }

  /**
   * Mezclar array (Fisher-Yates shuffle)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Calcular logros basados en el desempeño
   */
  private calculateAchievements(session: GameResult): string[] {
    const achievements: string[] = [];
    const accuracy = session.accuracy;

    if (accuracy === 100) {
      achievements.push('PERFECT_SCORE');
    } else if (accuracy >= 90) {
      achievements.push('EXCELLENCE');
    } else if (accuracy >= 80) {
      achievements.push('GREAT_JOB');
    }

    // Logro por velocidad (si completó en menos del 50% del tiempo límite)
    const gameProgress = session.gameProgress as TriviaSessionData;
    if (gameProgress.answers.length > 0) {
      const avgTimePerQuestion = session.timeSpent / gameProgress.answers.length;
      if (avgTimePerQuestion < 30) { // Menos de 30 segundos por pregunta
        achievements.push('SPEED_DEMON');
      }
    }

    // Logro por racha de respuestas correctas
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const answer of gameProgress.answers) {
      if (answer.isCorrect) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    if (maxStreak >= 5) {
      achievements.push('HOT_STREAK');
    }

    return achievements;
  }
}
