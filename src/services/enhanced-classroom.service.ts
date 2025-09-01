// ============================================================================
// SERVICIO DE AULAS VIRTUALES MEJORADO - ACALUD
// ============================================================================
// Implementación mejorada con principios SOLID y manejo robusto de errores

import { httpClient, HttpError } from './http.service';
import { Classroom } from '../types';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Datos para crear una nueva aula
 */
export interface CreateClassroomData {
  name: string;
  description?: string;
  subject: string;
  grade: string;
  teacherId: string;
}

/**
 * Datos para actualizar un aula
 */
export interface UpdateClassroomData {
  name?: string;
  description?: string;
  subject?: string;
  grade?: string;
  isActive?: boolean;
}

/**
 * Filtros para buscar aulas
 */
export interface ClassroomFilters {
  teacherId?: string;
  studentId?: string;
  subject?: string;
  grade?: string;
  isActive?: boolean;
  search?: string;
}

/**
 * Estadísticas de un aula
 */
export interface ClassroomStats {
  totalStudents: number;
  totalActivities: number;
  completedActivities: number;
  averageScore: number;
  averageCompletion: number;
  lastActivity?: Date;
  studentsProgress: Array<{
    studentId: string;
    studentName: string;
    completedActivities: number;
    averageScore: number;
    lastActivity?: Date;
  }>;
}

/**
 * Resultado de unirse a un aula
 */
export interface JoinClassroomResult {
  classroom: Classroom;
  message: string;
  isNewMember: boolean;
}

/**
 * Enum para errores específicos de aulas
 */
export enum ClassroomErrorType {
  NOT_FOUND = 'CLASSROOM_NOT_FOUND',
  INVALID_INVITE_CODE = 'INVALID_INVITE_CODE',
  ALREADY_MEMBER = 'ALREADY_MEMBER',
  NOT_MEMBER = 'NOT_MEMBER',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_DATA = 'INVALID_DATA',
  TEACHER_NOT_FOUND = 'TEACHER_NOT_FOUND',
  STUDENT_NOT_FOUND = 'STUDENT_NOT_FOUND',
  CLASSROOM_INACTIVE = 'CLASSROOM_INACTIVE',
  MAX_STUDENTS_REACHED = 'MAX_STUDENTS_REACHED',
  DUPLICATE_NAME = 'DUPLICATE_NAME'
}

/**
 * Clase para errores específicos de aulas
 */
export class ClassroomError extends Error {
  public readonly type: ClassroomErrorType;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(type: ClassroomErrorType, message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ClassroomError';
  }

  static fromHttpError(httpError: HttpError): ClassroomError {
    let type: ClassroomErrorType;
    let message = httpError.message;

    switch (httpError.statusCode) {
      case 404:
        type = ClassroomErrorType.NOT_FOUND;
        message = 'Aula no encontrada';
        break;
      case 403:
        type = ClassroomErrorType.PERMISSION_DENIED;
        message = 'No tienes permisos para realizar esta acción';
        break;
      case 409:
        type = ClassroomErrorType.ALREADY_MEMBER;
        message = 'Ya eres miembro de esta aula';
        break;
      case 422:
        type = ClassroomErrorType.INVALID_DATA;
        message = 'Datos inválidos';
        break;
      default:
        type = ClassroomErrorType.NOT_FOUND;
    }

    return new ClassroomError(type, message, httpError.statusCode, httpError);
  }
}

/**
 * Validador para datos de aulas
 */
export class ClassroomValidator {
  static validateCreateData(data: CreateClassroomData): string[] {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string') {
      errors.push('El nombre del aula es requerido');
    } else if (data.name.trim().length < 3) {
      errors.push('El nombre del aula debe tener al menos 3 caracteres');
    } else if (data.name.length > 100) {
      errors.push('El nombre del aula es demasiado largo');
    }

