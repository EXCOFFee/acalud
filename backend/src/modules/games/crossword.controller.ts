import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CrosswordService } from './crossword.service';

@Controller('games/crossword')
export class CrosswordController {
  constructor(private readonly crosswordService: CrosswordService) {}

  /**
   * Generar crucigrama
   */
  @Post(':gameId/generate')
  async generateCrossword(
    @Param('gameId') gameId: string,
    @Body() body: { words: string[]; clues: string[] }
  ) {
    return await this.crosswordService.generateCrossword(
      gameId, 
      body.words, 
      body.clues
    );
  }

  /**
   * Validar crucigrama
   */
  @Post('sessions/:sessionId/validate')
  async validateCrossword(
    @Param('sessionId') sessionId: string,
    @Body() body: { answers: any[] }
  ) {
    return await this.crosswordService.validateCrossword(
      sessionId, 
      body.answers
    );
  }
}
