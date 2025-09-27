import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Game, Subject, DifficultyLevel, EducationLevel } from './game.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_BLANK = 'fill_blank',
  CROSSWORD_CLUE = 'crossword_clue',
  SIMULATION_CHOICE = 'simulation_choice',
}

@Entity('questions')
export class Question {
  @ApiProperty({ description: 'ID único de la pregunta' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Texto de la pregunta' })
  @Column({ type: 'text' })
  questionText: string;

  @ApiProperty({ enum: QuestionType, description: 'Tipo de pregunta' })
  @Column({
    type: 'enum',
    enum: QuestionType,
  })
  type: QuestionType;

  @ApiProperty({ description: 'Opciones de respuesta para preguntas de opción múltiple' })
  @Column({ type: 'jsonb', default: [] })
  options: string[];

  @ApiProperty({ description: 'Respuesta(s) correcta(s)' })
  @Column({ type: 'jsonb' })
  correctAnswer: string | string[];

  @ApiProperty({ description: 'Explicación de la respuesta correcta', required: false })
  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @ApiProperty({ description: 'Puntos que otorga esta pregunta' })
  @Column({ default: 10 })
  points: number;

  @ApiProperty({ description: 'Tiempo límite para responder en segundos', required: false })
  @Column({ nullable: true })
  timeLimit?: number;

  @ApiProperty({ enum: Subject, description: 'Materia de la pregunta' })
  @Column({
    type: 'enum',
    enum: Subject,
  })
  subject: Subject;

  @ApiProperty({ enum: DifficultyLevel, description: 'Nivel de dificultad' })
  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER,
  })
  difficulty: DifficultyLevel;

  @ApiProperty({ enum: EducationLevel, description: 'Nivel educativo' })
  @Column({
    type: 'enum',
    enum: EducationLevel,
  })
  educationLevel: EducationLevel;

  @ApiProperty({ description: 'Tags para categorización y búsqueda' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Datos específicos para crucigramas (palabra, pistas, posición)' })
  @Column({ type: 'jsonb', nullable: true })
  crosswordData?: {
    word: string;
    clue: string;
    startRow?: number;
    startCol?: number;
    direction?: 'horizontal' | 'vertical';
  };

  @ApiProperty({ description: 'Datos específicos para simulaciones (narrativa, consecuencias)' })
  @Column({ type: 'jsonb', nullable: true })
  simulationData?: {
    sceneId: string;
    narrativeText: string;
    consequences: Record<string, any>;
    nextSceneIds: string[];
  };

  @ApiProperty({ description: 'ID del juego al que pertenece' })
  @Column()
  gameId: string;

  @ApiProperty({ description: 'Indica si la pregunta está activa' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Game, (game) => game.questions)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  // Métodos de validación
  isCorrectAnswer(userAnswer: string | string[]): boolean {
    if (Array.isArray(this.correctAnswer)) {
      if (Array.isArray(userAnswer)) {
        return this.correctAnswer.every(answer => userAnswer.includes(answer));
      }
      return this.correctAnswer.includes(userAnswer);
    } else {
      return this.correctAnswer.toLowerCase() === userAnswer.toString().toLowerCase();
    }
  }

  getHint(): string {
    switch (this.type) {
      case QuestionType.CROSSWORD_CLUE:
        return this.crosswordData?.clue || 'No hay pista disponible';
      case QuestionType.MULTIPLE_CHOICE:
        return 'Selecciona la respuesta correcta';
      case QuestionType.TRUE_FALSE:
        return 'Verdadero o Falso';
      case QuestionType.FILL_BLANK:
        return 'Completa la respuesta';
      default:
        return 'Lee cuidadosamente la pregunta';
    }
  }
}
