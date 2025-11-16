import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './game.entity';
import { Question } from './question.entity';
import { GameResult } from './game-result.entity';
import { GameComment } from './game-comment.entity';
import { GameRating } from './game-rating.entity';
import { CrosswordPuzzle } from './crossword-puzzle.entity';
import { Simulation } from './simulation.entity';
import { GamesController } from './games.controller';
import { TriviaController } from './trivia.controller';
import { CrosswordController } from './crossword.controller';
import { SimulationController } from './simulation.controller';
import { GamesService } from './games.service';
import { TriviaService } from './trivia.service';
import { CrosswordService } from './crossword.service';
import { SimulationService } from './simulation.service';
import { CrosswordGeneratorService } from './crossword-generator.service';
import { GameAnalyticsService } from './game-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      Question,
  GameResult,
  GameComment,
  GameRating,
      CrosswordPuzzle,
      Simulation,
    ]),
  ],
  controllers: [
    GamesController,
    TriviaController,
    CrosswordController,
    SimulationController,
  ],
  providers: [
    GamesService,
    TriviaService,
    CrosswordService,
    SimulationService,
    CrosswordGeneratorService,
    GameAnalyticsService,
  ],
  exports: [
    GamesService,
    TriviaService,
    CrosswordService,
    SimulationService,
    GameAnalyticsService,
  ],
})
export class GamesModule {}
