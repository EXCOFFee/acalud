import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResult, GameStatus } from './game-result.entity';
import { Game } from './game.entity';

@Injectable()
export class GameAnalyticsService {
  constructor(
    @InjectRepository(GameResult)
    private gameResultRepository: Repository<GameResult>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>
  ) {}

  /**
   * Obtener estadísticas de rendimiento por juego
   */
  async getGameStats(gameId: string) {
    const stats = await this.gameResultRepository
      .createQueryBuilder('result')
      .select([
        'COUNT(result.id) as totalPlays',
        'AVG(result.score) as averageScore',
        'AVG(EXTRACT(epoch FROM (result.completedAt - result.startedAt))/60) as avgTimeMinutes',
        'COUNT(CASE WHEN result.status = :completed THEN 1 END) as completedPlays'
      ])
      .where('result.gameId = :gameId', { gameId })
      .andWhere('result.status IN (:...statuses)', { 
        statuses: [GameStatus.COMPLETED, GameStatus.IN_PROGRESS] 
      })
      .setParameter('completed', GameStatus.COMPLETED)
      .getRawOne();

    return {
      totalPlays: parseInt(stats.totalPlays) || 0,
      averageScore: parseFloat(stats.averageScore) || 0,
      averageTimeMinutes: parseFloat(stats.avgTimeMinutes) || 0,
      completionRate: stats.totalPlays > 0 ? 
        (parseInt(stats.completedPlays) / parseInt(stats.totalPlays)) * 100 : 0
    };
  }

  /**
   * Obtener estadísticas de usuario
   */
  async getUserStats(userId: string) {
    const stats = await this.gameResultRepository
      .createQueryBuilder('result')
      .select([
        'COUNT(result.id) as totalGames',
        'AVG(result.score) as averageScore',
        'MAX(result.score) as bestScore',
        'COUNT(CASE WHEN result.status = :completed THEN 1 END) as completedGames'
      ])
      .where('result.userId = :userId', { userId })
      .setParameter('completed', GameStatus.COMPLETED)
      .getRawOne();

    return {
      totalGames: parseInt(stats.totalGames) || 0,
      averageScore: parseFloat(stats.averageScore) || 0,
      bestScore: parseInt(stats.bestScore) || 0,
      completedGames: parseInt(stats.completedGames) || 0
    };
  }

  /**
   * Obtener tendencias de rendimiento
   */
  async getPerformanceTrends(userId: string, gameId?: string) {
    let queryBuilder = this.gameResultRepository
      .createQueryBuilder('result')
      .select([
        'DATE(result.completedAt) as date',
        'AVG(result.score) as avgScore',
        'COUNT(result.id) as gamesPlayed'
      ])
      .where('result.userId = :userId', { userId })
      .andWhere('result.status = :completed', { completed: GameStatus.COMPLETED })
      .andWhere('result.completedAt >= :startDate', { 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // últimos 30 días
      });

    if (gameId) {
      queryBuilder = queryBuilder.andWhere('result.gameId = :gameId', { gameId });
    }

    const trends = await queryBuilder
      .groupBy('DATE(result.completedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return trends.map(trend => ({
      date: trend.date,
      averageScore: parseFloat(trend.avgScore) || 0,
      gamesPlayed: parseInt(trend.gamesPlayed) || 0
    }));
  }
}
