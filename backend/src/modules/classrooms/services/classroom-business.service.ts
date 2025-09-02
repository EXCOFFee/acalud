/**
 * ✅ SERVICIO DE LÓGICA DE NEGOCIO DE AULAS - SIGUIENDO PRINCIPIOS SOLID
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Solo maneja lógica de negocio de aulas
 * - OCP: Extensible agregando nuevas funcionalidades sin modificar código existente
 * - LSP: Implementa completamente IClassroomService
 * - ISP: Depende solo de interfaces específicas que necesita
 * - DIP: Depende de abstracciones, no de implementaciones concretas
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { 
  IClassroomService,
  IClassroomRepository,
  IClassroomValidator,
  IPermissionValidator,
  IInviteCodeGenerator,
  CreateClassroomDto,
  UpdateClassroomDto,
  JoinClassroomDto,
  ClassroomFilters,
  PaginatedResult,
  Classroom,
  ClassroomStats,
  CreateClassroomData
} from '../interfaces';
import { 
  ResourceNotFoundException, 
  BusinessLimitException,
  ValidationException,
  OperationNotAllowedException
} from '../../../common/exceptions/business.exception';
import { CLASSROOM_TOKENS } from '../tokens';

@Injectable()
export class ClassroomBusinessService implements IClassroomService {
  private readonly logger = new Logger(ClassroomBusinessService.name);

  constructor(
    @Inject(CLASSROOM_TOKENS.IClassroomRepository)
    private readonly classroomRepository: IClassroomRepository,
    @Inject(CLASSROOM_TOKENS.IClassroomValidator)
    private readonly classroomValidator: IClassroomValidator,
    @Inject(CLASSROOM_TOKENS.IPermissionValidator)
    private readonly permissionValidator: IPermissionValidator,
    @Inject(CLASSROOM_TOKENS.IInviteCodeGenerator)
    private readonly inviteCodeGenerator: IInviteCodeGenerator,
  ) {}

  async createClassroom(data: CreateClassroomDto, teacherId: string): Promise<Classroom> {
    this.logger.log(`Creating classroom: ${data.name} for teacher: ${teacherId}`);

    try {
      // ✅ Validar permisos del docente
      await this.permissionValidator.validateCanCreateClassroom(teacherId);

      // ✅ Validar datos de entrada
      await this.classroomValidator.validateCreateData(data);

      // ✅ Generar código de invitación único
      const inviteCode = await this.inviteCodeGenerator.generateUniqueCode();

      // ✅ Preparar datos para crear el aula
      const classroomData: CreateClassroomData = {
        ...data,
        teacherId,
        inviteCode,
        color: data.color || '#6366f1',
        settings: {
          allowStudentDiscussion: true,
          requireApprovalForJoin: false,
          maxStudents: 50,
          timezone: 'America/Santiago',
          language: 'es',
          notifications: {
            newStudent: true,
            activityCompleted: true,
            announcements: true,
          },
          ...data.settings, // Permitir override de configuraciones
        },
        isActive: true,
        createdAt: new Date(),
      };

      // ✅ Crear el aula en el repositorio
      const classroom = await this.classroomRepository.create(classroomData);

      this.logger.log(`Classroom created successfully: ${classroom.id}`);
      return classroom;

    } catch (error) {
      this.logger.error(`Error creating classroom: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findClassrooms(filters: ClassroomFilters): Promise<PaginatedResult<Classroom>> {
    this.logger.log(`Finding classrooms with filters:`, filters);

    try {
      // ✅ Validar filtros
      await this.classroomValidator.validateFilters(filters);

      // ✅ Aplicar filtros predeterminados seguros
      const safeFilters: ClassroomFilters = {
        page: Math.max(1, filters.page || 1),
        limit: Math.min(100, Math.max(1, filters.limit || 10)),
        search: filters.search?.trim(),
        subject: filters.subject?.trim(),
        grade: filters.grade?.trim(),
        teacherId: filters.teacherId?.trim(),
        isActive: filters.isActive !== undefined ? filters.isActive : true,
      };

      return await this.classroomRepository.findWithFilters(safeFilters);

    } catch (error) {
      this.logger.error(`Error finding classrooms: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findClassroomById(id: string): Promise<Classroom> {
    this.logger.log(`Finding classroom by ID: ${id}`);

    try {
      const classroom = await this.classroomRepository.findById(id);
      
      if (!classroom) {
        throw new ResourceNotFoundException('Aula', id);
      }

      if (!classroom.isActive) {
        throw new OperationNotAllowedException('ver aula', 'el aula no está disponible');
      }

      return classroom;

    } catch (error) {
      this.logger.error(`Error finding classroom: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateClassroom(id: string, data: UpdateClassroomDto, userId: string): Promise<Classroom> {
    this.logger.log(`Updating classroom ${id} by user ${userId}`);

    try {
      // ✅ Validar permisos
      await this.permissionValidator.validateCanModifyClassroom(id, userId);

      // ✅ Validar datos de actualización
      await this.classroomValidator.validateUpdateData(data);

      // ✅ Verificar que el aula existe
      const existingClassroom = await this.findClassroomById(id);

      // ✅ Preparar datos de actualización
      const updateData: Partial<Classroom> = {
        ...data,
        settings: data.settings ? { ...existingClassroom.settings, ...data.settings } : undefined,
      };

      // ✅ Actualizar en el repositorio
      const updatedClassroom = await this.classroomRepository.update(id, updateData);

      this.logger.log(`Classroom updated successfully: ${id}`);
      return updatedClassroom;

    } catch (error) {
      this.logger.error(`Error updating classroom: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteClassroom(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting classroom ${id} by user ${userId}`);

    try {
      // ✅ Validar permisos
      await this.permissionValidator.validateCanDeleteClassroom(id, userId);

      // ✅ Verificar que el aula existe
      await this.findClassroomById(id);

      // ✅ Verificar reglas de negocio para eliminación
      const studentCount = await this.classroomRepository.getStudentCount(id);
      if (studentCount > 0) {
        throw new OperationNotAllowedException(
          'eliminar aula',
          `el aula tiene ${studentCount} estudiante(s) inscritos`
        );
      }

      // ✅ Eliminar (soft delete)
      await this.classroomRepository.delete(id);

      this.logger.log(`Classroom deleted successfully: ${id}`);

    } catch (error) {
      this.logger.error(`Error deleting classroom: ${error.message}`, error.stack);
      throw error;
    }
  }

  async joinClassroom(data: JoinClassroomDto, studentId: string): Promise<Classroom> {
    this.logger.log(`Student ${studentId} joining classroom with code: ${data.inviteCode}`);

    try {
      // ✅ Validar permisos del estudiante
      await this.permissionValidator.validateCanJoinClassroom(studentId);

      // ✅ Validar datos de unión
      await this.classroomValidator.validateJoinData(data);

      // ✅ Buscar aula por código de invitación
      const classroom = await this.classroomRepository.findByInviteCode(data.inviteCode);
      
      if (!classroom) {
        throw new ValidationException(
          'Código de invitación inválido',
          { inviteCode: ['El código de invitación no existe o ha expirado'] }
        );
      }

      // ✅ Validar reglas específicas del aula
      await this.classroomValidator.validateCanJoinSpecificClassroom(classroom, studentId);

      // ✅ Validar capacidad del aula
      await this.classroomValidator.validateClassroomCapacity(classroom.id);

      // ✅ Unir estudiante al aula
      const updatedClassroom = await this.classroomRepository.addStudent(classroom.id, studentId);

      this.logger.log(`Student ${studentId} joined classroom ${classroom.id} successfully`);
      return updatedClassroom;

    } catch (error) {
      this.logger.error(`Error joining classroom: ${error.message}`, error.stack);
      throw error;
    }
  }

  async leaveClassroom(classroomId: string, studentId: string): Promise<void> {
    this.logger.log(`Student ${studentId} leaving classroom ${classroomId}`);

    try {
      // ✅ Verificar que el aula existe
      await this.findClassroomById(classroomId);

      // ✅ Remover estudiante del aula
      await this.classroomRepository.removeStudent(classroomId, studentId);

      this.logger.log(`Student ${studentId} left classroom ${classroomId} successfully`);

    } catch (error) {
      this.logger.error(`Error leaving classroom: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateNewInviteCode(classroomId: string, userId: string): Promise<string> {
    this.logger.log(`Generating new invite code for classroom ${classroomId} by user ${userId}`);

    try {
      // ✅ Validar permisos
      await this.permissionValidator.validateCanModifyClassroom(classroomId, userId);

      // ✅ Verificar que el aula existe
      await this.findClassroomById(classroomId);

      // ✅ Generar nuevo código único
      const newInviteCode = await this.inviteCodeGenerator.generateUniqueCode();

      // ✅ Actualizar el aula con el nuevo código
      await this.classroomRepository.update(classroomId, { inviteCode: newInviteCode });

      this.logger.log(`New invite code generated for classroom ${classroomId}: ${newInviteCode}`);
      return newInviteCode;

    } catch (error) {
      this.logger.error(`Error generating new invite code: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getClassroomStats(classroomId: string): Promise<ClassroomStats> {
    this.logger.log(`Getting stats for classroom ${classroomId}`);

    try {
      // ✅ Verificar que el aula existe
      const classroom = await this.findClassroomById(classroomId);

      // ✅ Obtener estadísticas
      const totalStudents = await this.classroomRepository.getStudentCount(classroomId);
      
      // TODO: Implementar cálculo de estadísticas de actividades cuando esté disponible
      const stats: ClassroomStats = {
        totalStudents,
        totalActivities: classroom.activities?.length || 0,
        activeActivities: classroom.activities?.filter(a => a.isActive).length || 0,
        averageCompletion: 0, // Calcular cuando tengamos completions
        lastActivity: null, // Obtener de activities cuando esté disponible
        createdAt: classroom.createdAt,
        isActive: classroom.isActive,
      };

      return stats;

    } catch (error) {
      this.logger.error(`Error getting classroom stats: ${error.message}`, error.stack);
      throw error;
    }
  }
}
