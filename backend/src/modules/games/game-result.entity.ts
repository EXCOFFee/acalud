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
import { Game } from './game.entity';
import { User } from '../users/user.entity';

export enum GameStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  PAUSED = 'paused',
}

@Entity('game_results')
export class GameResult {
  @ApiProperty({ description: 'ID único del resultado' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID del usuario que jugó' })
  @Column()
  userId: string;

  @ApiProperty({ description: 'ID del juego jugado' })
  @Column()
  gameId: string;

  @ApiProperty({ description: 'Puntuación obtenida' })
  @Column({ default: 0 })
  score: number;

  @ApiProperty({ description: 'Puntuación máxima posible' })
  @Column()
  maxScore: number;

  @ApiProperty({ description: 'Porcentaje de acierto' })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accuracy: number;

  @ApiProperty({ description: 'Tiempo empleado en segundos' })
  @Column({ default: 0 })
  timeSpent: number;

  @ApiProperty({ enum: GameStatus, description: 'Estado del juego' })
  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.IN_PROGRESS,
  })
  status: GameStatus;

  @ApiProperty({ description: 'Fecha de inicio del juego' })
  @Column()
  startedAt: Date;

  @ApiProperty({ description: 'Fecha de finalización del juego', required: false })
  @Column({ nullable: true })
  completedAt?: Date;

  @ApiProperty({ description: 'Número de preguntas respondidas correctamente' })
  @Column({ default: 0 })
  correctAnswers: number;

  @ApiProperty({ description: 'Número total de preguntas respondidas' })
  @Column({ default: 0 })
  totalAnswers: number;

  @ApiProperty({ description: 'Respuestas detalladas del usuario' })
  @Column({ type: 'jsonb', default: [] })
  detailedAnswers: Array<{
    questionId: string;
    userAnswer: string | string[];
    isCorrect: boolean;
    pointsEarned: number;
    timeSpent: number;
  }>;

  @ApiProperty({ description: 'Progreso específico del juego (para simulaciones)' })
  @Column({ type: 'jsonb', default: {} })
  gameProgress: Record<string, any>;

  @ApiProperty({ description: 'Logros desbloqueados durante este juego' })
  @Column({ type: 'simple-array', default: [] })
  achievementsUnlocked: string[];

  @ApiProperty({ description: 'Bonificaciones aplicadas' })
  @Column({ type: 'jsonb', default: {} })
  bonuses: {
    speedBonus?: number;
    perfectScoreBonus?: number;
    streakBonus?: number;
  };

  @ApiProperty({ description: 'Dispositivo usado para jugar' })
  @Column({ default: 'web' })
  device: string;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => User, (user) => user.gameResults)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Game, (game) => game.results)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  // Métodos calculados
  calculateAccuracy(): number {
    if (this.totalAnswers === 0) return 0;
    return (this.correctAnswers / this.totalAnswers) * 100;
  }

  calculateFinalScore(): number {
    let finalScore = this.score;
    
    // Aplicar bonificaciones
    if (this.bonuses.speedBonus) {
      finalScore += this.bonuses.speedBonus;
    }
    if (this.bonuses.perfectScoreBonus) {
      finalScore += this.bonuses.perfectScoreBonus;
    }
    if (this.bonuses.streakBonus) {
      finalScore += this.bonuses.streakBonus;
    }

    return finalScore;
  }

  getGrade(): string {
    const percentage = (this.score / this.maxScore) * 100;
    
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  getDurationFormatted(): string {
    const hours = Math.floor(this.timeSpent / 3600);
    const minutes = Math.floor((this.timeSpent % 3600) / 60);
    const seconds = this.timeSpent % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}
