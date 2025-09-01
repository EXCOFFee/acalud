import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';
import { Activity } from './activity.entity';

@Entity('activity_completions')
export class ActivityCompletion {
  @ApiProperty({ description: 'ID único de la completación' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Puntuación obtenida' })
  @Column()
  score: number;

  @ApiProperty({ description: 'Puntuación máxima posible' })
  @Column()
  maxScore: number;

  @ApiProperty({ description: 'Tiempo empleado en segundos' })
  @Column()
  timeSpent: number;

  @ApiProperty({ description: 'Número de intentos realizados' })
  @Column({ default: 1 })
  attempts: number;

  @ApiProperty({ description: 'Respuestas del estudiante' })
  @Column({ type: 'jsonb' })
  answers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect: boolean;
    timeSpent: number;
  }>;

  @ApiProperty({ description: 'Fecha de completación' })
  @CreateDateColumn()
  completedAt: Date;

  // Relaciones
  @ApiProperty({ description: 'ID del estudiante' })
  @Column('uuid')
  studentId: string;

  @ManyToOne(() => User, (user) => user.activityCompletions)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ApiProperty({ description: 'ID de la actividad' })
  @Column('uuid')
  activityId: string;

  @ManyToOne(() => Activity, (activity) => activity.completions)
  @JoinColumn({ name: 'activityId' })
  activity: Activity;
}