    if (!data.subject || typeof data.subject !== 'string') {
      errors.push('La materia es requerida');
    } else if (data.subject.trim().length < 2) {
      errors.push('La materia debe tener al menos 2 caracteres');
    }

    if (!data.grade || typeof data.grade !== 'string') {
      errors.push('El grado es requerido');
    } else if (data.grade.trim().length < 1) {
      errors.push('El grado es requerido');
    }

    if (!data.teacherId || typeof data.teacherId !== 'string') {
      errors.push('El ID del docente es requerido');
    }

    if (data.description && typeof data.description === 'string' && data.description.length > 500) {
      errors.push('La descripción es demasiado larga');
    }

    return errors;
  }

  static validateUpdateData(data: UpdateClassroomData): string[] {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        errors.push('El nombre del aula debe ser una cadena de texto');
      } else if (data.name.trim().length < 3) {
        errors.push('El nombre del aula debe tener al menos 3 caracteres');
      } else if (data.name.length > 100) {
        errors.push('El nombre del aula es demasiado largo');
      }
    }

    if (data.subject !== undefined) {
      if (typeof data.subject !== 'string') {
        errors.push('La materia debe ser una cadena de texto');
      } else if (data.subject.trim().length < 2) {
        errors.push('La materia debe tener al menos 2 caracteres');
      }
    }

    if (data.grade !== undefined) {
      if (typeof data.grade !== 'string') {
        errors.push('El grado debe ser una cadena de texto');
      } else if (data.grade.trim().length < 1) {
        errors.push('El grado es requerido');
      }
    }

    if (data.description !== undefined && typeof data.description === 'string' && data.description.length > 500) {
      errors.push('La descripción es demasiado larga');
    }

    return errors;
  }

  static validateInviteCode(inviteCode: string): string[] {
    const errors: string[] = [];

    if (!inviteCode || typeof inviteCode !== 'string') {
      errors.push('El código de invitación es requerido');
      return errors;
    }

    if (inviteCode.length !== 6) {
      errors.push('El código de invitación debe tener 6 caracteres');
    }

    if (!/^[A-Z0-9]+$/.test(inviteCode)) {
      errors.push('El código de invitación solo puede contener letras mayúsculas y números');
    }

    return errors;
  }
}

/**
 * Interfaz para el repositorio de aulas
 */
export interface IClassroomRepository {
  getAll(filters?: ClassroomFilters): Promise<Classroom[]>;
  getById(id: string): Promise<Classroom | null>;
  getByInviteCode(inviteCode: string): Promise<Classroom | null>;
  create(data: CreateClassroomData): Promise<Classroom>;
  update(id: string, data: UpdateClassroomData): Promise<Classroom>;
  delete(id: string): Promise<void>;
  addStudent(classroomId: string, studentId: string): Promise<Classroom>;
  removeStudent(classroomId: string, studentId: string): Promise<Classroom>;
  getStats(classroomId: string): Promise<ClassroomStats>;
  generateNewInviteCode(classroomId: string): Promise<string>;
}

/**
 * Repositorio para aulas usando API HTTP
 */
export class HttpClassroomRepository implements IClassroomRepository {
  private readonly basePath = '/classrooms';

