/**
 * ✅ CONTROLADOR DE AULAS REFACTORIZADO - SIGUIENDO PRINCIPIOS SOLID
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Solo maneja requests HTTP y responses
 * - OCP: Extensible para nuevos endpoints sin modificar existentes
 * - DIP: Depende de abstracciones (IClassroomService)
 * 
 * RESPONSABILIDADES:
 * - Validar requests HTTP
 * - Delegar lógica de negocio al servicio
 * - Formatear responses HTTP
 * - Manejar errores HTTP apropiadamente
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  HttpStatus,
  HttpCode,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { 
  IClassroomService,
  CreateClassroomDto,
  UpdateClassroomDto,
  JoinClassroomDto,
  ClassroomFilters,
  Classroom 
} from '../interfaces';
import { CLASSROOM_TOKENS } from '../tokens';

// TODO: Importar guards cuando estén disponibles
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { GetUser } from '../../auth/decorators/get-user.decorator';
// import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Aulas')
@Controller('classrooms')
// @UseGuards(JwtAuthGuard) // TODO: Descomentar cuando esté disponible
export class ClassroomsRefactoredController {
  private readonly logger = new Logger(ClassroomsRefactoredController.name);

  constructor(
    @Inject(CLASSROOM_TOKENS.IClassroomService)
    private readonly classroomService: IClassroomService,
  ) {}

  /**
   * 📚 Crear una nueva aula
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Crear nueva aula',
    description: 'Permite a un docente crear una nueva aula virtual'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Aula creada exitosamente'
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Usuario no autenticado' })
  @ApiResponse({ status: 403, description: 'Usuario no autorizado para crear aulas' })
  // @Roles('teacher', 'admin') // TODO: Descomentar cuando esté disponible
  // @UseGuards(RolesGuard) // TODO: Descomentar cuando esté disponible
  // @ApiBearerAuth() // TODO: Descomentar cuando esté disponible
  async createClassroom(
    @Body() createClassroomDto: CreateClassroomDto,
    // @GetUser('id') teacherId: string, // TODO: Descomentar cuando esté disponible
  ): Promise<Classroom> {
    this.logger.log(`Creating classroom: ${createClassroomDto.name}`);
    
    // TODO: Reemplazar con teacherId real del token JWT
    const teacherId = 'temp-teacher-id'; // Temporal para demo
    
    return this.classroomService.createClassroom(createClassroomDto, teacherId);
  }

  /**
   * 📋 Obtener listado de aulas con filtros
   */
  @Get()
  @ApiOperation({ 
    summary: 'Listar aulas',
    description: 'Obtiene un listado paginado de aulas con filtros opcionales'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Listado de aulas obtenido exitosamente'
  })
  async findClassrooms(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('teacherId') teacherId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    this.logger.log(`Finding classrooms with filters`);

    const filters: ClassroomFilters = {
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 10, 100), // Máximo 100 por página
      search,
      subject,
      grade,
      teacherId,
      isActive,
    };

    return this.classroomService.findClassrooms(filters);
  }

  /**
   * 🔍 Obtener aula específica por ID
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener aula por ID',
    description: 'Obtiene los detalles de una aula específica'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Aula encontrada exitosamente'
  })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  async findClassroomById(
    @Param('id') id: string,
  ): Promise<Classroom> {
    this.logger.log(`Finding classroom by ID: ${id}`);
    
    return this.classroomService.findClassroomById(id);
  }

  /**
   * ✏️ Actualizar aula existente
   */
  @Put(':id')
  @ApiOperation({ 
    summary: 'Actualizar aula',
    description: 'Permite al propietario actualizar los datos de una aula'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Aula actualizada exitosamente'
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado para modificar esta aula' })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  // @UseGuards(RolesGuard) // TODO: Descomentar cuando esté disponible
  // @ApiBearerAuth() // TODO: Descomentar cuando esté disponible
  async updateClassroom(
    @Param('id') id: string,
    @Body() updateClassroomDto: UpdateClassroomDto,
    // @GetUser('id') userId: string, // TODO: Descomentar cuando esté disponible
  ): Promise<Classroom> {
    this.logger.log(`Updating classroom: ${id}`);
    
    // TODO: Reemplazar con userId real del token JWT
    const userId = 'temp-user-id'; // Temporal para demo
    
    return this.classroomService.updateClassroom(id, updateClassroomDto, userId);
  }

  /**
   * 🗑️ Eliminar aula
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Eliminar aula',
    description: 'Permite al propietario eliminar una aula (soft delete)'
  })
  @ApiResponse({ status: 204, description: 'Aula eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado para eliminar esta aula' })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar aula con estudiantes activos' })
  // @UseGuards(RolesGuard) // TODO: Descomentar cuando esté disponible
  // @ApiBearerAuth() // TODO: Descomentar cuando esté disponible
  async deleteClassroom(
    @Param('id') id: string,
    // @GetUser('id') userId: string, // TODO: Descomentar cuando esté disponible
  ): Promise<void> {
    this.logger.log(`Deleting classroom: ${id}`);
    
    // TODO: Reemplazar con userId real del token JWT
    const userId = 'temp-user-id'; // Temporal para demo
    
    return this.classroomService.deleteClassroom(id, userId);
  }

  /**
   * 🚪 Unirse a un aula mediante código de invitación
   */
  @Post('join')
  @ApiOperation({ 
    summary: 'Unirse a aula',
    description: 'Permite a un estudiante unirse a una aula usando un código de invitación'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estudiante unido al aula exitosamente'
  })
  @ApiResponse({ status: 400, description: 'Código de invitación inválido' })
  @ApiResponse({ status: 403, description: 'No autorizado para unirse a aulas' })
  // @Roles('student') // TODO: Descomentar cuando esté disponible
  // @UseGuards(RolesGuard) // TODO: Descomentar cuando esté disponible
  // @ApiBearerAuth() // TODO: Descomentar cuando esté disponible
  async joinClassroom(
    @Body() joinClassroomDto: JoinClassroomDto,
    // @GetUser('id') studentId: string, // TODO: Descomentar cuando esté disponible
  ): Promise<Classroom> {
    this.logger.log(`Student joining classroom with code: ${joinClassroomDto.inviteCode}`);
    
    // TODO: Reemplazar con studentId real del token JWT
    const studentId = 'temp-student-id'; // Temporal para demo
    
    return this.classroomService.joinClassroom(joinClassroomDto, studentId);
  }

  /**
   * 🚪 Salir de un aula
   */
  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Salir de aula',
    description: 'Permite a un estudiante salir de una aula'
  })
  @ApiResponse({ status: 204, description: 'Estudiante salió del aula exitosamente' })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  // @Roles('student') // TODO: Descomentar cuando esté disponible
  // @UseGuards(RolesGuard) // TODO: Descomentar cuando esté disponible
  // @ApiBearerAuth() // TODO: Descomentar cuando esté disponible
  async leaveClassroom(
    @Param('id') classroomId: string,
    // @GetUser('id') studentId: string, // TODO: Descomentar cuando esté disponible
  ): Promise<void> {
    this.logger.log(`Student leaving classroom: ${classroomId}`);
    
    // TODO: Reemplazar con studentId real del token JWT
    const studentId = 'temp-student-id'; // Temporal para demo
    
    return this.classroomService.leaveClassroom(classroomId, studentId);
  }

  /**
   * 🔄 Generar nuevo código de invitación
   */
  @Post(':id/regenerate-code')
  @ApiOperation({ 
    summary: 'Regenerar código de invitación',
    description: 'Permite al propietario generar un nuevo código de invitación para el aula'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Nuevo código generado exitosamente',
    schema: { type: 'object', properties: { inviteCode: { type: 'string' } } }
  })
  @ApiResponse({ status: 403, description: 'No autorizado para modificar esta aula' })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  // @UseGuards(RolesGuard) // TODO: Descomentar cuando esté disponible
  // @ApiBearerAuth() // TODO: Descomentar cuando esté disponible
  async generateNewInviteCode(
    @Param('id') classroomId: string,
    // @GetUser('id') userId: string, // TODO: Descomentar cuando esté disponible
  ): Promise<{ inviteCode: string }> {
    this.logger.log(`Generating new invite code for classroom: ${classroomId}`);
    
    // TODO: Reemplazar con userId real del token JWT
    const userId = 'temp-user-id'; // Temporal para demo
    
    const inviteCode = await this.classroomService.generateNewInviteCode(classroomId, userId);
    
    return { inviteCode };
  }

  /**
   * 📊 Obtener estadísticas del aula
   */
  @Get(':id/stats')
  @ApiOperation({ 
    summary: 'Obtener estadísticas del aula',
    description: 'Obtiene estadísticas detalladas de una aula específica'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas obtenidas exitosamente'
  })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  // @ApiBearerAuth() // TODO: Descomentar cuando esté disponible
  async getClassroomStats(
    @Param('id') classroomId: string,
  ) {
    this.logger.log(`Getting stats for classroom: ${classroomId}`);
    
    return this.classroomService.getClassroomStats(classroomId);
  }
}
