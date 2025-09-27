import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';
import { Simulation } from './simulation.entity';
import { GameResult, GameStatus } from './game-result.entity';

@Injectable()
export class SimulationService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Simulation)
    private simulationRepository: Repository<Simulation>,
    @InjectRepository(GameResult)
    private gameResultRepository: Repository<GameResult>
  ) {}

  /**
   * Iniciar simulación
   */
  async startSimulation(gameId: string, userId: string) {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const simulation = await this.simulationRepository.findOne({
      where: { game: { id: gameId } }
    });

    if (!simulation) {
      throw new NotFoundException('Simulación no encontrada');
    }

    const gameResult = this.gameResultRepository.create({
      game: { id: gameId },
      user: { id: userId },
      status: GameStatus.IN_PROGRESS,
      startedAt: new Date(),
      gameProgress: {
        currentScene: simulation.startingSceneId,
        choices: [],
        score: 0
      }
    });

    const session = await this.gameResultRepository.save(gameResult);

    return {
      sessionId: session.id,
      currentScene: simulation.getScene(simulation.startingSceneId),
      characters: simulation.characters,
      objectives: simulation.reflectionQuestions
    };
  }

  /**
   * Procesar elección en simulación
   */
  async processChoice(sessionId: string, choiceId: string) {
    const session = await this.gameResultRepository.findOne({
      where: { id: sessionId },
      relations: ['game']
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const simulation = await this.simulationRepository.findOne({
      where: { game: { id: session.game.id } }
    });

    if (!simulation) {
      throw new NotFoundException('Simulación no encontrada');
    }

    const progress = session.gameProgress as any;
    const result = simulation.processChoice(
      progress.currentScene, 
      choiceId, 
      progress.score
    );
    
    // Actualizar progreso
    progress.choices.push({
      choiceId,
      timestamp: new Date(),
      pointsEarned: result.pointsAwarded
    });
    progress.currentScene = result.nextScene?.id;
    progress.score += result.pointsAwarded;

    session.gameProgress = progress;

    if (result.isGameEnd) {
      session.status = GameStatus.COMPLETED;
      session.completedAt = new Date();
      session.score = progress.score;
    }

    await this.gameResultRepository.save(session);

    return {
      success: true,
      nextScene: result.nextScene,
      feedback: result.consequence,
      pointsEarned: result.pointsAwarded,
      isComplete: result.isGameEnd,
      totalScore: progress.score
    };
  }
}
