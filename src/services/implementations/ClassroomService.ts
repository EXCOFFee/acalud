// ============================================================================
// IMPLEMENTACIÓN DEL SERVICIO DE AULAS VIRTUALES
// ============================================================================
// Implementa la interface IClassroomService con lógica de negocio

import { IClassroomService } from '../interfaces/IClassroomService';
import { Classroom } from '../../types';
import { UserService } from './UserService';

/**
 * Implementación concreta del servicio de aulas virtuales
 */
export class ClassroomService implements IClassroomService {
  private static instance: ClassroomService;
  private classrooms: Map<string, Classroom> = new Map();
  private userService: UserService;

  /**
   * Implementa el patrón Singleton
   */
  public static getInstance(): ClassroomService {
    if (!ClassroomService.instance) {
      ClassroomService.instance = new ClassroomService();
    }
    return ClassroomService.instance;
  }

  /**
   * Constructor privado para Singleton
   */
  private constructor() {
    this.userService = UserService.getInstance();
    this.initializeDemoData();
  }

  /**
   * Inicializa datos de demostración
   */
  private async initializeDemoData(): Promise<void> {
    const teacher = await this.userService.getUserById('teacher-1');
    if (teacher) {
      const demoClassroom: Classroom = {
        id: 'classroom-1',
        name: 'Matemáticas 5to Grado',
        description: 'Aula virtual para practicar matemáticas de manera divertida',
        subject: 'Matemáticas',
        grade: '5to Grado',
        teacherId: teacher.id,
        teacher: teacher,
        students: [],
        activities: [],
        inviteCode: this.generateInviteCode(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.classrooms.set(demoClassroom.id, demoClassroom);
    }
  }

  /**
   * Obtiene todas las aulas de un docente
   */
  async getClassroomsByTeacher(teacherId: string): Promise<Classroom[]> {
    const classrooms: Classroom[] = [];
    for (const classroom of this.classrooms.values()) {
      if (classroom.teacherId === teacherId) {
        classrooms.push(classroom);
      }
    }
    return classrooms;
  }

  /**
   * Obtiene todas las aulas donde está inscrito un estudiante
   */
  async getClassroomsByStudent(studentId: string): Promise<Classroom[]> {
    const classrooms: Classroom[] = [];
    for (const classroom of this.classrooms.values()) {
      if (classroom.students.some(student => student.id === studentId)) {
        classrooms.push(classroom);
      }
    }
    return classrooms;
  }

  /**
   * Obtiene un aula por su ID
   */
  async getClassroomById(classroomId: string): Promise<Classroom | null> {
    return this.classrooms.get(classroomId) || null;
  }

  /**
   * Crea una nueva aula virtual
   */
  async createClassroom(classroomData: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt' | 'students' | 'activities' | 'inviteCode'>): Promise<Classroom> {
    const teacher = await this.userService.getUserById(classroomData.teacherId);
    if (!teacher) {
      throw new Error('Docente no encontrado');
    }

    const newClassroom: Classroom = {
      ...classroomData,
      id: this.generateId(),
      teacher: teacher,
      students: [],
      activities: [],
      inviteCode: this.generateInviteCode(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.classrooms.set(newClassroom.id, newClassroom);
    return newClassroom;
  }

  /**
   * Actualiza los datos de un aula
   */
  async updateClassroom(classroomId: string, updates: Partial<Classroom>): Promise<Classroom> {
    const existingClassroom = this.classrooms.get(classroomId);
    if (!existingClassroom) {
      throw new Error('Aula no encontrada');
    }

    const updatedClassroom: Classroom = {
      ...existingClassroom,
      ...updates,
      updatedAt: new Date()
    };

    this.classrooms.set(classroomId, updatedClassroom);
    return updatedClassroom;
  }

  /**
   * Elimina un aula virtual
   */
  async deleteClassroom(classroomId: string): Promise<void> {
    this.classrooms.delete(classroomId);
  }

  /**
   * Obtiene un aula por su código de invitación
   */
  async getClassroomByInviteCode(inviteCode: string): Promise<Classroom | null> {
    for (const classroom of this.classrooms.values()) {
      if (classroom.inviteCode === inviteCode) {
        return classroom;
      }
    }
    return null;
  }

  /**
   * Agrega un estudiante a un aula usando código de invitación
   */
  async joinClassroomByCode(inviteCode: string, studentId: string): Promise<Classroom> {
    // Buscar aula por código de invitación
    let targetClassroom: Classroom | null = null;
    for (const classroom of this.classrooms.values()) {
      if (classroom.inviteCode === inviteCode) {
        targetClassroom = classroom;
        break;
      }
    }

    if (!targetClassroom) {
      throw new Error('Código de invitación inválido');
    }

    // Verificar que el usuario sea estudiante
    const student = await this.userService.getUserById(studentId);
    if (!student || student.role !== 'student') {
      throw new Error('Solo los estudiantes pueden unirse a las aulas');
    }

    // Verificar que no esté ya inscrito
    if (targetClassroom.students.some(s => s.id === studentId)) {
      throw new Error('El estudiante ya está inscrito en esta aula');
    }

    // Agregar estudiante al aula
    const updatedStudents = [...targetClassroom.students, student];
    return this.updateClassroom(targetClassroom.id, { students: updatedStudents });
  }

  /**
   * Remueve un estudiante de un aula
   */
  async removeStudentFromClassroom(classroomId: string, studentId: string): Promise<Classroom> {
    const classroom = this.classrooms.get(classroomId);
    if (!classroom) {
      throw new Error('Aula no encontrada');
    }

    const updatedStudents = classroom.students.filter(student => student.id !== studentId);
    return this.updateClassroom(classroomId, { students: updatedStudents });
  }

  /**
   * Genera un nuevo código de invitación para un aula
   */
  async generateNewInviteCode(classroomId: string): Promise<string> {
    const newCode = this.generateInviteCode();
    await this.updateClassroom(classroomId, { inviteCode: newCode });
    return newCode;
  }

  /**
   * Obtiene las estadísticas de un aula
   */
  async getClassroomStats(classroomId: string): Promise<{
    totalStudents: number;
    totalActivities: number;
    averageCompletion: number;
    averageScore: number;
  }> {
    const classroom = this.classrooms.get(classroomId);
    if (!classroom) {
      throw new Error('Aula no encontrada');
    }

    // Calcular estadísticas básicas
    const totalStudents = classroom.students.length;
    const totalActivities = classroom.activities.length;

    // Para el prototipo, usar valores simulados
    const averageCompletion = totalActivities > 0 ? 75 : 0;
    const averageScore = totalActivities > 0 ? 82 : 0;

    return {
      totalStudents,
      totalActivities,
      averageCompletion,
      averageScore
    };
  }

  /**
   * Genera un código de invitación único
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Genera un ID único para nuevas aulas
   */
  private generateId(): string {
    return `classroom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}