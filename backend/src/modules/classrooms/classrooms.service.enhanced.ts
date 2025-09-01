/**
 * Servicio mejorado para la gestión de aulas virtuales
 * Implementa principios SOLID y manejo robusto de errores
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Classroom } from './classroom.entity';
import { User, UserRole } from '../users/user.entity';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { JoinClassroomDto } from './dto/join-classroom.dto';
import { 
  ResourceNotFoundException,
  AuthorizationException,
  DataConflictException,
  ValidationException,
  BusinessLimitException,
  OperationNotAllowedException
} from '../../common/exceptions/business.exception';
import { 
  OperationResult, 
  PaginatedResponse, 
  FindClassroomsOptions,
  ClassroomStats,
  IClassroomService 
} from '../../common/interfaces/contracts.interface';

/**
 * Servicio de aulas implementando principios SOLID:
 * - Single Responsibility: Solo maneja lógica de aulas
 * - Open/Closed: Extensible para nuevos tipos de aulas
 * - Liskov Substitution: Cumple con el contrato IClassroomService
 * - Interface Segregation: Usa interfaces específicas
 * - Dependency Inversion: Depende de abstracciones
 */
@Injectable()
export class ClassroomsService implements IClassroomService {
  private readonly MAX_STUDENTS_PER_CLASSROOM = 100;
  private readonly MAX_CLASSROOMS_PER_TEACHER = 50;
  private readonly INVITE_CODE_LENGTH = 8;
  private readonly INVITE_CODE_EXPIRY_DAYS = 365;

  constructor(
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Crea una nueva aula virtual con validaciones robustas
   * @param createClassroomDto - Datos de la nueva aula
   * @param teacherId - ID del docente que crea el aula
   * @returns Resultado de la operación
   */
  async create(
    createClassroomDto: CreateClassroomDto, 
    teacherId: string
  ): Promise<OperationResult<Classroom>> {
    try {
      // Validar que el usuario sea un docente
      await this.validateTeacherPermissions(teacherId);

      // Verificar límites de negocio
      await this.validateTeacherLimits(teacherId);

      // Validar datos de entrada
      await this.validateClassroomData(createClassroomDto);

      // Generar código de invitación único
      const inviteCode = await this.generateUniqueInviteCode();

      // Crear el aula con configuraciones por defecto seguras
      const classroomData = {
        ...createClassroomDto,
        teacherId,
        inviteCode,
        isActive: true,
        settings: this.getDefaultClassroomSettings(),
        createdAt: new Date(),
      };

      const classroom = this.classroomRepository.create(classroomData);
      const savedClassroom = await this.classroomRepository.save(classroom);

      // Cargar relaciones para respuesta completa
      const fullClassroom = await this.classroomRepository.findOne({
        where: { id: savedClassroom.id },
        relations: ['teacher', 'students'],
      });

      return {
        success: true,
        message: 'Aula creada exitosamente',
        data: fullClassroom,
      };
    } catch (error) {
      if (error instanceof ValidationException || 
          error instanceof BusinessLimitException ||
          error instanceof AuthorizationException) {
        throw error;
      }

      throw new ValidationException(
        'Error al crear el aula',
        { general: [error.message || 'Error interno del servidor'] },
        '/classrooms'
      );
    }
  }

  /**
   * Obtiene todas las aulas con filtros y paginación
   * @param options - Opciones de filtrado y paginación
   * @returns Lista paginada de aulas
   */
  async findAll(options: FindClassroomsOptions): Promise<PaginatedResponse<Classroom>> {
    try {
      const { page, limit, search, subject, grade, teacherId, isActive = true } = options;

      // Validar parámetros de paginación
      const validatedPage = Math.max(1, Number(page) || 1);
      const validatedLimit = Math.min(50, Math.max(1, Number(limit) || 10));

      const queryBuilder = this.classroomRepository
        .createQueryBuilder('classroom')
        .leftJoinAndSelect('classroom.teacher', 'teacher')
        .leftJoinAndSelect('classroom.students', 'students')
        .where('classroom.isActive = :isActive', { isActive });

      // Aplicar filtros con validación
      await this.applyFilters(queryBuilder, { search, subject, grade, teacherId });

      // Aplicar paginación
      const skip = (validatedPage - 1) * validatedLimit;
      queryBuilder
        .orderBy('classroom.createdAt', 'DESC')
        .skip(skip)
        .take(validatedLimit);

      const [classrooms, total] = await queryBuilder.getManyAndCount();

      return {
        data: classrooms,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total,
          totalPages: Math.ceil(total / validatedLimit),
          hasNextPage: validatedPage * validatedLimit < total,
          hasPreviousPage: validatedPage > 1,
        },
      };
    } catch (error) {
      throw new ValidationException(
        'Error al obtener las aulas',
        { general: [error.message] },
        '/classrooms'
      );
    }
  }

