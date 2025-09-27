import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';
import { Question } from './question.entity';
import { GameResult, GameStatus } from './game-result.entity';
import { CrosswordPuzzle } from './crossword-puzzle.entity';

@Injectable()
export class CrosswordService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(GameResult)
    private gameResultRepository: Repository<GameResult>,
    @InjectRepository(CrosswordPuzzle)
    private crosswordRepository: Repository<CrosswordPuzzle>
  ) {}

  /**
   * Generar un crucigrama
   */
  async generateCrossword(gameId: string, words: string[], clues: string[]) {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const crossword = new CrosswordPuzzle();
    crossword.game = game;
    crossword.grid = {
      rows: 15,
      cols: 15,
      cells: this.createEmptyGrid(15, 15)
    };
    crossword.words = [];

    // Aquí iría la lógica de generación del crucigrama
    // Por ahora retornamos un crucigrama básico
    return await this.crosswordRepository.save(crossword);
  }

  /**
   * Crear grid vacío
   */
  private createEmptyGrid(rows: number, cols: number): (any)[][] {
    return Array(rows).fill(null).map((_, row) => 
      Array(cols).fill(null).map((_, col) => ({
        row,
        col,
        letter: '',
        belongsToWords: []
      }))
    );
  }

  /**
   * Validar crucigrama completado
   */
  async validateCrossword(gameResultId: string, answers: any[]) {
    const gameResult = await this.gameResultRepository.findOne({
      where: { id: gameResultId },
      relations: ['game']
    });

    if (!gameResult) {
      throw new NotFoundException('Sesión de juego no encontrada');
    }

    // Validar respuestas del crucigrama
    let correctAnswers = 0;
    const totalAnswers = answers.length;

    // Lógica de validación aquí...

    gameResult.score = Math.round((correctAnswers / totalAnswers) * 100);
    gameResult.status = GameStatus.COMPLETED;
    gameResult.completedAt = new Date();

    return await this.gameResultRepository.save(gameResult);
  }
}