  async getAll(filters?: ClassroomFilters): Promise<Classroom[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const queryString = params.toString();
      const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
      
      return await httpClient.get<Classroom[]>(endpoint);
    } catch (error) {
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async getById(id: string): Promise<Classroom | null> {
    try {
      return await httpClient.get<Classroom>(`${this.basePath}/${id}`);
    } catch (error: any) {
      if (error instanceof HttpError && error.statusCode === 404) {
        return null;
      }
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async getByInviteCode(inviteCode: string): Promise<Classroom | null> {
    try {
      return await httpClient.get<Classroom>(`${this.basePath}/invite/${inviteCode}`);
    } catch (error: any) {
      if (error instanceof HttpError && error.statusCode === 404) {
        return null;
      }
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async create(data: CreateClassroomData): Promise<Classroom> {
    try {
      return await httpClient.post<Classroom>(this.basePath, data);
    } catch (error) {
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateClassroomData): Promise<Classroom> {
    try {
      return await httpClient.put<Classroom>(`${this.basePath}/${id}`, data);
    } catch (error) {
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await httpClient.delete<void>(`${this.basePath}/${id}`);
    } catch (error) {
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async addStudent(classroomId: string, studentId: string): Promise<Classroom> {
    try {
      return await httpClient.post<Classroom>(`${this.basePath}/${classroomId}/students`, {
        studentId
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async removeStudent(classroomId: string, studentId: string): Promise<Classroom> {
    try {
      return await httpClient.delete<Classroom>(`${this.basePath}/${classroomId}/students/${studentId}`);
    } catch (error) {
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async getStats(classroomId: string): Promise<ClassroomStats> {
    try {
      return await httpClient.get<ClassroomStats>(`${this.basePath}/${classroomId}/stats`);
    } catch (error) {
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }

  async generateNewInviteCode(classroomId: string): Promise<string> {
    try {
      const response = await httpClient.post<{ inviteCode: string }>(`${this.basePath}/${classroomId}/invite-code`);
      return response.inviteCode;
    } catch (error) {
      if (error instanceof HttpError) {
        throw ClassroomError.fromHttpError(error);
      }
      throw error;
    }
  }
}

/**
 * Servicio de aulas con principios SOLID y manejo robusto de errores
 */
export interface IEnhancedClassroomService {
  getClassrooms(filters?: ClassroomFilters): Promise<Classroom[]>;
  getClassroomById(id: string): Promise<Classroom>;
  getClassroomsByTeacher(teacherId: string): Promise<Classroom[]>;
  getClassroomsByStudent(studentId: string): Promise<Classroom[]>;
  createClassroom(data: CreateClassroomData): Promise<Classroom>;
  updateClassroom(id: string, data: UpdateClassroomData): Promise<Classroom>;
  deleteClassroom(id: string): Promise<void>;
  joinClassroomByCode(inviteCode: string, studentId: string): Promise<JoinClassroomResult>;
  leaveClassroom(classroomId: string, studentId: string): Promise<void>;
  removeStudentFromClassroom(classroomId: string, studentId: string, requesterId: string): Promise<void>;
  generateNewInviteCode(classroomId: string, requesterId: string): Promise<string>;
  getClassroomStats(classroomId: string, requesterId: string): Promise<ClassroomStats>;
  validateClassroomAccess(classroomId: string, userId: string): Promise<boolean>;
}

/**
 * Implementación del servicio de aulas mejorado
 */
export class EnhancedClassroomService implements IEnhancedClassroomService {
  private static instance: EnhancedClassroomService;
  
  constructor(private repository: IClassroomRepository = new HttpClassroomRepository()) {}

  public static getInstance(repository?: IClassroomRepository): EnhancedClassroomService {
    if (!EnhancedClassroomService.instance) {
      EnhancedClassroomService.instance = new EnhancedClassroomService(repository);
    }
    return EnhancedClassroomService.instance;
  }

  async getClassrooms(filters?: ClassroomFilters): Promise<Classroom[]> {
    try {
      return await this.repository.getAll(filters);
    } catch (error) {
      console.error('Error al obtener aulas:', error);
      throw error;
    }
  }

  async getClassroomById(id: string): Promise<Classroom> {
    if (!id || typeof id !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de aula inválido',
        400
      );
    }

    try {
      const classroom = await this.repository.getById(id);
      if (!classroom) {
        throw new ClassroomError(
          ClassroomErrorType.NOT_FOUND,
          'Aula no encontrada',
          404
        );
      }
      return classroom;
    } catch (error) {
      if (error instanceof ClassroomError) {
        throw error;
      }
      console.error('Error al obtener aula por ID:', error);
      throw error;
    }
  }

  async getClassroomsByTeacher(teacherId: string): Promise<Classroom[]> {
    if (!teacherId || typeof teacherId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de docente inválido',
        400
      );
    }

    try {
      return await this.repository.getAll({ teacherId });
    } catch (error) {
      console.error('Error al obtener aulas por docente:', error);
      throw error;
    }
  }

  async getClassroomsByStudent(studentId: string): Promise<Classroom[]> {
    if (!studentId || typeof studentId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de estudiante inválido',
        400
      );
    }

    try {
      return await this.repository.getAll({ studentId });
    } catch (error) {
      console.error('Error al obtener aulas por estudiante:', error);
      throw error;
    }
  }

  async createClassroom(data: CreateClassroomData): Promise<Classroom> {
    // Validar datos de entrada
    const validationErrors = ClassroomValidator.validateCreateData(data);
    if (validationErrors.length > 0) {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        validationErrors.join(', '),
        422,
        { validationErrors }
      );
    }

    try {
      return await this.repository.create({
        ...data,
        name: data.name.trim(),
        subject: data.subject.trim(),
        grade: data.grade.trim(),
        description: data.description?.trim()
      });
    } catch (error) {
      console.error('Error al crear aula:', error);
      throw error;
    }
  }

  async updateClassroom(id: string, data: UpdateClassroomData): Promise<Classroom> {
    if (!id || typeof id !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de aula inválido',
        400
      );
    }

    // Validar datos de entrada
    const validationErrors = ClassroomValidator.validateUpdateData(data);
    if (validationErrors.length > 0) {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        validationErrors.join(', '),
        422,
        { validationErrors }
      );
    }

    try {
      // Limpiar datos de texto
      const cleanData: UpdateClassroomData = {};
      if (data.name !== undefined) cleanData.name = data.name.trim();
      if (data.subject !== undefined) cleanData.subject = data.subject.trim();
      if (data.grade !== undefined) cleanData.grade = data.grade.trim();
      if (data.description !== undefined) cleanData.description = data.description?.trim();
      if (data.isActive !== undefined) cleanData.isActive = data.isActive;

      return await this.repository.update(id, cleanData);
    } catch (error) {
      console.error('Error al actualizar aula:', error);
      throw error;
    }
  }

  async deleteClassroom(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de aula inválido',
        400
      );
    }

    try {
      await this.repository.delete(id);
    } catch (error) {
      console.error('Error al eliminar aula:', error);
      throw error;
    }
  }

  async joinClassroomByCode(inviteCode: string, studentId: string): Promise<JoinClassroomResult> {
    // Validar código de invitación
    const codeValidationErrors = ClassroomValidator.validateInviteCode(inviteCode);
    if (codeValidationErrors.length > 0) {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_INVITE_CODE,
        codeValidationErrors.join(', '),
        400
      );
    }

    if (!studentId || typeof studentId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de estudiante inválido',
        400
      );
    }

    try {
      // Buscar aula por código
      const classroom = await this.repository.getByInviteCode(inviteCode.toUpperCase());
      if (!classroom) {
        throw new ClassroomError(
          ClassroomErrorType.INVALID_INVITE_CODE,
          'Código de invitación inválido o expirado',
          404
        );
      }

      // Verificar si el aula está activa
      if (!classroom.isActive) {
        throw new ClassroomError(
          ClassroomErrorType.CLASSROOM_INACTIVE,
          'Esta aula ya no está activa',
          403
        );
      }

      // Verificar si ya es miembro
      const isAlreadyMember = classroom.students.some((student: any) => student.id === studentId);
      if (isAlreadyMember) {
        return {
          classroom,
          message: 'Ya eres miembro de esta aula',
          isNewMember: false
        };
      }

      // Unirse al aula
      const updatedClassroom = await this.repository.addStudent(classroom.id, studentId);
      
      return {
        classroom: updatedClassroom,
        message: 'Te has unido exitosamente al aula',
        isNewMember: true
      };
    } catch (error) {
      if (error instanceof ClassroomError) {
        throw error;
      }
      console.error('Error al unirse al aula:', error);
      throw error;
    }
  }

  async leaveClassroom(classroomId: string, studentId: string): Promise<void> {
    if (!classroomId || typeof classroomId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de aula inválido',
        400
      );
    }

    if (!studentId || typeof studentId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de estudiante inválido',
        400
      );
    }

    try {
      await this.repository.removeStudent(classroomId, studentId);
    } catch (error) {
      console.error('Error al salir del aula:', error);
      throw error;
    }
  }

  async removeStudentFromClassroom(classroomId: string, studentId: string, requesterId: string): Promise<void> {
    if (!classroomId || typeof classroomId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de aula inválido',
        400
      );
    }

    if (!studentId || typeof studentId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de estudiante inválido',
        400
      );
    }

    if (!requesterId || typeof requesterId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de solicitante inválido',
        400
      );
    }

    try {
      // Verificar permisos (debe ser el docente del aula)
      const classroom = await this.getClassroomById(classroomId);
      if (classroom.teacherId !== requesterId) {
        throw new ClassroomError(
          ClassroomErrorType.PERMISSION_DENIED,
          'Solo el docente puede remover estudiantes',
          403
        );
      }

      await this.repository.removeStudent(classroomId, studentId);
    } catch (error) {
      if (error instanceof ClassroomError) {
        throw error;
      }
      console.error('Error al remover estudiante:', error);
      throw error;
    }
  }

