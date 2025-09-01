// ============================================================================
// INTERFACE DEL SERVICIO DE ACTIVIDADES
// ============================================================================
// Define el contrato para el servicio de actividades lúdicas

import { Activity, ActivityCompletion, Question } from '../../types';

/**
 * Interface que define las operaciones para el manejo de actividades
 */
export interface IActivityService {
  /**
   * Obtiene todas las actividades de un aula
   * @param classroomId - ID del aula
   * @returns Promise con array de actividades
   */
  getActivitiesByClassroom(classroomId: string): Promise<Activity[]>;

  /**
   * Obtiene actividades públicas para el repositorio
   * @param filters - Filtros opcionales (subject, difficulty, type)
   * @returns Promise con array de actividades públicas
   */
  getPublicActivities(filters?: {
    subject?: string;
    difficulty?: string;
    type?: string;
    tags?: string[];
  }): Promise<Activity[]>;

  /**
   * Obtiene una actividad por su ID
   * @param activityId - ID de la actividad
   * @returns Promise con la actividad encontrada o null
   */
  getActivityById(activityId: string): Promise<Activity | null>;

  /**
   * Crea una nueva actividad
   * @param activityData - Datos de la actividad a crear
   * @returns Promise con la actividad creada
   */
  createActivity(activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'completions'>): Promise<Activity>;

  /**
   * Actualiza una actividad existente
   * @param activityId - ID de la actividad
   * @param updates - Datos a actualizar
   * @returns Promise con la actividad actualizada
   */
  updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity>;

  /**
   * Elimina una actividad
   * @param activityId - ID de la actividad
   * @returns Promise<void>
   */
  deleteActivity(activityId: string): Promise<void>;

  /**
   * Duplica una actividad del repositorio a un aula
   * @param activityId - ID de la actividad a duplicar
   * @param classroomId - ID del aula destino
   * @returns Promise con la nueva actividad
   */
  duplicateActivity(activityId: string, classroomId: string): Promise<Activity>;

  /**
   * Registra la completación de una actividad por un estudiante
   * @param completionData - Datos de la completación
   * @returns Promise con la completación registrada
   */
  submitActivityCompletion(completionData: Omit<ActivityCompletion, 'id' | 'completedAt'>): Promise<ActivityCompletion>;

  /**
   * Obtiene las completaciones de una actividad
   * @param activityId - ID de la actividad
   * @returns Promise con array de completaciones
   */
  getActivityCompletions(activityId: string): Promise<ActivityCompletion[]>;

  /**
   * Obtiene las completaciones de un estudiante
   * @param studentId - ID del estudiante
   * @param classroomId - ID del aula (opcional)
   * @returns Promise con array de completaciones
   */
  getStudentCompletions(studentId: string, classroomId?: string): Promise<ActivityCompletion[]>;

  /**
   * Califica automáticamente una actividad
   * @param activityId - ID de la actividad
   * @param answers - Respuestas del estudiante
   * @returns Promise con el resultado de la calificación
   */
  gradeActivity(activityId: string, answers: any[]): Promise<{
    score: number;
    maxScore: number;
    correctAnswers: number;
    totalQuestions: number;
    feedback: string[];
  }>;
}