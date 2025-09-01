import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { ActivityCompletion } from './activity-completion.entity';

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
  title: string;

  @ApiProperty({ description: 'Descripción de la actividad' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: ActivityType, description: 'Tipo de actividad' })
  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @ApiProperty({ enum: DifficultyLevel, description: 'Nivel de dificultad' })
  @Column({
    type: 'enum',
    enum: DifficultyLevel,
  })
  difficulty: DifficultyLevel;

  @ApiProperty({ description: 'Materia de la actividad' })
  @Column()
  subject: string;

  @ApiProperty({ description: 'Contenido de la actividad (preguntas, instrucciones, etc.)' })
  @Column({ type: 'jsonb' })
  content: Record<string, any>;

  @ApiProperty({ description: 'Recompensas por completar la actividad' })
  @Column({ type: 'jsonb' })
  rewards: {
    coins: number;
    experience: number;
    achievements?: string[];
  };

  @ApiProperty({ description: 'Etiquetas para categorización' })
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @ApiProperty({ description: 'Tiempo estimado en minutos' })
  @Column({ default: 15 })
  estimatedTime: number;

  @ApiProperty({ description: 'Experiencia base que se otorga por completar la actividad' })
  @Column({ default: 100 })
  baseExperience: number;

  @ApiProperty({ description: 'Fecha límite para completar la actividad', required: false })
  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @ApiProperty({ description: 'Número máximo de intentos permitidos', required: false })
  @Column({ nullable: true })
  maxAttempts?: number;

  @ApiProperty({ description: 'Indica si la actividad es pública en el repositorio' })
  @Column({ default: false })
  isPublic: boolean;

  @ApiProperty({ description: 'Indica si la actividad está activa' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Configuraciones adicionales de la actividad' })
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Fecha de creación de la actividad' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ApiProperty({ description: 'ID del aula a la que pertenece' })
  @Column('uuid')
  classroomId: string;

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
}
