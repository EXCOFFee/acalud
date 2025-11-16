/**
 * ✅ SERVICIO DE AULAS REFACTORIZADO - RESPETANDO PRINCIPIOS SOLID
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Cada clase tiene una sola responsabilidad
 * - OCP: Extensible sin modificar código existente
 * - LSP: Interfaces bien definidas
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Depende de abstracciones, no de concreciones
 */

import { Injectable, Inject } from '@nestjs/common';
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
  ValidationException,
  OperationNotAllowedException
} from '../../../common/exceptions/business.exception';
import { CLASSROOM_TOKENS } from '../tokens';

/**
 * 🎯 SERVICIO PRINCIPAL DE AULAS
 * 
 * RESPONSABILIDAD ÚNICA: Coordinar operaciones de aulas
 * No contiene lógica de validación, generación de códigos o permisos
 */
@Injectable()
export class ClassroomService implements IClassroomService {
  // El constructor recibe todas las dependencias necesarias para operar sobre aulas utilizando inyección de NestJS.
  constructor(
    @Inject(CLASSROOM_TOKENS.IClassroomRepository)
    private readonly classroomRepository: IClassroomRepository,
    @Inject(CLASSROOM_TOKENS.IClassroomValidator)
    private readonly validator: IClassroomValidator,
    @Inject(CLASSROOM_TOKENS.IInviteCodeGenerator)
    private readonly codeGenerator: IInviteCodeGenerator,
    @Inject(CLASSROOM_TOKENS.IPermissionValidator)
    private readonly permissionValidator: IPermissionValidator,
  ) {}

  // Crea un aula nueva validando datos, permisos y generando un código de invitación único para el docente actual.
  async createClassroom(
    createDto: CreateClassroomDto, 
    teacherId: string
  ): Promise<Classroom> {
    // ✅ Delegamos validación a componente especializado
    await this.validator.validateCreateData(createDto);
    await this.permissionValidator.validateCanCreateClassroom(teacherId);

    // ✅ Delegamos generación de código a componente especializado
    const inviteCode = await this.codeGenerator.generateUniqueCode();

    // Normalizamos etiquetas e invitaciones para mantener consistencia en base de datos
    const normalizedTags = createDto.tags
      ? Array.from(new Set(createDto.tags.map(tag => tag.trim().toLowerCase()))).slice(0, 10)
      : undefined;

    const normalizedInvites = createDto.invitedStudentEmails
      ? Array.from(new Set(createDto.invitedStudentEmails.map(email => email.trim().toLowerCase()))).slice(0, 20)
      : undefined;

    // ✅ Solo coordinamos, no implementamos lógica compleja
    const classroomData: CreateClassroomData = {
      ...createDto,
      teacherId,
      inviteCode,
      isActive: true,
      createdAt: new Date(),
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
        ...(createDto.settings || {}),
      },
      level: createDto.level || 'intermedio',
      timezone: createDto.timezone || 'America/Santiago',
      language: createDto.language || 'es',
      tags: normalizedTags,
      invitedStudentEmails: normalizedInvites,
    };

