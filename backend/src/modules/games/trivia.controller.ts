import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TriviaService } from './trivia.service';
import { DifficultyLevel } from './game.entity';

@Controller('games/trivia')
export class TriviaController {
  constructor(private readonly triviaService: TriviaService) {}

  /**
   * Iniciar sesión de trivia
   */
  @Post(':gameId/start')
  async startTrivia(
    @Param('gameId') gameId: string,
    @Request() req: any,
    @Body() body: { questionCount?: number; difficulty?: DifficultyLevel }
  ) {
    const userId = req.user?.id || 'anonymous';
    return await this.triviaService.startTriviaSession(
      gameId, 
      userId, 
      body.questionCount || 10, 
      body.difficulty
    );
  }

  /**
   * Procesar respuesta de trivia
   */
  @Post('sessions/:sessionId/answer')
  async answerQuestion(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
    @Body() body: { 
      questionId: string; 
      answer: string; 
      timeSpent: number 
    }
  ) {
    const userId = req.user?.id || 'anonymous';
    return await this.triviaService.processTriviaAnswer(
      sessionId,
      userId,
      body.questionId, 
      body.answer, 
      body.timeSpent
    );
  }

  /**
   * Obtener resultados de trivia completada
   */
  @Get('sessions/:sessionId/result')
  async getTriviaResults(
    @Param('sessionId') sessionId: string,
    @Request() req: any
  ) {
    const userId = req.user?.id || 'anonymous';
    return await this.triviaService.getTriviaResult(sessionId, userId);
  }
}
