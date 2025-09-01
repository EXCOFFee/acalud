import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';

export enum AchievementType {
  PROGRESS = 'progress',
  SPECIAL = 'special',
  SOCIAL = 'social',
  ACADEMIC = 'academic',
  ACTIVITIES_COMPLETED = 'activities_completed',
  EXPERIENCE_GAINED = 'experience_gained',
  LEVEL_REACHED = 'level_reached',
  CLASSROOMS_JOINED = 'classrooms_joined',
  PERFECT_SCORE = 'perfect_score',
  STREAK = 'streak',
}

export enum AchievementCategory {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  MASTER = 'master',
}

export enum AchievementRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('achievements')
export class Achievement {
  @ApiProperty({ description: 'ID único del logro' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Título del logro' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Descripción del logro' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'Identificador único del logro para referencia en código' })
  @Column({ unique: true })
  identifier: string;

  @ApiProperty({ description: 'Icono del logro' })
  @Column()
  icon: string;

  @ApiProperty({ enum: AchievementType, description: 'Tipo de logro' })
  @Column({
    type: 'enum',
    enum: AchievementType,
  })
  type: AchievementType;

  @ApiProperty({ enum: AchievementCategory, description: 'Categoría del logro' })
  @Column({
    type: 'enum',
    enum: AchievementCategory,
  })
  category: AchievementCategory;

  @ApiProperty({ enum: AchievementRarity, description: 'Rareza del logro' })
  @Column({
    type: 'enum',
    enum: AchievementRarity,
  })
  rarity: AchievementRarity;

  @ApiProperty({ description: 'Requisitos para desbloquear el logro' })
  @Column({ type: 'jsonb' })
  requirement: {
    type: 'activities_completed' | 'score_achieved' | 'streak_days' | 'coins_earned';
    value: number;
    subject?: string;
  };

  @ApiProperty({ description: 'Criterios específicos para el logro' })
  @Column({ type: 'jsonb', default: {} })
  criteria: Record<string, any>;

  @ApiProperty({ description: 'Puntos otorgados por el logro' })
  @Column({ default: 10 })
  points: number;

  @ApiProperty({ description: 'Recompensas del logro' })
  @Column({ type: 'jsonb' })
  reward: {
    coins: number;
    experience: number;
  };

  @ApiProperty({ description: 'Recompensas del logro (nueva estructura)' })
  @Column({ type: 'jsonb' })
  rewards: {
    coins: number;
    experience: number;
    items?: string[];
  };

  @ApiProperty({ description: 'Indica si el logro está activo' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación del logro' })
  @CreateDateColumn()
  createdAt: Date;

  // Relaciones
  @ManyToMany(() => User, (user) => user.achievements)
  users: User[];
}
