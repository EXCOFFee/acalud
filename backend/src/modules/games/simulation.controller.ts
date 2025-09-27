import { Controller, Post, Get, Body, Param, Request } from '@nestjs/common';
import { SimulationService } from './simulation.service';

@Controller('games/simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  /**
   * Iniciar simulación
   */
  @Post(':gameId/start')
  async startSimulation(
    @Param('gameId') gameId: string,
    @Request() req: any
  ) {
    const userId = req.user?.id || 'anonymous';
    return await this.simulationService.startSimulation(gameId, userId);
  }

  /**
   * Procesar elección
   */
  @Post('sessions/:sessionId/choice')
  async processChoice(
    @Param('sessionId') sessionId: string,
    @Body() body: { choiceId: string }
  ) {
    return await this.simulationService.processChoice(
      sessionId, 
      body.choiceId
    );
  }
}
