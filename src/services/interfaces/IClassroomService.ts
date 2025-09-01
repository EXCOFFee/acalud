// ============================================================================
// INTERFACE DEL SERVICIO DE AULAS VIRTUALES
// ============================================================================
// Define el contrato para el servicio de aulas virtuales

import { Classroom } from '../../types';

/**
 * Interface que define las operaciones para el manejo de aulas virtuales
 */
export interface IClassroomService {
  /**
   * Obtiene todas las aulas de un docente
   * @param teacherId - ID del docente
   * @returns Promise con array de aulas
   */
  getClassroomsByTeacher(teacherId: string): Promise<Classroom[]>;

  /**
   * Obtiene todas las aulas donde está inscrito un estudiante
   * @param studentId - ID del estudiante
   * @returns Promise con array de aulas
   */
  getClassroomsByStudent(studentId: string): Promise<Classroom[]>;

  /**
   * Obtiene un aula por su ID
   * @param classroomId - ID del aula
   * @returns Promise con el aula encontrada o null
   */
  getClassroomById(classroomId: string): Promise<Classroom | null>;

  /**
   * Crea una nueva aula virtual
   * @param classroomData - Datos del aula a crear
   * @returns Promise con el aula creada
   */
  createClassroom(classroomData: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt' | 'students' | 'activities' | 'inviteCode'>): Promise<Classroom>;

  /**
   * Actualiza los datos de un aula
   * @param classroomId - ID del aula
   * @param updates - Datos a actualizar
   * @returns Promise con el aula actualizada
   */
  updateClassroom(classroomId: string, updates: Partial<Classroom>): Promise<Classroom>;

  /**
   * Elimina un aula virtual
   * @param classroomId - ID del aula
   * @returns Promise<void>
   */
  deleteClassroom(classroomId: string): Promise<void>;

  /**
   * Obtiene un aula por su código de invitación
   * @param inviteCode - Código de invitación del aula
   * @returns Promise con el aula encontrada o null
   */
  getClassroomByInviteCode(inviteCode: string): Promise<Classroom | null>;

  /**
   * Agrega un estudiante a un aula usando código de invitación
   * @param inviteCode - Código de invitación del aula
   * @param studentId - ID del estudiante
   * @returns Promise con el aula actualizada
   */
  joinClassroomByCode(inviteCode: string, studentId: string): Promise<Classroom>;

  /**
   * Remueve un estudiante de un aula
   * @param classroomId - ID del aula
   * @param studentId - ID del estudiante
   * @returns Promise con el aula actualizada
   */
  removeStudentFromClassroom(classroomId: string, studentId: string): Promise<Classroom>;

  /**
   * Genera un nuevo código de invitación para un aula
   * @param classroomId - ID del aula
   * @returns Promise con el nuevo código
   */
  generateNewInviteCode(classroomId: string): Promise<string>;

  /**
   * Obtiene las estadísticas de un aula
   * @param classroomId - ID del aula
   * @returns Promise con las estadísticas
   */
  getClassroomStats(classroomId: string): Promise<{
    totalStudents: number;
    totalActivities: number;
    averageCompletion: number;
    averageScore: number;
  }>;
}