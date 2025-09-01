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
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { JoinClassroomDto } from './dto/join-classroom.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Classroom } from './classroom.entity';

/**
 * Controlador para la gestión de aulas virtuales
 * Maneja todas las operaciones relacionadas con aulas, inscripciones y códigos de invitación
 */
@ApiTags('classrooms')
@Controller('classrooms')
@UseGuards(JwtAuthGuard) // Protege todas las rutas con autenticación JWT
@ApiBearerAuth()
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  /**
   * Crea una nueva aula virtual (solo docentes)
   */
  @Post()
  @ApiOperation({ summary: 'Crear una nueva aula virtual' })
  @ApiResponse({
    status: 201,
    description: 'Aula creada exitosamente',
    type: Classroom,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los docentes pueden crear aulas',
  })
  async create(
    @Body() createClassroomDto: CreateClassroomDto,
    @Request() req,
  ): Promise<Classroom> {
    return this.classroomsService.create(createClassroomDto, req.user.id);
  }

  /**
   * Obtiene todas las aulas con filtros y paginación
   */
  @Get()
  @ApiOperation({ summary: 'Obtener lista de aulas' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por nombre, descripción o materia' })
  @ApiQuery({ name: 'subject', required: false, type: String, description: 'Filtrar por materia' })
  @ApiQuery({ name: 'grade', required: false, type: String, description: 'Filtrar por grado' })
  @ApiQuery({ name: 'teacherId', required: false, type: String, description: 'Filtrar por docente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de aulas obtenida exitosamente',
    type: [Classroom],
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    // Validación de parámetros de paginación
    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(50, Math.max(1, Number(limit)));

    return this.classroomsService.findAll({
      page: pageNumber,
      limit: limitNumber,
      search,
      subject,
      grade,
      teacherId,
    });
  }

  /**
   * Obtiene las aulas del usuario autenticado (como docente o estudiante)
   */
  @Get('my-classrooms')
  @ApiOperation({ summary: 'Obtener mis aulas (como docente o estudiante)' })
  @ApiResponse({
    status: 200,
    description: 'Aulas del usuario obtenidas exitosamente',
    type: [Classroom],
  })
  async getMyClassrooms(@Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'teacher' || userRole === 'admin') {
      // Si es docente, obtener las aulas que posee
      return this.classroomsService.getTeacherClassrooms(userId);
    } else {
      // Si es estudiante, obtener las aulas en las que está inscrito
      return this.classroomsService.getStudentClassrooms(userId);
    }
  }

  /**
   * Permite unirse a un aula usando código de invitación
   */
  @Post('join')
  @ApiOperation({ summary: 'Unirse a un aula usando código de invitación' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción exitosa',
    type: Classroom,
  })
  @ApiResponse({
    status: 400,
    description: 'Código inválido o ya inscrito',
  })
  @ApiResponse({
    status: 404,
    description: 'Aula no encontrada',
  })
  async joinClassroom(
    @Body() joinClassroomDto: JoinClassroomDto,
    @Request() req,
  ): Promise<Classroom> {
    return this.classroomsService.joinClassroom(joinClassroomDto, req.user.id);
  }

  /**
   * Busca un aula por código de invitación (para vista previa antes de unirse)
   */
  @Get('preview/:inviteCode')
  @ApiOperation({ summary: 'Vista previa de aula por código de invitación' })
  @ApiResponse({
    status: 200,
    description: 'Información del aula obtenida exitosamente',
    type: Classroom,
  })
  @ApiResponse({
    status: 404,
    description: 'Código de invitación inválido',
  })
  async previewClassroom(@Param('inviteCode') inviteCode: string): Promise<Classroom> {
    return this.classroomsService.findByInviteCode(inviteCode);
  }

  /**
   * Obtiene un aula específica por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener aula por ID' })
  @ApiResponse({
    status: 200,
    description: 'Aula encontrada exitosamente',
    type: Classroom,
  })
  @ApiResponse({
    status: 404,
    description: 'Aula no encontrada',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Classroom> {
    return this.classroomsService.findById(id);
  }

  /**
   * Actualiza los datos de un aula (solo propietario o admin)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar aula' })
  @ApiResponse({
    status: 200,
    description: 'Aula actualizada exitosamente',
    type: Classroom,
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para actualizar esta aula',
  })
  @ApiResponse({
    status: 404,
    description: 'Aula no encontrada',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClassroomDto: UpdateClassroomDto,
    @Request() req,
  ): Promise<Classroom> {
    return this.classroomsService.update(id, updateClassroomDto, req.user.id);
  }

  /**
   * Elimina (desactiva) un aula (solo propietario o admin)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar aula' })
  @ApiResponse({
    status: 204,
    description: 'Aula eliminada exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para eliminar esta aula',
  })
  @ApiResponse({
    status: 404,
    description: 'Aula no encontrada',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
    await this.classroomsService.remove(id, req.user.id);
  }

  /**
   * Permite a un estudiante salirse de un aula
   */
  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Salirse de un aula' })
  @ApiResponse({
    status: 204,
    description: 'Salida exitosa del aula',
  })
  @ApiResponse({
    status: 400,
    description: 'No estás inscrito en esta aula',
  })
  @ApiResponse({
    status: 404,
    description: 'Aula no encontrada',
  })
  async leaveClassroom(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
    await this.classroomsService.leaveClassroom(id, req.user.id);
  }

  /**
   * Regenera el código de invitación de un aula (solo propietario o admin)
   */
  @Post(':id/regenerate-code')
  @ApiOperation({ summary: 'Regenerar código de invitación' })
  @ApiResponse({
    status: 200,
    description: 'Código regenerado exitosamente',
    schema: {
      type: 'object',
      properties: {
        inviteCode: { type: 'string', example: 'XYZ98765' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para regenerar el código',
  })
  async regenerateInviteCode(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const inviteCode = await this.classroomsService.regenerateInviteCode(id, req.user.id);
    return { inviteCode };
  }

  /**
   * Obtiene estadísticas de un aula
   */
  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas del aula' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalStudents: { type: 'number', example: 25 },
        totalActivities: { type: 'number', example: 15 },
        activeActivities: { type: 'number', example: 10 },
        createdAt: { type: 'string', format: 'date-time' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  async getClassroomStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.classroomsService.getClassroomStats(id);
  }
}