    return this.classroomRepository.create(classroomData);
  }

  // Recupera aulas aplicando filtros paginados tras validar que los criterios enviados sean correctos.
  async findClassrooms(filters: ClassroomFilters): Promise<PaginatedResult<Classroom>> {
    // ✅ Validación simple de filtros
    await this.validator.validateFilters(filters);
    
    // ✅ Delegamos búsqueda al repositorio
    return this.classroomRepository.findWithFilters(filters);
  }

  // Busca un aula por su identificador y confirma que esté activa; lanza excepciones si no cumple las condiciones.
  async findClassroomById(id: string): Promise<Classroom> {
    const classroom = await this.classroomRepository.findById(id);
    
    if (!classroom) {
      throw new ResourceNotFoundException('Aula', id);
    }

    if (!classroom.isActive) {
      throw new OperationNotAllowedException('ver aula', 'el aula no está disponible');
    }

    return classroom;
  }

  async findClassroomByInviteCode(inviteCode: string): Promise<Classroom> {
    const classroom = await this.classroomRepository.findByInviteCode(inviteCode);

    if (!classroom) {
      throw new ResourceNotFoundException('Aula', inviteCode);
    }

    return classroom;
  }

  // Actualiza los datos básicos de un aula tras validar la petición y los permisos del usuario.
  async updateClassroom(
    id: string,
    updateDto: UpdateClassroomDto,
    userId: string
  ): Promise<Classroom> {
    // ✅ Validaciones especializadas
    await this.validator.validateUpdateData(updateDto);
    await this.permissionValidator.validateCanModifyClassroom(id, userId);

    // ✅ Solo coordinamos la actualización
    return this.classroomRepository.update(id, updateDto);
  }

  // Elimina un aula si el usuario tiene permisos y no existen estudiantes inscritos actualmente.
  async deleteClassroom(id: string, userId: string): Promise<void> {
    // ✅ Validar permisos
    await this.permissionValidator.validateCanDeleteClassroom(id, userId);

    // ✅ Verificar reglas de negocio
    const studentCount = await this.classroomRepository.getStudentCount(id);
    if (studentCount > 0) {
      throw new OperationNotAllowedException(
        'eliminar aula',
        `el aula tiene ${studentCount} estudiante(s) inscritos`
      );
    }

    return this.classroomRepository.delete(id);
  }

  async getTeacherClassrooms(teacherId: string): Promise<Classroom[]> {
    await this.permissionValidator.validateCanCreateClassroom(teacherId);
    return this.classroomRepository.findTeacherClassrooms(teacherId);
  }

  async getStudentClassrooms(studentId: string): Promise<Classroom[]> {
    await this.permissionValidator.validateCanJoinClassroom(studentId);
    return this.classroomRepository.findStudentClassrooms(studentId);
  }

  // Permite a un estudiante unirse a un aula usando un código de invitación válido, aplicando todas las validaciones necesarias.
  async joinClassroom(joinDto: JoinClassroomDto, studentId: string): Promise<Classroom> {
    // ✅ Validaciones distribuidas por responsabilidad
    await this.validator.validateJoinData(joinDto);
    await this.permissionValidator.validateCanJoinClassroom(studentId);

    const classroom = await this.classroomRepository.findByInviteCode(joinDto.inviteCode);
    
    if (!classroom) {
      throw new ValidationException(
        'Código de invitación inválido',
        { inviteCode: ['El código de invitación no existe o ha expirado'] }
      );
    }

    await this.validator.validateCanJoinSpecificClassroom(classroom, studentId);

    return this.classroomRepository.addStudent(classroom.id, studentId);
  }

  // Gestiona la salida voluntaria de un estudiante de un aula, asegurando que la referencia exista antes de removerlo.
  async leaveClassroom(classroomId: string, studentId: string): Promise<void> {
    // ✅ Verificar que el aula existe
    await this.findClassroomById(classroomId);

    // ✅ Remover estudiante
    await this.classroomRepository.removeStudent(classroomId, studentId);
  }

  // Genera un nuevo código de invitación para un aula después de comprobar permisos y existencia del recurso.
  async generateNewInviteCode(classroomId: string, userId: string): Promise<string> {
    // ✅ Validar permisos
    await this.permissionValidator.validateCanModifyClassroom(classroomId, userId);

    // ✅ Verificar que el aula existe
    await this.findClassroomById(classroomId);

    // ✅ Generar nuevo código
    const newInviteCode = await this.codeGenerator.generateUniqueCode();

    // ✅ Actualizar aula
    await this.classroomRepository.update(classroomId, { inviteCode: newInviteCode });

    return newInviteCode;
  }

  // Calcula estadísticas relevantes del aula combinando información del repositorio y de la entidad existente.
  async getClassroomStats(classroomId: string): Promise<ClassroomStats> {
    // ✅ Verificar que el aula existe
    const classroom = await this.findClassroomById(classroomId);

    // ✅ Obtener estadísticas
    const totalStudents = await this.classroomRepository.getStudentCount(classroomId);
    
    return {
      totalStudents,
      totalActivities: classroom.activities?.length || 0,
      activeActivities: classroom.activities?.filter(a => a.isActive).length || 0,
      averageCompletion: 0, // TODO: Calcular cuando exista un módulo de progreso
      lastActivity: null, // TODO: Obtener de activities cuando esté disponible
      createdAt: classroom.createdAt,
      isActive: classroom.isActive,
    };
  }

  async addActivityToClassroom(
    classroomId: string,
    activityId: string,
    userId: string,
  ): Promise<Classroom> {
    throw new OperationNotAllowedException('agregar actividades', 'esta operación no está disponible en el servicio simplificado');
  }

  async removeActivityFromClassroom(
    classroomId: string,
    activityId: string,
    userId: string,
  ): Promise<void> {
    throw new OperationNotAllowedException('quitar actividades', 'esta operación no está disponible en el servicio simplificado');
  }
}