  /**
   * Busca un aula por su ID
   * @param id - ID único del aula
   * @returns Resultado de la operación
   */
  async findById(id: string): Promise<OperationResult<Classroom>> {
    try {
      if (!this.isValidUUID(id)) {
        throw new ValidationException(
          'ID de aula inválido',
          { id: ['El ID debe ser un UUID válido'] },
          `/classrooms/${id}`
        );
      }

      const classroom = await this.classroomRepository.findOne({
        where: { id, isActive: true },
        relations: ['teacher', 'students', 'activities'],
      });

      if (!classroom) {
        throw new ResourceNotFoundException(
          'Aula',
          id,
          `/classrooms/${id}`
        );
      }

      return {
        success: true,
        message: 'Aula encontrada',
        data: classroom,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException || 
          error instanceof ValidationException) {
        throw error;
      }

      throw new ValidationException(
        'Error al buscar el aula',
        { general: [error.message] },
        `/classrooms/${id}`
      );
    }
  }

  /**
   * Busca un aula por su código de invitación
   * @param inviteCode - Código de invitación del aula
   * @returns Resultado de la operación
   */
  async findByInviteCode(inviteCode: string): Promise<OperationResult<Classroom>> {
    try {
      if (!this.isValidInviteCode(inviteCode)) {
        throw new ValidationException(
          'Código de invitación inválido',
          { inviteCode: ['El código debe tener 8 caracteres alfanuméricos'] },
          '/classrooms/preview'
        );
      }

      const classroom = await this.classroomRepository.findOne({
        where: { inviteCode: inviteCode.toUpperCase(), isActive: true },
        relations: ['teacher'],
        select: {
          id: true,
          name: true,
          description: true,
          subject: true,
          grade: true,
          inviteCode: true,
          createdAt: true,
          teacher: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            avatar: true,
          },
        },
      });

      if (!classroom) {
        throw new ResourceNotFoundException(
          'Aula',
          inviteCode,
          '/classrooms/preview'
        );
      }

      return {
        success: true,
        message: 'Aula encontrada',
        data: classroom,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException || 
          error instanceof ValidationException) {
        throw error;
      }

      throw new ValidationException(
        'Error al buscar el aula por código',
        { general: [error.message] },
        '/classrooms/preview'
      );
    }
  }

  /**
   * Actualiza los datos de un aula
   * @param id - ID del aula a actualizar
   * @param updateClassroomDto - Datos a actualizar
   * @param userId - ID del usuario que realiza la actualización
   * @returns Resultado de la operación
   */
  async update(
    id: string, 
    updateClassroomDto: UpdateClassroomDto, 
    userId: string
  ): Promise<OperationResult<Classroom>> {
    try {
      const classroomResult = await this.findById(id);
      if (!classroomResult.success) {
        throw new ResourceNotFoundException('Aula', id, `/classrooms/${id}`);
      }

      const classroom = classroomResult.data;

      // Verificar permisos
      await this.validateUpdatePermissions(classroom, userId);

      // Validar datos de actualización
      await this.validateUpdateData(updateClassroomDto);

      // Actualizar el aula
      await this.classroomRepository.update(id, {
        ...updateClassroomDto,
        updatedAt: new Date(),
      });

      // Obtener aula actualizada
      const updatedClassroomResult = await this.findById(id);
      
      return {
        success: true,
        message: 'Aula actualizada exitosamente',
        data: updatedClassroomResult.data,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException || 
          error instanceof AuthorizationException ||
          error instanceof ValidationException) {
        throw error;
      }

      throw new ValidationException(
        'Error al actualizar el aula',
        { general: [error.message] },
        `/classrooms/${id}`
      );
    }
  }

  /**
   * Elimina (desactiva) un aula
   * @param id - ID del aula a eliminar
   * @param userId - ID del usuario que realiza la eliminación
   * @returns Resultado de la operación
   */
  async remove(id: string, userId: string): Promise<OperationResult<void>> {
    try {
      const classroomResult = await this.findById(id);
      if (!classroomResult.success) {
        throw new ResourceNotFoundException('Aula', id, `/classrooms/${id}`);
      }

      const classroom = classroomResult.data;

      // Verificar permisos
      await this.validateDeletePermissions(classroom, userId);

      // Verificar si se puede eliminar (no tiene actividades activas)
      await this.validateCanDelete(classroom);

      // Desactivar en lugar de eliminar físicamente
      await this.classroomRepository.update(id, { 
        isActive: false,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'Aula eliminada exitosamente',
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException || 
          error instanceof AuthorizationException ||
          error instanceof OperationNotAllowedException) {
        throw error;
      }

      throw new ValidationException(
        'Error al eliminar el aula',
        { general: [error.message] },
        `/classrooms/${id}`
      );
    }
  }

  /**
   * Permite a un estudiante unirse a un aula usando el código de invitación
   * @param joinClassroomDto - Datos para unirse al aula
   * @param studentId - ID del estudiante
   * @returns Resultado de la operación
   */
  async joinClassroom(
    joinClassroomDto: JoinClassroomDto, 
    studentId: string
  ): Promise<OperationResult<Classroom>> {
    try {
      const { inviteCode } = joinClassroomDto;

      // Buscar el aula por código de invitación
      const classroomResult = await this.findByInviteCode(inviteCode);
      if (!classroomResult.success) {
        throw new ResourceNotFoundException('Aula', inviteCode, '/classrooms/join');
      }

      const classroom = await this.classroomRepository.findOne({
        where: { id: classroomResult.data.id },
        relations: ['students'],
      });

      // Validar que el usuario sea un estudiante
      await this.validateStudentPermissions(studentId);

      // Verificar límites y restricciones
      await this.validateJoinRestrictions(classroom, studentId);

      // Agregar el estudiante al aula
      const student = await this.userRepository.findOne({
        where: { id: studentId },
      });

      classroom.students.push(student);
      await this.classroomRepository.save(classroom);

      // Retornar aula completa
      const fullClassroomResult = await this.findById(classroom.id);
      
      return {
        success: true,
        message: 'Te has unido al aula exitosamente',
        data: fullClassroomResult.data,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException || 
          error instanceof ValidationException ||
          error instanceof DataConflictException ||
          error instanceof BusinessLimitException) {
        throw error;
      }

      throw new ValidationException(
        'Error al unirse al aula',
        { general: [error.message] },
        '/classrooms/join'
      );
    }
  }

  /**
   * Permite a un estudiante salirse de un aula
   * @param classroomId - ID del aula
   * @param studentId - ID del estudiante
   * @returns Resultado de la operación
   */
  async leaveClassroom(classroomId: string, studentId: string): Promise<OperationResult<void>> {
    try {
      const classroom = await this.classroomRepository.findOne({
        where: { id: classroomId, isActive: true },
        relations: ['students'],
      });

      if (!classroom) {
        throw new ResourceNotFoundException('Aula', classroomId, '/classrooms/leave');
      }

      // Verificar que el estudiante esté inscrito
      const studentIndex = classroom.students.findIndex(s => s.id === studentId);
      if (studentIndex === -1) {
        throw new OperationNotAllowedException(
          'salir del aula',
          'no estás inscrito en esta aula',
          '/classrooms/leave'
        );
      }

      // Remover el estudiante del aula
      classroom.students.splice(studentIndex, 1);
      await this.classroomRepository.save(classroom);

      return {
        success: true,
        message: 'Has salido del aula exitosamente',
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException || 
          error instanceof OperationNotAllowedException) {
        throw error;
      }

      throw new ValidationException(
        'Error al salir del aula',
        { general: [error.message] },
        '/classrooms/leave'
      );
    }
  }

  /**
   * Obtiene las aulas de un docente específico
   * @param teacherId - ID del docente
   * @returns Resultado de la operación
   */
  async getTeacherClassrooms(teacherId: string): Promise<OperationResult<Classroom[]>> {
    try {
      await this.validateTeacherPermissions(teacherId);

      const classrooms = await this.classroomRepository.find({
        where: { teacherId, isActive: true },
        relations: ['students', 'activities'],
        order: { createdAt: 'DESC' },
      });

      return {
        success: true,
        message: 'Aulas del docente obtenidas exitosamente',
        data: classrooms,
      };
    } catch (error) {
      if (error instanceof AuthorizationException) {
        throw error;
      }

      throw new ValidationException(
        'Error al obtener las aulas del docente',
        { general: [error.message] },
        '/classrooms/my-classrooms'
      );
    }
  }

  /**
   * Obtiene las aulas en las que está inscrito un estudiante
   * @param studentId - ID del estudiante
   * @returns Resultado de la operación
   */
  async getStudentClassrooms(studentId: string): Promise<OperationResult<Classroom[]>> {
    try {
      await this.validateStudentPermissions(studentId);

      const classrooms = await this.classroomRepository
        .createQueryBuilder('classroom')
        .leftJoinAndSelect('classroom.teacher', 'teacher')
        .leftJoinAndSelect('classroom.activities', 'activities')
        .leftJoin('classroom.students', 'student')
        .where('student.id = :studentId', { studentId })
        .andWhere('classroom.isActive = :isActive', { isActive: true })
        .orderBy('classroom.createdAt', 'DESC')
        .getMany();

      return {
        success: true,
        message: 'Aulas del estudiante obtenidas exitosamente',
        data: classrooms,
      };
    } catch (error) {
      if (error instanceof AuthorizationException) {
        throw error;
      }

      throw new ValidationException(
        'Error al obtener las aulas del estudiante',
        { general: [error.message] },
        '/classrooms/my-classrooms'
      );
    }
  }

  /**
   * Regenera el código de invitación de un aula
   * @param classroomId - ID del aula
   * @param userId - ID del usuario que solicita la regeneración
   * @returns Resultado de la operación
   */
  async regenerateInviteCode(classroomId: string, userId: string): Promise<OperationResult<string>> {
    try {
      const classroomResult = await this.findById(classroomId);
      if (!classroomResult.success) {
        throw new ResourceNotFoundException('Aula', classroomId, `/classrooms/${classroomId}`);
      }

      const classroom = classroomResult.data;

      // Verificar permisos
      await this.validateUpdatePermissions(classroom, userId);

      const newInviteCode = await this.generateUniqueInviteCode();
      await this.classroomRepository.update(classroomId, { 
        inviteCode: newInviteCode,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'Código de invitación regenerado exitosamente',
        data: newInviteCode,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException || 
          error instanceof AuthorizationException) {
        throw error;
      }

      throw new ValidationException(
        'Error al regenerar el código de invitación',
        { general: [error.message] },
        `/classrooms/${classroomId}/regenerate-code`
      );
    }
  }

  /**
   * Obtiene estadísticas de un aula
   * @param classroomId - ID del aula
   * @returns Resultado de la operación
   */
  async getClassroomStats(classroomId: string): Promise<OperationResult<ClassroomStats>> {
    try {
      const classroom = await this.classroomRepository.findOne({
        where: { id: classroomId, isActive: true },
        relations: ['students', 'activities'],
      });

      if (!classroom) {
        throw new ResourceNotFoundException('Aula', classroomId, `/classrooms/${classroomId}/stats`);
      }

      const stats = await this.calculateClassroomStats(classroom);

      return {
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: stats,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        throw error;
      }

      throw new ValidationException(
        'Error al obtener estadísticas del aula',
        { general: [error.message] },
        `/classrooms/${classroomId}/stats`
      );
    }
  }

  // Métodos privados para validaciones y utilidades

  private async validateTeacherPermissions(teacherId: string): Promise<void> {
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId, isActive: true },
    });

    if (!teacher) {
      throw new ResourceNotFoundException('Usuario', teacherId);
    }

    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
      throw new AuthorizationException(
        'crear aulas',
        'aula',
        teacherId
      );
    }
  }

  private async validateStudentPermissions(studentId: string): Promise<void> {
    const student = await this.userRepository.findOne({
      where: { id: studentId, isActive: true },
    });

    if (!student) {
      throw new ResourceNotFoundException('Usuario', studentId);
    }

    if (student.role !== UserRole.STUDENT) {
      throw new AuthorizationException(
        'unirse a aulas',
        'aula',
        studentId
      );
    }
  }

  private async validateTeacherLimits(teacherId: string): Promise<void> {
    const classroomCount = await this.classroomRepository.count({
      where: { teacherId, isActive: true },
    });

    if (classroomCount >= this.MAX_CLASSROOMS_PER_TEACHER) {
      throw new BusinessLimitException(
        'aulas por docente',
        classroomCount,
        this.MAX_CLASSROOMS_PER_TEACHER
      );
    }
  }

  private async validateClassroomData(createDto: CreateClassroomDto): Promise<void> {
    const errors: Record<string, string[]> = {};

    if (!createDto.name || createDto.name.trim().length < 3) {
      errors.name = ['El nombre del aula debe tener al menos 3 caracteres'];
    }

    if (createDto.name && createDto.name.length > 100) {
      errors.name = ['El nombre del aula no debe exceder 100 caracteres'];
    }

    if (createDto.description && createDto.description.length > 500) {
      errors.description = ['La descripción no debe exceder 500 caracteres'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(
        'Datos del aula inválidos',
        errors
      );
    }
  }

  private async validateUpdatePermissions(classroom: Classroom, userId: string): Promise<void> {
    if (classroom.teacherId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new AuthorizationException(
          'actualizar',
          'aula',
          userId
        );
      }
    }
  }

  private async validateDeletePermissions(classroom: Classroom, userId: string): Promise<void> {
    if (classroom.teacherId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new AuthorizationException(
          'eliminar',
          'aula',
          userId
        );
      }
    }
  }

  private async validateCanDelete(classroom: Classroom): Promise<void> {
    // Verificar si tiene actividades activas
    const activeActivitiesCount = classroom.activities?.filter(a => a.isActive).length || 0;
    
    if (activeActivitiesCount > 0) {
      throw new OperationNotAllowedException(
        'eliminar aula',
        'el aula tiene actividades activas'
      );
    }
  }

  private async validateUpdateData(updateDto: UpdateClassroomDto): Promise<void> {
    const errors: Record<string, string[]> = {};

    if (updateDto.name !== undefined) {
      if (!updateDto.name || updateDto.name.trim().length < 3) {
        errors.name = ['El nombre del aula debe tener al menos 3 caracteres'];
      }
      if (updateDto.name.length > 100) {
        errors.name = ['El nombre del aula no debe exceder 100 caracteres'];
      }
    }

    if (updateDto.description !== undefined && updateDto.description.length > 500) {
      errors.description = ['La descripción no debe exceder 500 caracteres'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(
        'Datos de actualización inválidos',
        errors
      );
    }
  }

  private async validateJoinRestrictions(classroom: Classroom, studentId: string): Promise<void> {
    // Verificar que no esté ya inscrito
    const isAlreadyEnrolled = classroom.students.some(s => s.id === studentId);
    if (isAlreadyEnrolled) {
      throw new DataConflictException(
        'inscripción',
        'ya estás inscrito en esta aula'
      );
    }

    // Verificar límite de estudiantes
    if (classroom.students.length >= this.MAX_STUDENTS_PER_CLASSROOM) {
      throw new BusinessLimitException(
        'estudiantes por aula',
        classroom.students.length,
        this.MAX_STUDENTS_PER_CLASSROOM
      );
    }
  }

  private async applyFilters(queryBuilder: any, filters: any): Promise<void> {
    const { search, subject, grade, teacherId } = filters;

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(classroom.name ILIKE :search OR classroom.description ILIKE :search OR classroom.subject ILIKE :search)',
        { search: searchTerm }
      );
    }

    if (subject && subject.trim()) {
      queryBuilder.andWhere('classroom.subject ILIKE :subject', { 
        subject: `%${subject.trim()}%` 
      });
    }

    if (grade && grade.trim()) {
      queryBuilder.andWhere('classroom.grade = :grade', { grade: grade.trim() });
    }

    if (teacherId && this.isValidUUID(teacherId)) {
      queryBuilder.andWhere('classroom.teacherId = :teacherId', { teacherId });
    }
  }

  private async calculateClassroomStats(classroom: Classroom): Promise<ClassroomStats> {
    const totalStudents = classroom.students?.length || 0;
    const totalActivities = classroom.activities?.length || 0;
    const activeActivities = classroom.activities?.filter(a => a.isActive).length || 0;
    
    // Calcular actividades completadas y promedio
    const completedActivities = classroom.activities?.filter(a => 
      a.completions && a.completions.length > 0
    ).length || 0;

    const totalScores = classroom.activities?.reduce((sum, activity) => {
      const activityScores = activity.completions?.reduce((actSum, completion) => 
        actSum + (completion.score / completion.maxScore * 100), 0) || 0;
      return sum + activityScores;
    }, 0) || 0;

    const totalCompletions = classroom.activities?.reduce((sum, activity) => 
      sum + (activity.completions?.length || 0), 0) || 0;

    const averageScore = totalCompletions > 0 ? totalScores / totalCompletions : 0;

    const lastActivity = classroom.activities?.reduce((latest, activity) => {
      return !latest || activity.createdAt > latest ? activity.createdAt : latest;
    }, null as Date) || classroom.createdAt;

    return {
      totalStudents,
      totalActivities,
      activeActivities,
      completedActivities,
      averageScore: Math.round(averageScore * 100) / 100,
      lastActivity,
      createdAt: classroom.createdAt,
      isActive: classroom.isActive,
    };
  }

  private async generateUniqueInviteCode(): Promise<string> {
    let inviteCode: string;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (exists && attempts < maxAttempts) {
      inviteCode = this.generateRandomCode();
      
      const existingClassroom = await this.classroomRepository.findOne({
        where: { inviteCode },
      });
      
      exists = !!existingClassroom;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('No se pudo generar un código de invitación único');
    }

    return inviteCode;
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < this.INVITE_CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isValidInviteCode(code: string): boolean {
    return /^[A-Z0-9]{8}$/.test(code);
  }

  private getDefaultClassroomSettings(): Record<string, any> {
    return {
      allowStudentDiscussion: true,
      requireApprovalForJoin: false,
      maxStudents: this.MAX_STUDENTS_PER_CLASSROOM,
      timezone: 'UTC',
      language: 'es',
      notifications: {
        newStudent: true,
        activityCompleted: true,
        announcements: true,
      },
    };
  }
}