  async generateNewInviteCode(classroomId: string, requesterId: string): Promise<string> {
    if (!classroomId || typeof classroomId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de aula inválido',
        400
      );
    }

    if (!requesterId || typeof requesterId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de solicitante inválido',
        400
      );
    }

    try {
      // Verificar permisos (debe ser el docente del aula)
      const classroom = await this.getClassroomById(classroomId);
      if (classroom.teacherId !== requesterId) {
        throw new ClassroomError(
          ClassroomErrorType.PERMISSION_DENIED,
          'Solo el docente puede generar nuevos códigos de invitación',
          403
        );
      }

      return await this.repository.generateNewInviteCode(classroomId);
    } catch (error) {
      if (error instanceof ClassroomError) {
        throw error;
      }
      console.error('Error al generar código de invitación:', error);
      throw error;
    }
  }

  async getClassroomStats(classroomId: string, requesterId: string): Promise<ClassroomStats> {
    if (!classroomId || typeof classroomId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de aula inválido',
        400
      );
    }

    if (!requesterId || typeof requesterId !== 'string') {
      throw new ClassroomError(
        ClassroomErrorType.INVALID_DATA,
        'ID de solicitante inválido',
        400
      );
    }

    try {
      // Verificar acceso al aula
      const hasAccess = await this.validateClassroomAccess(classroomId, requesterId);
      if (!hasAccess) {
        throw new ClassroomError(
          ClassroomErrorType.PERMISSION_DENIED,
          'No tienes permisos para ver las estadísticas de esta aula',
          403
        );
      }

      return await this.repository.getStats(classroomId);
    } catch (error) {
      if (error instanceof ClassroomError) {
        throw error;
      }
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }

  async validateClassroomAccess(classroomId: string, userId: string): Promise<boolean> {
    try {
      const classroom = await this.getClassroomById(classroomId);
      
      // El docente siempre tiene acceso
      if (classroom.teacherId === userId) {
        return true;
      }
      
      // Verificar si es estudiante del aula
      return classroom.students.some((student: any) => student.id === userId);
    } catch (error) {
      console.error('Error al validar acceso al aula:', error);
      return false;
    }
  }
}

// Instancia singleton del servicio mejorado
export const enhancedClassroomService = EnhancedClassroomService.getInstance();
