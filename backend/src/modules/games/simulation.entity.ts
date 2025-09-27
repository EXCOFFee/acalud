import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Game } from './game.entity';

export interface SimulationChoice {
  id: string;
  text: string;
  consequence: string;
  pointsAwarded: number;
  nextSceneId?: string;
  requiredKnowledge?: string[];
}

export interface SimulationScene {
  id: string;
  title: string;
  narrativeText: string;
  imageUrl?: string;
  backgroundMusic?: string;
  choices: SimulationChoice[];
  isEndScene: boolean;
  requiredScore?: number;
  educationalContent?: {
    concept: string;
    explanation: string;
    resources: string[];
  };
}

export interface CharacterData {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  historicalPeriod?: string;
  profession?: string;
  attributes: {
    intelligence: number;
    charisma: number;
    knowledge: number;
    leadership: number;
  };
}

@Entity('simulations')
export class Simulation {
  @ApiProperty({ description: 'ID único de la simulación' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID del juego base' })
  @Column()
  gameId: string;

  @ApiProperty({ description: 'Título de la simulación' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Descripción de la simulación' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'Período histórico o contexto de la simulación' })
  @Column()
  setting: string;

  @ApiProperty({ description: 'Objetivo educativo principal' })
  @Column({ type: 'text' })
  educationalObjective: string;

  @ApiProperty({ description: 'ID de la escena inicial' })
  @Column()
  startingSceneId: string;

  @ApiProperty({ description: 'Todas las escenas de la simulación' })
  @Column({ type: 'jsonb' })
  scenes: SimulationScene[];

  @ApiProperty({ description: 'Personajes disponibles para interpretar' })
  @Column({ type: 'jsonb' })
  characters: CharacterData[];

  @ApiProperty({ description: 'Duración estimada en minutos' })
  @Column({ default: 20 })
  estimatedDuration: number;

  @ApiProperty({ description: 'Puntuación máxima posible' })
  @Column({ default: 100 })
  maxScore: number;

  @ApiProperty({ description: 'Número mínimo de decisiones para completar' })
  @Column({ default: 5 })
  minDecisions: number;

  @ApiProperty({ description: 'Recursos educativos adicionales' })
  @Column({ type: 'jsonb', default: [] })
  resources: Array<{
    type: 'video' | 'article' | 'image' | 'document';
    title: string;
    url: string;
    description: string;
  }>;

  @ApiProperty({ description: 'Criterios de evaluación' })
  @Column({ type: 'jsonb', default: {} })
  evaluationCriteria: {
    historicalAccuracy: number;
    criticalThinking: number;
    problemSolving: number;
    empathy: number;
  };

  @ApiProperty({ description: 'Preguntas de reflexión post-simulación' })
  @Column({ type: 'jsonb', default: [] })
  reflectionQuestions: Array<{
    question: string;
    expectedThemes: string[];
    scoringRubric: string;
  }>;

  @ApiProperty({ description: 'Configuración de dificultad adaptativa' })
  @Column({ type: 'jsonb', default: {} })
  adaptiveSettings: {
    enableHints: boolean;
    allowRetries: boolean;
    timeLimit: number;
    consequenceVisibility: 'hidden' | 'partial' | 'full';
  };

  @ApiProperty({ description: 'Tags para categorización' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Indica si la simulación está activa' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @OneToOne(() => Game)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  // TODO: Implementar entidad SimulationProgress
  // @OneToMany('SimulationProgress', (progress: any) => progress.simulation)
  // playerProgress: any[];

  // Métodos para la lógica de simulación

  /**
   * Obtiene la escena por ID
   */
  getScene(sceneId: string): SimulationScene | null {
    return this.scenes.find(scene => scene.id === sceneId) || null;
  }

  /**
   * Obtiene la escena inicial
   */
  getStartingScene(): SimulationScene | null {
    return this.getScene(this.startingSceneId);
  }

  /**
   * Valida si una elección es válida en una escena
   */
  isValidChoice(sceneId: string, choiceId: string): boolean {
    const scene = this.getScene(sceneId);
    if (!scene) return false;
    
    return scene.choices.some(choice => choice.id === choiceId);
  }

  /**
   * Procesa una elección y retorna la siguiente escena
   */
  processChoice(
    sceneId: string,
    choiceId: string,
    playerScore: number
  ): {
    nextScene: SimulationScene | null;
    pointsAwarded: number;
    consequence: string;
    isGameEnd: boolean;
  } {
    const scene = this.getScene(sceneId);
    if (!scene) {
      return {
        nextScene: null,
        pointsAwarded: 0,
        consequence: 'Escena no encontrada',
        isGameEnd: true,
      };
    }

    const choice = scene.choices.find(c => c.id === choiceId);
    if (!choice) {
      return {
        nextScene: null,
        pointsAwarded: 0,
        consequence: 'Elección no válida',
        isGameEnd: true,
      };
    }

    const nextScene = choice.nextSceneId ? this.getScene(choice.nextSceneId) : null;
    
    return {
      nextScene,
      pointsAwarded: choice.pointsAwarded,
      consequence: choice.consequence,
      isGameEnd: !nextScene || nextScene.isEndScene,
    };
  }

  /**
   * Calcula el puntaje final basado en las decisiones tomadas
   */
  calculateFinalScore(
    choices: Array<{ sceneId: string; choiceId: string; timeSpent: number }>
  ): {
    totalScore: number;
    categoryScores: Record<string, number>;
    feedback: string[];
  } {
    let totalScore = 0;
    const categoryScores = {
      historicalAccuracy: 0,
      criticalThinking: 0,
      problemSolving: 0,
      empathy: 0,
    };
    const feedback: string[] = [];

    for (const playerChoice of choices) {
      const scene = this.getScene(playerChoice.sceneId);
      if (scene) {
        const choice = scene.choices.find(c => c.id === playerChoice.choiceId);
        if (choice) {
          totalScore += choice.pointsAwarded;
          
          // Aquí se podrían agregar reglas específicas para cada categoría
          // basadas en el contenido de la elección
        }
      }
    }

    // Generar feedback basado en el desempeño
    const percentage = (totalScore / this.maxScore) * 100;
    
    if (percentage >= 80) {
      feedback.push('¡Excelente trabajo! Demostraste gran comprensión del contexto histórico.');
    } else if (percentage >= 60) {
      feedback.push('Buen desempeño. Algunas decisiones podrían haberse beneficiado de más reflexión.');
    } else {
      feedback.push('Hay oportunidades de mejora. Considera revisar los recursos adicionales.');
    }

    return {
      totalScore,
      categoryScores,
      feedback,
    };
  }

  /**
   * Genera un resumen de la simulación para el educador
   */
  generateEducatorSummary(): {
    learningOutcomes: string[];
    keyDecisionPoints: string[];
    assessmentRubric: Record<string, string>;
  } {
    const learningOutcomes = [
      `Comprensión del contexto: ${this.setting}`,
      `Objetivo educativo: ${this.educationalObjective}`,
      'Desarrollo de pensamiento crítico a través de decisiones complejas',
      'Aplicación de conocimientos históricos en situaciones prácticas',
    ];

    const keyDecisionPoints = this.scenes
      .filter(scene => scene.choices.length > 2)
      .map(scene => scene.title);

    const assessmentRubric = {
      'Excelente (80-100%)': 'Demuestra comprensión profunda y toma decisiones bien fundamentadas',
      'Bueno (60-79%)': 'Muestra comprensión adecuada con algunas decisiones cuestionables',
      'Satisfactorio (40-59%)': 'Comprensión básica, necesita refuerzo en áreas clave',
      'Insatisfactorio (0-39%)': 'Requiere apoyo adicional y revisión de conceptos fundamentales',
    };

    return {
      learningOutcomes,
      keyDecisionPoints,
      assessmentRubric,
    };
  }

  /**
   * Valida la estructura de la simulación
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Verificar que existe escena inicial
    if (!this.getStartingScene()) {
      errors.push('No se encontró la escena inicial especificada');
    }

    // Verificar que todas las escenas tienen al menos una elección
    for (const scene of this.scenes) {
      if (scene.choices.length === 0 && !scene.isEndScene) {
        errors.push(`La escena "${scene.title}" no tiene elecciones disponibles`);
      }
    }

    // Verificar que todas las referencias a escenas siguientes son válidas
    for (const scene of this.scenes) {
      for (const choice of scene.choices) {
        if (choice.nextSceneId && !this.getScene(choice.nextSceneId)) {
          errors.push(`La elección "${choice.text}" referencia una escena inexistente: ${choice.nextSceneId}`);
        }
      }
    }

    // Verificar que hay al menos una escena final
    const hasEndScene = this.scenes.some(scene => scene.isEndScene);
    if (!hasEndScene) {
      errors.push('La simulación debe tener al menos una escena final');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
