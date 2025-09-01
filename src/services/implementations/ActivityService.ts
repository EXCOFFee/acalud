// ============================================================================
// IMPLEMENTACIÓN DEL SERVICIO DE ACTIVIDADES
// ============================================================================
// Implementa la interface IActivityService con lógica de gamificación

import { IActivityService } from '../interfaces/IActivityService';
import { Activity, ActivityCompletion, Question, StudentAnswer } from '../../types';
import { UserService } from './UserService';

/**
 * Implementación concreta del servicio de actividades lúdicas
 */
export class ActivityService implements IActivityService {
  private static instance: ActivityService;
  private activities: Map<string, Activity> = new Map();
  private completions: Map<string, ActivityCompletion> = new Map();
  private userService: UserService;

  /**
   * Implementa el patrón Singleton
   */
  public static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  /**
   * Constructor privado para Singleton
   */
  private constructor() {
    this.userService = UserService.getInstance();
    this.initializeDemoData();
  }

  /**
   * Inicializa actividades de demostración
   */
  private initializeDemoData(): void {
    // Actividad de matemáticas - Quiz
    const mathQuiz: Activity = {
      id: 'activity-1',
      title: 'Suma y Resta Divertida',
      description: 'Practica operaciones básicas de suma y resta con ejercicios interactivos',
      type: 'quiz',
      difficulty: 'easy',
      subject: 'Matemáticas',
      content: {
        questions: [
          {
            id: 'q1',
            text: '¿Cuánto es 5 + 3?',
            type: 'multiple-choice',
            options: ['6', '7', '8', '9'],
            correctAnswer: '8',
            explanation: '5 + 3 = 8. Puedes contar con los dedos para verificar.',
            points: 10
          },
          {
            id: 'q2',
            text: '¿Cuánto es 10 - 4?',
            type: 'multiple-choice',
            options: ['5', '6', '7', '8'],
            correctAnswer: '6',
            explanation: '10 - 4 = 6. Resta significa quitar.',
            points: 10
          }
        ],
        instructions: 'Resuelve cada problema matemático seleccionando la respuesta correcta.'
      },
      rewards: {
        coins: 20,
        experience: 50
      },
      classroomId: 'classroom-1',
      teacherId: 'teacher-1',
      isPublic: true,
      completions: [],
      tags: ['suma', 'resta', 'básico'],
      estimatedTime: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Actividad de memoria - Juego
    const memoryGame: Activity = {
      id: 'activity-2',
      title: 'Memoria de Animales',
      description: 'Encuentra las parejas de animales en este divertido juego de memoria',
      type: 'memory',
      difficulty: 'medium',
      subject: 'Ciencias Naturales',
      content: {
        gameConfig: {
          gameType: 'memory',
          difficulty: 2,
          timeLimit: 300,
          attempts: 3,
          customSettings: {
            cardPairs: 8,
            theme: 'animals'
          }
        },
        instructions: 'Encuentra todas las parejas de animales volteando las cartas. ¡Usa tu memoria!'
      },
      rewards: {
        coins: 30,
        experience: 75
      },
      classroomId: 'classroom-1',
      teacherId: 'teacher-1',
      isPublic: true,
      completions: [],
      tags: ['memoria', 'animales', 'concentración'],
      estimatedTime: 15,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activities.set(mathQuiz.id, mathQuiz);
    this.activities.set(memoryGame.id, memoryGame);
  }

  /**
   * Obtiene todas las actividades de un aula
   */
  async getActivitiesByClassroom(classroomId: string): Promise<Activity[]> {
    const activities: Activity[] = [];
    for (const activity of this.activities.values()) {
      if (activity.classroomId === classroomId) {
        activities.push(activity);
      }
    }
    return activities;
  }

  /**
   * Obtiene actividades públicas para el repositorio
   */
  async getPublicActivities(filters?: {
    subject?: string;
    difficulty?: string;
    type?: string;
    tags?: string[];
  }): Promise<Activity[]> {
    let activities: Activity[] = [];
    
    // Filtrar actividades públicas
    for (const activity of this.activities.values()) {
      if (activity.isPublic) {
        activities.push(activity);
      }
    }

    // Aplicar filtros si se proporcionan
    if (filters) {
      if (filters.subject) {
        activities = activities.filter(a => a.subject === filters.subject);
      }
      if (filters.difficulty) {
        activities = activities.filter(a => a.difficulty === filters.difficulty);
      }
      if (filters.type) {
        activities = activities.filter(a => a.type === filters.type);
      }
      if (filters.tags && filters.tags.length > 0) {
        activities = activities.filter(a => 
          filters.tags!.some(tag => a.tags.includes(tag))
        );
      }
    }

    return activities;
  }

  /**
   * Obtiene una actividad por su ID
   */
  async getActivityById(activityId: string): Promise<Activity | null> {
    return this.activities.get(activityId) || null;
  }

  /**
   * Crea una nueva actividad
   */
  async createActivity(activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'completions'>): Promise<Activity> {
    const newActivity: Activity = {
      ...activityData,
      id: this.generateId(),
      completions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activities.set(newActivity.id, newActivity);
    return newActivity;
  }

  /**
   * Actualiza una actividad existente
   */
  async updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity> {
    const existingActivity = this.activities.get(activityId);
    if (!existingActivity) {
      throw new Error('Actividad no encontrada');
    }

    const updatedActivity: Activity = {
      ...existingActivity,
      ...updates,
      updatedAt: new Date()
    };

    this.activities.set(activityId, updatedActivity);
    return updatedActivity;
  }

  /**
   * Elimina una actividad
   */
  async deleteActivity(activityId: string): Promise<void> {
    this.activities.delete(activityId);
    
    // Eliminar completaciones relacionadas
    for (const [completionId, completion] of this.completions.entries()) {
      if (completion.activityId === activityId) {
        this.completions.delete(completionId);
      }
    }
  }

  /**
   * Duplica una actividad del repositorio a un aula
   */
  async duplicateActivity(activityId: string, classroomId: string): Promise<Activity> {
    const originalActivity = this.activities.get(activityId);
    if (!originalActivity) {
      throw new Error('Actividad no encontrada');
    }

    const duplicatedActivity: Activity = {
      ...originalActivity,
      id: this.generateId(),
      classroomId: classroomId,
      isPublic: false, // Las copias no son públicas por defecto
      completions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activities.set(duplicatedActivity.id, duplicatedActivity);
    return duplicatedActivity;
  }

  /**
   * Registra la completación de una actividad por un estudiante
   */
  async submitActivityCompletion(completionData: Omit<ActivityCompletion, 'id' | 'completedAt'>): Promise<ActivityCompletion> {
    const student = await this.userService.getUserById(completionData.studentId);
    if (!student) {
      throw new Error('Estudiante no encontrado');
    }

    const activity = this.activities.get(completionData.activityId);
    if (!activity) {
      throw new Error('Actividad no encontrada');
    }

    const completion: ActivityCompletion = {
      ...completionData,
      id: this.generateId(),
      student: student,
      completedAt: new Date()
    };

    this.completions.set(completion.id, completion);

    // Actualizar estadísticas del usuario y otorgar recompensas
    await this.processRewards(student.id, activity, completion.score, completion.maxScore);

    return completion;
  }

  /**
   * Obtiene las completaciones de una actividad
   */
  async getActivityCompletions(activityId: string): Promise<ActivityCompletion[]> {
    const completions: ActivityCompletion[] = [];
    for (const completion of this.completions.values()) {
      if (completion.activityId === activityId) {
        completions.push(completion);
      }
    }
    return completions;
  }

  /**
   * Obtiene las completaciones de un estudiante
   */
  async getStudentCompletions(studentId: string, classroomId?: string): Promise<ActivityCompletion[]> {
    const completions: ActivityCompletion[] = [];
    for (const completion of this.completions.values()) {
      if (completion.studentId === studentId) {
        if (!classroomId) {
          completions.push(completion);
        } else {
          const activity = this.activities.get(completion.activityId);
          if (activity && activity.classroomId === classroomId) {
            completions.push(completion);
          }
        }
      }
    }
    return completions;
  }

  /**
   * Califica automáticamente una actividad
   */
  async gradeActivity(activityId: string, answers: StudentAnswer[]): Promise<{
    score: number;
    maxScore: number;
    correctAnswers: number;
    totalQuestions: number;
    feedback: string[];
  }> {
    const activity = this.activities.get(activityId);
    if (!activity || !activity.content.questions) {
      throw new Error('Actividad no encontrada o sin preguntas');
    }

    const questions = activity.content.questions;
    let score = 0;
    let correctAnswers = 0;
    const feedback: string[] = [];
    let maxScore = 0;

    // Calificar cada pregunta
    for (const question of questions) {
      maxScore += question.points;
      const studentAnswer = answers.find(a => a.questionId === question.id);
      
      if (studentAnswer) {
        const isCorrect = this.checkAnswer(question, studentAnswer.answer);
        studentAnswer.isCorrect = isCorrect;
        
        if (isCorrect) {
          score += question.points;
          correctAnswers++;
          feedback.push(`✅ Pregunta ${question.id}: ¡Correcto!`);
        } else {
          feedback.push(`❌ Pregunta ${question.id}: Incorrecto. ${question.explanation || ''}`);
        }
      } else {
        feedback.push(`⚠️ Pregunta ${question.id}: No respondida`);
      }
    }

    return {
      score,
      maxScore,
      correctAnswers,
      totalQuestions: questions.length,
      feedback
    };
  }

  /**
   * Verifica si una respuesta es correcta
   */
  private checkAnswer(question: Question, studentAnswer: string | string[]): boolean {
    if (Array.isArray(question.correctAnswer)) {
      if (Array.isArray(studentAnswer)) {
        return question.correctAnswer.every(answer => studentAnswer.includes(answer)) &&
               studentAnswer.every(answer => question.correctAnswer.includes(answer));
      }
      return question.correctAnswer.includes(studentAnswer as string);
    } else {
      return question.correctAnswer === studentAnswer;
    }
  }

  /**
   * Procesa las recompensas por completar una actividad
   */
  private async processRewards(studentId: string, activity: Activity, score: number, maxScore: number): Promise<void> {
    const percentage = (score / maxScore) * 100;
    
    // Calcular recompensas basadas en el rendimiento
    let coinsEarned = Math.floor(activity.rewards.coins * (percentage / 100));
    let experienceEarned = Math.floor(activity.rewards.experience * (percentage / 100));

    // Bonificación por excelencia (90% o más)
    if (percentage >= 90) {
      coinsEarned = Math.floor(coinsEarned * 1.2);
      experienceEarned = Math.floor(experienceEarned * 1.2);
    }

    // Otorgar recompensas
    await this.userService.updateUserCoins(studentId, coinsEarned);
    await this.userService.updateUserExperience(studentId, experienceEarned);
  }

  /**
   * Genera un ID único para nuevas actividades
   */
  private generateId(): string {
    return `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}