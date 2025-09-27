import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { GamesService, CreateGameDto, UpdateGameDto, GameFilters } from './games.service';
import { Game, GameType, Subject, DifficultyLevel, EducationLevel } from './game.entity';
import { GameResult } from './game-result.entity';

@ApiTags('games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo juego educativo' })
  @ApiResponse({ status: 201, description: 'Juego creado exitosamente', type: Game })
  async createGame(@Body() createGameDto: CreateGameDto, @Request() req: any): Promise<Game> {
    return await this.gamesService.createGame(createGameDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los juegos con filtros opcionales' })
  @ApiResponse({ status: 200, description: 'Lista de juegos', type: [Game] })
  async findAllGames(
    @Query('type') type?: GameType,
    @Query('subject') subject?: Subject,
    @Query('difficulty') difficulty?: DifficultyLevel,
    @Query('educationLevel') educationLevel?: EducationLevel,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Request() req?: any,
  ): Promise<Game[]> {
    const filters: GameFilters = {
      type,
      subject,
      difficulty,
      educationLevel,
      isActive,
      search,
    };

    if (tags) {
      filters.tags = tags.split(',');
    }

    // Si es profesor, puede ver sus propios juegos y los públicos
    if (req.user.role === UserRole.TEACHER) {
      // Lógica para mostrar juegos apropiados para profesores
    }

    return await this.gamesService.findAllGames(filters);
  }

  @Get('my-games')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener juegos creados por el usuario actual' })
  @ApiResponse({ status: 200, description: 'Lista de juegos del usuario', type: [Game] })
  async getMyGames(@Request() req: any): Promise<Game[]> {
    return await this.gamesService.findAllGames({ createdById: req.user.id });
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Obtener juegos recomendados para el usuario' })
  @ApiResponse({ status: 200, description: 'Lista de juegos recomendados', type: [Game] })
  async getRecommendedGames(
    @Request() req: any,
    @Query('educationLevel') educationLevel?: EducationLevel,
    @Query('subjects') subjects?: string,
  ): Promise<Game[]> {
    const subjectList = subjects ? subjects.split(',') as Subject[] : undefined;
    return await this.gamesService.getRecommendedGames(req.user.id, educationLevel, subjectList);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar juegos por texto' })
  @ApiResponse({ status: 200, description: 'Resultados de búsqueda', type: [Game] })
  async searchGames(
    @Query('q') searchTerm: string,
    @Query('type') type?: GameType,
    @Query('subject') subject?: Subject,
    @Query('difficulty') difficulty?: DifficultyLevel,
    @Query('educationLevel') educationLevel?: EducationLevel,
  ): Promise<Game[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new BadRequestException('El término de búsqueda debe tener al menos 2 caracteres');
    }

    const filters: GameFilters = { type, subject, difficulty, educationLevel };
    return await this.gamesService.searchGames(searchTerm, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un juego por ID' })
  @ApiResponse({ status: 200, description: 'Detalles del juego', type: Game })
  async findGameById(@Param('id') id: string): Promise<Game> {
    return await this.gamesService.findGameById(id);
  }

  @Get(':id/statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de un juego' })
  @ApiResponse({ status: 200, description: 'Estadísticas del juego' })
  async getGameStatistics(@Param('id') id: string): Promise<any> {
    return await this.gamesService.getGameStatistics(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar un juego' })
  @ApiResponse({ status: 200, description: 'Juego actualizado exitosamente', type: Game })
  async updateGame(
    @Param('id') id: string,
    @Body() updateGameDto: UpdateGameDto,
    @Request() req: any,
  ): Promise<Game> {
    return await this.gamesService.updateGame(id, updateGameDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar un juego' })
  @ApiResponse({ status: 200, description: 'Juego eliminado exitosamente' })
  async deleteGame(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    await this.gamesService.deleteGame(id, req.user.id);
    return { message: 'Juego eliminado exitosamente' };
  }

  @Post(':id/clone')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Clonar un juego existente' })
  @ApiResponse({ status: 201, description: 'Juego clonado exitosamente', type: Game })
  async cloneGame(
    @Param('id') id: string,
    @Body('title') newTitle: string,
    @Request() req: any,
  ): Promise<Game> {
    return await this.gamesService.cloneGame(id, req.user.id, newTitle);
  }

  // Endpoints para sesiones de juego

  @Post(':id/start')
  @ApiOperation({ summary: 'Iniciar una sesión de juego' })
  @ApiResponse({ status: 201, description: 'Sesión iniciada exitosamente', type: GameResult })
  async startGameSession(@Param('id') gameId: string, @Request() req: any): Promise<GameResult> {
    return await this.gamesService.startGameSession(gameId, req.user.id);
  }

  @Post('sessions/:sessionId/finish')
  @ApiOperation({ summary: 'Finalizar una sesión de juego' })
  @ApiResponse({ status: 200, description: 'Sesión finalizada exitosamente', type: GameResult })
  async finishGameSession(
    @Param('sessionId') sessionId: string,
    @Body() finalData: {
      score: number;
      timeSpent: number;
      correctAnswers: number;
      totalAnswers: number;
      detailedAnswers: any[];
      gameProgress?: Record<string, any>;
    },
    @Request() req: any,
  ): Promise<GameResult> {
    return await this.gamesService.finishGameSession(sessionId, req.user.id, finalData);
  }

  // Endpoints de utilidad

  @Get('enums/game-types')
  @ApiOperation({ summary: 'Obtener tipos de juegos disponibles' })
  getGameTypes(): { value: string; label: string }[] {
    return [
      { value: GameType.CROSSWORD, label: 'Crucigrama' },
      { value: GameType.TRIVIA, label: 'Trivia' },
      { value: GameType.SIMULATION, label: 'Simulación' },
    ];
  }

  @Get('enums/subjects')
  @ApiOperation({ summary: 'Obtener materias disponibles' })
  getSubjects(): { value: string; label: string }[] {
    return [
      { value: Subject.MATHEMATICS, label: 'Matemáticas' },
      { value: Subject.HISTORY, label: 'Historia' },
      { value: Subject.LITERATURE, label: 'Literatura' },
      { value: Subject.SCIENCES, label: 'Ciencias' },
      { value: Subject.GEOGRAPHY, label: 'Geografía' },
      { value: Subject.LANGUAGE, label: 'Lenguaje' },
    ];
  }

  @Get('enums/difficulties')
  @ApiOperation({ summary: 'Obtener niveles de dificultad disponibles' })
  getDifficulties(): { value: string; label: string }[] {
    return [
      { value: DifficultyLevel.BEGINNER, label: 'Principiante' },
      { value: DifficultyLevel.INTERMEDIATE, label: 'Intermedio' },
      { value: DifficultyLevel.ADVANCED, label: 'Avanzado' },
    ];
  }

  @Get('enums/education-levels')
  @ApiOperation({ summary: 'Obtener niveles educativos disponibles' })
  getEducationLevels(): { value: string; label: string }[] {
    return [
      { value: EducationLevel.PRIMARY, label: 'Primaria' },
      { value: EducationLevel.SECONDARY, label: 'Secundaria' },
    ];
  }
}
