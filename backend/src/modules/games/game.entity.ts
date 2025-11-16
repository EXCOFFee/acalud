import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';
import type { Question } from './question.entity';
import type { GameResult } from './game-result.entity';
import type { GameComment } from './game-comment.entity';
import type { GameRating } from './game-rating.entity';

export enum GameType {
  CROSSWORD = 'crossword',
  TRIVIA = 'trivia',
  SIMULATION = 'simulation',
}

export enum Subject {
  MATHEMATICS = 'mathematics',
  HISTORY = 'history',
  LITERATURE = 'literature',
  SCIENCES = 'sciences',
  GEOGRAPHY = 'geography',
  LANGUAGE = 'language',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum EducationLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

@Entity('games')
export class Game {
  @ApiProperty({ description: 'ID único del juego' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Título del juego' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Descripción del juego' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: GameType, description: 'Tipo de juego' })
  @Column({
    type: 'enum',
    enum: GameType,
  })
  type: GameType;

  @ApiProperty({ enum: Subject, description: 'Materia del juego' })
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

  @ApiProperty({ description: 'Puntos máximos que se pueden obtener' })
  @Column({ default: 100 })
  maxPoints: number;

  @ApiProperty({ description: 'Tiempo límite en minutos', required: false })
  @Column({ nullable: true })
  timeLimit?: number;

  @ApiProperty({ description: 'Configuración específica del juego' })
  @Column({ type: 'jsonb', default: {} })
  gameConfig: Record<string, any>;

  @ApiProperty({ description: 'Indica si el juego está activo' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'ID del usuario creador del juego' })
  @Column()
  createdById: string;

  @ApiProperty({ description: 'URL de imagen del juego', required: false })
  @Column({ nullable: true })
  imageUrl?: string;

  @ApiProperty({ description: 'Tags para búsqueda y categorización' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => User, (user) => user.createdGames)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany('Question', (question: Question) => question.game, { cascade: true })
  questions: Question[];

  @OneToMany('GameResult', (result: GameResult) => result.game, { cascade: true })
  results: GameResult[];

  @OneToMany('GameComment', (comment: GameComment) => comment.game, { cascade: true })
  comments: GameComment[];

  @OneToMany('GameRating', (rating: GameRating) => rating.game, { cascade: true })
  ratings: GameRating[];

  // Métodos calculados
  get averageScore(): number {
    if (!this.results || this.results.length === 0) return 0;
    const totalScore = this.results.reduce((sum, result) => sum + result.score, 0);
    return totalScore / this.results.length;
  }

  get playCount(): number {
    return this.results ? this.results.length : 0;
  }
}
