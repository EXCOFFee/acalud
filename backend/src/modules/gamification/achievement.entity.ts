import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
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
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';
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
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El título no puede exceder 100 caracteres' })
  title: string;

  @ApiProperty({ description: 'Descripción del logro' })
  @Column({ type: 'text' })
  @IsString({ message: 'La descripción debe ser un texto válido' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description: string;

  @ApiProperty({ description: 'Identificador único del logro para referencia en código' })
  @Column({ unique: true })
  @IsString({ message: 'El identificador debe ser un texto válido' })
  @IsNotEmpty({ message: 'El identificador es obligatorio' })
  @Matches(/^[a-z0-9_]+$/, { message: 'El identificador solo puede contener letras minúsculas, números y guiones bajos' })
  identifier: string;

  @ApiProperty({ description: 'Icono del logro' })
  @Column()
  @IsString({ message: 'El icono debe ser un texto válido' })
  @IsNotEmpty({ message: 'El icono es obligatorio' })
  icon: string;

  @ApiProperty({ enum: AchievementType, description: 'Tipo de logro' })
  @Column({
    type: 'enum',
    enum: AchievementType,
  })
  @IsEnum(AchievementType, { message: 'El tipo de logro debe ser válido' })
  type: AchievementType;

  @ApiProperty({ enum: AchievementCategory, description: 'Categoría del logro' })
  @Column({
    type: 'enum',
    enum: AchievementCategory,
  })
  @IsEnum(AchievementCategory, { message: 'La categoría del logro debe ser válida' })
  category: AchievementCategory;

  @ApiProperty({ enum: AchievementRarity, description: 'Rareza del logro' })
  @Column({
    type: 'enum',
    enum: AchievementRarity,
  })
  @IsEnum(AchievementRarity, { message: 'La rareza del logro debe ser válida' })
  rarity: AchievementRarity;

  @ApiProperty({ description: 'Requisitos para desbloquear el logro' })
  @Column({ type: 'jsonb' })
  @IsObject({ message: 'Los requisitos deben ser un objeto válido' })
  @IsNotEmpty({ message: 'Los requisitos son obligatorios' })
  requirement: {
    type: 'activities_completed' | 'score_achieved' | 'streak_days' | 'coins_earned';
    value: number;
    subject?: string;
  };

  @ApiProperty({ description: 'Criterios específicos para el logro' })
  @Column({ type: 'jsonb', default: {} })
  @IsObject({ message: 'Los criterios deben ser un objeto válido' })
  @IsOptional()
  criteria: Record<string, any>;

  @ApiProperty({ description: 'Puntos otorgados por el logro' })
  @Column({ default: 10 })
  @IsNumber({}, { message: 'Los puntos deben ser un número' })
  @Min(0, { message: 'Los puntos no pueden ser negativos' })
  @Max(10000, { message: 'Los puntos no pueden exceder 10,000' })
  points: number;

  @ApiProperty({ description: 'Recompensas del logro' })
  @Column({ type: 'jsonb' })
  @IsObject({ message: 'Las recompensas deben ser un objeto válido' })
  @IsNotEmpty({ message: 'Las recompensas son obligatorias' })
  reward: {
    coins: number;
    experience: number;
  };

  @ApiProperty({ description: 'Recompensas del logro (nueva estructura)' })
  @Column({ type: 'jsonb' })
  @IsObject({ message: 'Las recompensas deben ser un objeto válido' })
  @IsNotEmpty({ message: 'Las recompensas son obligatorias' })
  rewards: {
    coins: number;
    experience: number;
    items?: string[];
  };

  @ApiProperty({ description: 'Indica si el logro está activo' })
  @Column({ default: true })
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación del logro' })
  @CreateDateColumn()
  createdAt: Date;

  // Relaciones
  @ManyToMany(() => User, (user) => user.achievements)
  users: User[];

  /**
   * 🔍 Validación antes de insertar o actualizar
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateAchievement() {
    this.validateTitle();
    this.validateDescription();
    this.validateIdentifier();
    this.validateRequirement();
    this.validateRewards();
  }

  /**
   * ✅ Validar título
   */
  private validateTitle() {
    if (!this.title || this.title.trim().length === 0) {
      throw new BadRequestException('El título del logro no puede estar vacío');
    }

    if (this.title.length < 3 || this.title.length > 100) {
      throw new BadRequestException('El título debe tener entre 3 y 100 caracteres');
    }

    this.title = this.title.trim();
  }

  /**
   * ✅ Validar descripción
   */
  private validateDescription() {
    if (!this.description || this.description.trim().length === 0) {
      throw new BadRequestException('La descripción del logro no puede estar vacía');
    }

    if (this.description.length < 10 || this.description.length > 500) {
      throw new BadRequestException('La descripción debe tener entre 10 y 500 caracteres');
    }

    this.description = this.description.trim();
  }

  /**
   * ✅ Validar identificador
   */
  private validateIdentifier() {
    if (!this.identifier || this.identifier.trim().length === 0) {
      throw new BadRequestException('El identificador es obligatorio');
    }

    const identifierRegex = /^[a-z0-9_]+$/;
    if (!identifierRegex.test(this.identifier)) {
      throw new BadRequestException('El identificador solo puede contener letras minúsculas, números y guiones bajos');
    }

    this.identifier = this.identifier.toLowerCase().trim();
  }

  /**
   * ✅ Validar requisitos
   */
  private validateRequirement() {
    if (!this.requirement || typeof this.requirement !== 'object') {
      throw new BadRequestException('Los requisitos deben ser un objeto válido');
    }

    if (!this.requirement.type) {
      throw new BadRequestException('El tipo de requisito es obligatorio');
    }

    if (typeof this.requirement.value !== 'number' || this.requirement.value <= 0) {
      throw new BadRequestException('El valor del requisito debe ser un número positivo');
    }

    if (this.requirement.value > 1000000) {
      throw new BadRequestException('El valor del requisito es demasiado alto');
    }
  }

  /**
   * ✅ Validar recompensas
   */
  private validateRewards() {
    // Validar reward (estructura antigua)
    if (this.reward) {
      if (typeof this.reward.coins !== 'number' || this.reward.coins < 0) {
        throw new BadRequestException('Las monedas de recompensa deben ser un número no negativo');
      }

      if (typeof this.reward.experience !== 'number' || this.reward.experience < 0) {
        throw new BadRequestException('La experiencia de recompensa debe ser un número no negativo');
      }

      if (this.reward.coins > 10000) {
        throw new BadRequestException('Las monedas de recompensa no pueden exceder 10,000');
      }

      if (this.reward.experience > 10000) {
        throw new BadRequestException('La experiencia de recompensa no puede exceder 10,000');
      }
    }

    // Validar rewards (estructura nueva)
    if (this.rewards) {
      if (typeof this.rewards.coins !== 'number' || this.rewards.coins < 0) {
        throw new BadRequestException('Las monedas de recompensa deben ser un número no negativo');
      }

      if (typeof this.rewards.experience !== 'number' || this.rewards.experience < 0) {
        throw new BadRequestException('La experiencia de recompensa debe ser un número no negativo');
      }

      if (this.rewards.coins > 10000) {
        throw new BadRequestException('Las monedas de recompensa no pueden exceder 10,000');
      }

      if (this.rewards.experience > 10000) {
        throw new BadRequestException('La experiencia de recompensa no puede exceder 10,000');
      }
    }
  }

  /**
   * ✅ Verificar si es un logro raro o superior
   */
  isRare(): boolean {
    return this.rarity === AchievementRarity.RARE || 
           this.rarity === AchievementRarity.EPIC || 
           this.rarity === AchievementRarity.LEGENDARY;
  }

  /**
   * ✅ Obtener puntos de rareza
   */
  getRarityMultiplier(): number {
    const multipliers = {
      [AchievementRarity.COMMON]: 1,
      [AchievementRarity.RARE]: 1.5,
      [AchievementRarity.EPIC]: 2,
      [AchievementRarity.LEGENDARY]: 3,
    };
    return multipliers[this.rarity] || 1;
  }
}
