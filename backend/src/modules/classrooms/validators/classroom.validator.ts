/**
 * ✅ IMPLEMENTACIÓN DEL VALIDADOR DE AULAS
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Solo se encarga de validar datos de aulas
 * - OCP: Extensible para nuevas validaciones sin modificar código existente
 * - DIP: Puede usar diferentes tipos de validadores
 */

import { Injectable } from '@nestjs/common';
import { 
  IClassroomValidator, 
  CreateClassroomDto, 
  UpdateClassroomDto, 
  JoinClassroomDto,
  ClassroomFilters,
  Classroom 
} from '../interfaces';
import { ValidationException } from '../../../common/exceptions/business.exception';

@Injectable()
export class ClassroomValidator implements IClassroomValidator {
  private readonly MIN_NAME_LENGTH = 3;
  private readonly MAX_NAME_LENGTH = 100;
  private readonly MAX_DESCRIPTION_LENGTH = 500;
  private readonly MAX_STUDENTS_PER_CLASSROOM = 100;

  async validateCreateData(data: CreateClassroomDto): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Validar nombre
    if (!data.name || data.name.trim().length < this.MIN_NAME_LENGTH) {
      errors.name = [`El nombre debe tener al menos ${this.MIN_NAME_LENGTH} caracteres`];
    }
    if (data.name && data.name.length > this.MAX_NAME_LENGTH) {
      errors.name = [`El nombre no debe exceder ${this.MAX_NAME_LENGTH} caracteres`];
    }

    // Validar descripción
    if (!data.description || data.description.trim().length < 10) {
      errors.description = ['La descripción debe tener al menos 10 caracteres'];
    }
    if (data.description && data.description.length > this.MAX_DESCRIPTION_LENGTH) {
      errors.description = [`La descripción no debe exceder ${this.MAX_DESCRIPTION_LENGTH} caracteres`];
    }

    // Validar materia
    if (!data.subject || data.subject.trim().length < 2) {
      errors.subject = ['La materia debe tener al menos 2 caracteres'];
    }

    // Validar grado
    if (!data.grade || data.grade.trim().length < 1) {
      errors.grade = ['El grado es obligatorio'];
    }

    // Validar color (si se proporciona)
    if (data.color && !this.isValidHexColor(data.color)) {
      errors.color = ['El color debe ser un código hexadecimal válido'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Datos de aula inválidos', errors);
    }
  }

  async validateUpdateData(data: UpdateClassroomDto): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Validar nombre (solo si se proporciona)
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length < this.MIN_NAME_LENGTH) {
        errors.name = [`El nombre debe tener al menos ${this.MIN_NAME_LENGTH} caracteres`];
      }
      if (data.name.length > this.MAX_NAME_LENGTH) {
        errors.name = [`El nombre no debe exceder ${this.MAX_NAME_LENGTH} caracteres`];
      }
    }

    // Validar descripción (solo si se proporciona)
    if (data.description !== undefined) {
      if (!data.description || data.description.trim().length < 10) {
        errors.description = ['La descripción debe tener al menos 10 caracteres'];
      }
      if (data.description.length > this.MAX_DESCRIPTION_LENGTH) {
        errors.description = [`La descripción no debe exceder ${this.MAX_DESCRIPTION_LENGTH} caracteres`];
      }
    }

    // Validar color (solo si se proporciona)
    if (data.color !== undefined && !this.isValidHexColor(data.color)) {
      errors.color = ['El color debe ser un código hexadecimal válido'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Datos de actualización inválidos', errors);
    }
  }

  async validateJoinData(data: JoinClassroomDto): Promise<void> {
    const errors: Record<string, string[]> = {};

    if (!data.inviteCode || data.inviteCode.trim().length === 0) {
      errors.inviteCode = ['El código de invitación es obligatorio'];
    }

    if (data.inviteCode && data.inviteCode.length !== 8) {
      errors.inviteCode = ['El código de invitación debe tener 8 caracteres'];
    }

    if (data.inviteCode && !/^[A-Z0-9]+$/.test(data.inviteCode)) {
      errors.inviteCode = ['El código de invitación debe contener solo letras mayúsculas y números'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Código de invitación inválido', errors);
    }
  }

  async validateFilters(filters: ClassroomFilters): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Validar paginación
    if (filters.page < 1) {
      errors.page = ['La página debe ser mayor a 0'];
    }

    if (filters.limit < 1 || filters.limit > 100) {
      errors.limit = ['El límite debe estar entre 1 y 100'];
    }

    // Validar búsqueda (si se proporciona)
    if (filters.search !== undefined && filters.search.length > 100) {
      errors.search = ['El término de búsqueda no debe exceder 100 caracteres'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Filtros de búsqueda inválidos', errors);
    }
  }

  async validateCanJoinSpecificClassroom(classroom: Classroom, studentId: string): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Verificar que el aula esté activa
    if (!classroom.isActive) {
      errors.classroom = ['El aula no está disponible'];
    }

    // Verificar capacidad máxima (si hay estudiantes cargados)
    if (classroom.students && classroom.students.length >= this.MAX_STUDENTS_PER_CLASSROOM) {
      errors.capacity = [`El aula ha alcanzado su capacidad máxima de ${this.MAX_STUDENTS_PER_CLASSROOM} estudiantes`];
    }

    // Verificar que el estudiante no esté ya inscrito
    if (classroom.students && classroom.students.some(student => student.id === studentId)) {
      errors.enrollment = ['Ya estás inscrito en esta aula'];
    }

    // Verificar que no sea el docente tratando de unirse como estudiante
    if (classroom.teacherId === studentId) {
      errors.role = ['El docente no puede unirse a su propia aula como estudiante'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException('No es posible unirse a esta aula', errors);
    }
  }

  async validateClassroomCapacity(classroomId: string): Promise<void> {
    // Esta validación requeriría acceso al repositorio para contar estudiantes
    // Se implementaría según la arquitectura específica
    // Por ahora, es un placeholder para mantener la interface
  }

  /**
   * Valida si un color es un código hexadecimal válido
   */
  private isValidHexColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }
}
