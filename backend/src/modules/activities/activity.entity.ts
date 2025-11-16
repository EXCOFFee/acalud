import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  Min, 
  Max, 
  IsBoolean, 
  IsObject,
  IsArray,
  MaxLength,
  MinLength,
  ValidateIf,
  IsDate
} from 'class-validator';
import { User } from '../users/user.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { ActivityCompletion } from './activity-completion.entity';
import { BadRequestException } from '@nestjs/common';
import { ActivityLibrary } from '../activity-library/entities/activity-library.entity';

export interface ActivityQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  points?: number;
  [key: string]: unknown;
}

export interface ActivityContent {
  questions?: ActivityQuestion[];
  instructions?: unknown;
  [key: string]: unknown;
}

export type ActivitySettings = Record<string, unknown>;

export enum ActivityType {
  QUIZ = 'quiz',
  GAME = 'game',
  ASSIGNMENT = 'assignment',
  INTERACTIVE = 'interactive',
  DRAG_DROP = 'drag-drop',
  MEMORY = 'memory',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

@Entity('activities')
export class Activity {
  @ApiProperty({ description: 'ID único de la actividad' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Título de la actividad' })
  @Column()
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El título no puede exceder 100 caracteres' })
  title: string;

  @ApiProperty({ description: 'Descripción de la actividad' })
  @Column({ type: 'text' })
  @IsString({ message: 'La descripción debe ser un texto válido' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  description: string;

  @ApiProperty({ enum: ActivityType, description: 'Tipo de actividad' })
  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  @IsEnum(ActivityType, { message: 'El tipo de actividad debe ser válido' })
  type: ActivityType;

  @ApiProperty({ enum: DifficultyLevel, description: 'Nivel de dificultad' })
  @Column({
    type: 'enum',
    enum: DifficultyLevel,
  })
  @IsEnum(DifficultyLevel, { message: 'El nivel de dificultad debe ser válido' })
  difficulty: DifficultyLevel;

  @ApiProperty({ description: 'Materia de la actividad' })
  @Column()
  @IsString({ message: 'La materia debe ser un texto válido' })
  @IsNotEmpty({ message: 'La materia es obligatoria' })
  @MaxLength(50, { message: 'La materia no puede exceder 50 caracteres' })
  subject: string;

  @ApiProperty({ description: 'Contenido de la actividad (preguntas, instrucciones, etc.)' })
  @Column({ type: 'jsonb' })
  @IsObject({ message: 'El contenido debe ser un objeto válido' })
  @IsNotEmpty({ message: 'El contenido es obligatorio' })
  content: ActivityContent;

  @ApiProperty({ description: 'Recompensas por completar la actividad' })
  @Column({ type: 'jsonb' })
  @IsObject({ message: 'Las recompensas deben ser un objeto válido' })
  rewards: {
    coins: number;
    experience: number;
    achievements?: string[];
  };

  @ApiProperty({ description: 'Etiquetas para categorización' })
  @Column({ type: 'text', array: true, default: [] })
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @IsOptional()
  tags: string[];

  @ApiProperty({ description: 'Tiempo estimado en minutos' })
  @Column({ default: 15 })
  @IsNumber({}, { message: 'El tiempo estimado debe ser un número' })
  @Min(1, { message: 'El tiempo estimado debe ser al menos 1 minuto' })
  @Max(240, { message: 'El tiempo estimado no puede exceder 240 minutos' })
  estimatedTime: number;

  @ApiProperty({ description: 'Experiencia base que se otorga por completar la actividad' })
  @Column({ default: 100 })
  @IsNumber({}, { message: 'La experiencia base debe ser un número' })
  @Min(10, { message: 'La experiencia base debe ser al menos 10' })
  @Max(1000, { message: 'La experiencia base no puede exceder 1000' })
  baseExperience: number;

  @ApiProperty({ description: 'Fecha límite para completar la actividad', required: false })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate({ message: 'La fecha límite debe ser una fecha válida' })
  @ValidateIf((o) => o.dueDate !== null)
  dueDate?: Date;

  @ApiProperty({ description: 'Número máximo de intentos permitidos', required: false })
  @Column({ nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'El número máximo de intentos debe ser un número' })
  @Min(1, { message: 'Debe permitir al menos 1 intento' })
  @Max(10, { message: 'No se pueden permitir más de 10 intentos' })
  maxAttempts?: number;

  @ApiProperty({ description: 'Indica si la actividad es pública en el repositorio' })
  @Column({ default: false })
  @IsBoolean({ message: 'isPublic debe ser un valor booleano' })
  isPublic: boolean;

  @ApiProperty({ description: 'Indica si la actividad está activa' })
  @Column({ default: true })
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive: boolean;

  @ApiProperty({ description: 'Configuraciones adicionales de la actividad' })
  @Column({ type: 'jsonb', default: {} })
  @IsObject({ message: 'Las configuraciones deben ser un objeto válido' })
  @IsOptional()
  settings: ActivitySettings;

  @ApiProperty({ description: 'Fecha de creación de la actividad' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ApiProperty({ description: 'ID del aula a la que pertenece', required: false, nullable: true })
  @Column('uuid', { nullable: true })
  classroomId: string | null;

  @ManyToOne(() => Classroom, (classroom) => classroom.activities)
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom;

  @ApiProperty({ description: 'ID del docente creador' })
  @Column('uuid')
  createdById: string;

  @ManyToOne(() => User, (user) => user.createdActivities)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => ActivityCompletion, (completion) => completion.activity)
  completions: ActivityCompletion[];

  // Relación con biblioteca de actividades
  @OneToMany(() => ActivityLibrary, (libraryEntry) => libraryEntry.originalActivity)
  libraryEntries: ActivityLibrary[];

  /**
   * 🔍 Validación antes de insertar o actualizar
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateActivity() {
    this.validateTitle();
    this.validateDescription();
    this.validateContent();
    this.validateRewards();
    this.validateDueDate();
    this.validateTimeValues();
  }

  /**
   * ✅ Validar título
   */
  private validateTitle() {
    if (!this.title || this.title.trim().length === 0) {
      throw new BadRequestException('El título no puede estar vacío');
    }

    if (this.title.length < 3) {
      throw new BadRequestException('El título debe tener al menos 3 caracteres');
    }

    if (this.title.length > 100) {
      throw new BadRequestException('El título no puede exceder 100 caracteres');
    }

    // Limpiar espacios extras
    this.title = this.title.trim();
  }

  /**
   * ✅ Validar descripción
   */
  private validateDescription() {
    if (!this.description || this.description.trim().length === 0) {
      throw new BadRequestException('La descripción no puede estar vacía');
    }

    if (this.description.length < 10) {
      throw new BadRequestException('La descripción debe tener al menos 10 caracteres');
    }

    if (this.description.length > 1000) {
      throw new BadRequestException('La descripción no puede exceder 1000 caracteres');
    }

    this.description = this.description.trim();
  }

  /**
   * ✅ Validar contenido
   */
  private validateContent() {
    if (!this.content || typeof this.content !== 'object') {
      throw new BadRequestException('El contenido debe ser un objeto válido');
    }

    // Validar que tenga al menos una pregunta o instrucción
    if (!this.content.questions && !this.content.instructions) {
      throw new BadRequestException('El contenido debe tener preguntas o instrucciones');
    }

    // Si es un quiz, validar estructura de preguntas
    if (this.type === ActivityType.QUIZ) {
      const questions = this.content.questions;

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new BadRequestException('Un quiz debe tener al menos una pregunta');
      }

      // Validar cada pregunta
      questions.forEach((question, index) => {
        if (!question.question || !question.options || !Array.isArray(question.options)) {
          throw new BadRequestException(`La pregunta ${index + 1} tiene estructura inválida`);
        }

        if (question.options.length < 2) {
          throw new BadRequestException(`La pregunta ${index + 1} debe tener al menos 2 opciones`);
        }

        if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
          throw new BadRequestException(`La pregunta ${index + 1} tiene una respuesta correcta inválida`);
        }
      });
    }
  }

  /**
   * ✅ Validar recompensas
   */
  private validateRewards() {
    if (!this.rewards || typeof this.rewards !== 'object') {
      throw new BadRequestException('Las recompensas deben ser un objeto válido');
    }

    if (typeof this.rewards.coins !== 'number' || this.rewards.coins < 0) {
      throw new BadRequestException('Las monedas deben ser un número positivo');
    }

    if (typeof this.rewards.experience !== 'number' || this.rewards.experience < 0) {
      throw new BadRequestException('La experiencia debe ser un número positivo');
    }

    if (this.rewards.coins > 10000) {
      throw new BadRequestException('Las monedas no pueden exceder 10,000');
    }

    if (this.rewards.experience > 10000) {
      throw new BadRequestException('La experiencia no puede exceder 10,000');
    }

    // Validar achievements si existen
    if (this.rewards.achievements && !Array.isArray(this.rewards.achievements)) {
      throw new BadRequestException('Los logros deben ser un array');
    }
  }

  /**
   * ✅ Validar fecha límite
   */
  private validateDueDate() {
    if (this.dueDate) {
      const now = new Date();
      const dueDate = new Date(this.dueDate);

      if (isNaN(dueDate.getTime())) {
        throw new BadRequestException('La fecha límite no es válida');
      }

      // Permitir fechas pasadas solo para actividades inactivas
      if (dueDate < now && this.isActive) {
        throw new BadRequestException('La fecha límite no puede ser en el pasado para actividades activas');
      }

      // No permitir fechas muy lejanas (más de 1 año)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (dueDate > oneYearFromNow) {
        throw new BadRequestException('La fecha límite no puede ser más de 1 año en el futuro');
      }
    }
  }

  /**
   * ✅ Validar valores de tiempo y experiencia
   */
  private validateTimeValues() {
    if (this.estimatedTime < 1 || this.estimatedTime > 240) {
      throw new BadRequestException('El tiempo estimado debe estar entre 1 y 240 minutos');
    }

    if (this.baseExperience < 10 || this.baseExperience > 1000) {
      throw new BadRequestException('La experiencia base debe estar entre 10 y 1000');
    }

    if (this.maxAttempts !== undefined && this.maxAttempts !== null) {
      if (this.maxAttempts < 1 || this.maxAttempts > 10) {
        throw new BadRequestException('El número máximo de intentos debe estar entre 1 y 10');
      }
    }
  }

  /**
   * ✅ Verificar si la actividad está vencida
   */
  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > new Date(this.dueDate);
  }

  /**
   * ✅ Verificar si es un quiz
   */
  isQuiz(): boolean {
    return this.type === ActivityType.QUIZ;
  }

  /**
   * ✅ Verificar si es un juego
   */
  isGame(): boolean {
    return this.type === ActivityType.GAME || 
           this.type === ActivityType.MEMORY || 
           this.type === ActivityType.DRAG_DROP;
  }

  /**
   * ✅ Obtener número de preguntas (si es quiz)
   */
  getQuestionCount(): number {
    if (this.isQuiz() && this.content.questions && Array.isArray(this.content.questions)) {
      return this.content.questions.length;
    }
    return 0;
  }

  /**
   * ✅ Calcular puntos totales posibles
   */
  getTotalPoints(): number {
    if (this.isQuiz()) {
      const questions = this.content.questions;
      if (Array.isArray(questions)) {
        return questions.reduce((sum: number, question) => sum + (question.points ?? 10), 0);
      }
    }
    return 100; // Valor por defecto
  }
}
