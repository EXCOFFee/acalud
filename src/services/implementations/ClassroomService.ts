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
   * El backend obtiene el teacherId del JWT automáticamente
   */
  async getClassroomsByTeacher(): Promise<Classroom[]> {
    try {
      const { httpClient } = await import('../http.service');
      const response = await httpClient.get<Classroom[]>('/classrooms/my-classrooms');
      
      // Actualizar caché
      response.forEach(classroom => {
        this.classrooms.set(classroom.id, classroom);
      });
      
      return response;
    } catch (error: any) {
      console.error('[ClassroomService] Error al obtener aulas del docente:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las aulas donde está inscrito un estudiante
   * El backend obtiene el studentId del JWT automáticamente
   */
  async getClassroomsByStudent(): Promise<Classroom[]> {
    try {
      const { httpClient } = await import('../http.service');
      const response = await httpClient.get<Classroom[]>('/classrooms/my-classrooms');
      
      // Actualizar caché
      response.forEach(classroom => {
        this.classrooms.set(classroom.id, classroom);
      });
      
      return response;
    } catch (error: any) {
      console.error('[ClassroomService] Error al obtener aulas del estudiante:', error);
      return [];
    }
  }

  /**
   * Obtiene un aula por su ID
   */
  async getClassroomById(classroomId: string): Promise<Classroom | null> {
    try {
      const { httpClient } = await import('../http.service');
      const response = await httpClient.get<Classroom>(`/classrooms/${classroomId}`);
      
      // Actualizar caché
      this.classrooms.set(response.id, response);
      
      return response;
    } catch (error: any) {
      console.error('[ClassroomService] Error al obtener aula:', error);
      return null;
    }
  }

  /**
   * Crea una nueva aula virtual
   */
  async createClassroom(classroomData: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt' | 'students' | 'activities' | 'inviteCode'>): Promise<Classroom> {
    console.log('[ClassroomService] Creando aula:', classroomData);
    
    try {
      // Importar httpClient dinámicamente
      const { httpClient } = await import('../http.service');
      
      // Llamar al backend para crear el aula
      const response = await httpClient.post<Classroom>(
        '/classrooms',
        classroomData
      );
      
      console.log('[ClassroomService] Aula creada exitosamente:', response);
      
      // Actualizar caché local
      this.classrooms.set(response.id, response);
      
      return response;
    } catch (error: any) {
      console.error('[ClassroomService] Error al crear aula:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al crear aula';
      throw new Error(errorMessage);
    }
  }

  /**
   * Actualiza los datos de un aula
   */
  async updateClassroom(classroomId: string, updates: Partial<Classroom>): Promise<Classroom> {
    try {
      const { httpClient } = await import('../http.service');
      const response = await httpClient.patch<Classroom>(`/classrooms/${classroomId}`, updates);
      
      // Actualizar caché
      this.classrooms.set(response.id, response);
      
      return response;
    } catch (error: any) {
      console.error('[ClassroomService] Error al actualizar aula:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar aula');
    }
  }

  /**
   * Elimina un aula virtual
   */
  async deleteClassroom(classroomId: string): Promise<void> {
    try {
      const { httpClient } = await import('../http.service');
      await httpClient.delete(`/classrooms/${classroomId}`);
      
      // Limpiar caché
      this.classrooms.delete(classroomId);
    } catch (error: any) {
      console.error('[ClassroomService] Error al eliminar aula:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar aula');
    }
  }

  /**
   * Obtiene un aula por su código de invitación
   */
  async getClassroomByInviteCode(inviteCode: string): Promise<Classroom | null> {
    try {
      const { httpClient } = await import('../http.service');
      
      // Llamar al endpoint de preview que incluye los datos del profesor
      const response = await httpClient.get<Classroom>(`/classrooms/preview/${inviteCode}`);
      
      console.log('[ClassroomService] Aula encontrada con código:', response);
      
      // Actualizar caché
      this.classrooms.set(response.id, response);
      
      return response;
    } catch (error: any) {
      console.error('[ClassroomService] Error al buscar aula por código:', error);
      return null;
    }
  }

  /**
   * Agrega un estudiante a un aula usando código de invitación
   */
  async joinClassroomByCode(inviteCode: string): Promise<Classroom> {
    console.log('[ClassroomService] Uniendose al aula con código:', inviteCode);
    
    try {
      // Importar httpClient dinámicamente
      const { httpClient } = await import('../http.service');
      
      // Llamar al backend - el userId se obtiene del JWT automáticamente
      const response = await httpClient.post<Classroom>(
        '/classrooms/join',
        { inviteCode }
      );
      
      console.log('[ClassroomService] Unido exitosamente al aula:', response);
      
      // Actualizar caché local
      this.classrooms.set(response.id, response);
      
      return response;
    } catch (error: any) {
      console.error('[ClassroomService] Error al unirse al aula:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al unirse al aula';
      throw new Error(errorMessage);
    }
  }

  /**
   * Remueve un estudiante de un aula
   * El backend obtiene el studentId del JWT automáticamente
   */
  async removeStudentFromClassroom(classroomId: string): Promise<void> {
    try {
      const { httpClient } = await import('../http.service');
      // El backend tiene un endpoint específico para salir del aula
      await httpClient.delete(`/classrooms/${classroomId}/leave`);

      // El servidor responde con 204, así que solo limpiamos la caché local
      this.classrooms.delete(classroomId);
    } catch (error: any) {
      console.error('[ClassroomService] Error al salir del aula:', error);
      throw new Error(error.response?.data?.message || 'Error al salir del aula');
    }
  }

  /**
   * Genera un nuevo código de invitación para un aula
   */
  async generateNewInviteCode(classroomId: string): Promise<string> {
    try {
      const { httpClient } = await import('../http.service');
      // El backend tiene un endpoint específico para regenerar código
      const response = await httpClient.post<Classroom>(`/classrooms/${classroomId}/regenerate-code`);
      
      // Actualizar caché
      this.classrooms.set(response.id, response);
      
      return response.inviteCode;
    } catch (error: any) {
      console.error('[ClassroomService] Error al regenerar código:', error);
      throw new Error(error.response?.data?.message || 'Error al regenerar código');
    }
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
    try {
      const { httpClient } = await import('../http.service');
      // El backend tiene un endpoint específico para estadísticas
      const response = await httpClient.get<any>(`/classrooms/${classroomId}/stats`);
      
      return response;
    } catch (error: any) {
      console.error('[ClassroomService] Error al obtener estadísticas:', error);
      // Devolver valores por defecto en caso de error
      return {
        totalStudents: 0,
        totalActivities: 0,
        averageCompletion: 0,
        averageScore: 0
      };
    }
  }

  /**
   * Genera un código de invitación único
   * Solo se usa para datos de demostración locales
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}