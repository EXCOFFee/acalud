import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './user.entity';

/**
 * Controlador para la gestión de usuarios
 * Maneja todas las operaciones CRUD relacionadas con usuarios del sistema
 */
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard) // Protege todas las rutas con autenticación JWT
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Crea un nuevo usuario en el sistema
   * Solo accesible por administradores
   */
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está en uso',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Obtiene todos los usuarios con paginación y filtros opcionales
   */
  @Get()
  @ApiOperation({ summary: 'Obtener lista de usuarios' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiQuery({ name: 'role', required: false, enum: ['student', 'teacher', 'admin'], description: 'Filtrar por rol' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por nombre o email' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
    type: [User],
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    // Validación de parámetros de paginación
    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(50, Math.max(1, Number(limit))); // Máximo 50 elementos por página

    return this.usersService.findAll({
      page: pageNumber,
      limit: limitNumber,
      role,
      search,
    });
  }

  /**
   * Obtiene el perfil del usuario autenticado
   */
  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario obtenido exitosamente',
    type: User,
  })
  async getProfile(@Request() req): Promise<User> {
    return this.usersService.findById(req.user.id);
  }

  /**
   * Obtiene un usuario específico por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  /**
   * Actualiza los datos del perfil del usuario autenticado
   */
  @Patch('profile')
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  /**
   * Actualiza un usuario específico por su ID
   * Solo accesible por administradores
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario por ID' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Elimina (desactiva) un usuario del sistema
   * Solo accesible por administradores
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiResponse({
    status: 204,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id);
  }

  /**
   * Obtiene las estadísticas de gamificación del usuario
   */
  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de gamificación del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  async getUserStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserStats(id);
  }

  /**
   * Obtiene el ranking de usuarios por experiencia
   */
  @Get('ranking/experience')
  @ApiOperation({ summary: 'Obtener ranking de usuarios por experiencia' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número de usuarios en el ranking' })
  @ApiResponse({
    status: 200,
    description: 'Ranking obtenido exitosamente',
  })
  async getExperienceRanking(@Query('limit') limit = 10) {
    const limitNumber = Math.min(100, Math.max(1, Number(limit))); // Máximo 100 usuarios en ranking
    return this.usersService.getExperienceRanking(limitNumber);
  }
}
