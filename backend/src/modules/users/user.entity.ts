import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Classroom } from '../classrooms/classroom.entity';
import { Activity } from '../activities/activity.entity';
import { ActivityCompletion } from '../activities/activity-completion.entity';
import { Achievement } from '../gamification/achievement.entity';
import { UserInventory } from '../gamification/user-inventory.entity';

export enum UserRole {
  TEACHER = 'teacher',
  STUDENT = 'student',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @ApiProperty({ description: 'ID único del usuario' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Email del usuario' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'Nombre del usuario' })
  @Column()
  firstName: string;

  @ApiProperty({ description: 'Apellido del usuario' })
  @Column()
  lastName: string;

  @ApiProperty({ description: 'Nombre completo del usuario' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Fecha de nacimiento', required: false })
  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @ApiProperty({ description: 'Biografía del usuario', required: false })
  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Exclude()
  @Column()
  password: string;

  @ApiProperty({ enum: UserRole, description: 'Rol del usuario' })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @ApiProperty({ description: 'URL del avatar del usuario', required: false })
  @Column({ nullable: true })
  avatar?: string;

  @ApiProperty({ description: 'Monedas virtuales del usuario' })
  @Column({ default: 0 })
  coins: number;

  @ApiProperty({ description: 'Nivel del usuario en el sistema de gamificación' })
  @Column({ default: 1 })
  level: number;

  @ApiProperty({ description: 'Puntos de experiencia del usuario' })
  @Column({ default: 0 })
  experience: number;

  @ApiProperty({ description: 'Indica si el usuario está activo' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de último acceso', required: false })
  @Column({ nullable: true })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Número de intentos de login fallidos' })
  @Column({ default: 0 })
  loginAttempts: number;

  @ApiProperty({ description: 'Fecha hasta la cual la cuenta está bloqueada', required: false })
  @Column({ nullable: true })
  lockedUntil?: Date;

  @ApiProperty({ description: 'Configuración de preferencias del usuario' })
  @Column({ type: 'jsonb', default: {} })
  preferences: Record<string, any>;

  @ApiProperty({ description: 'Fecha de creación del usuario' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @OneToMany(() => Classroom, (classroom) => classroom.teacher)
  ownedClassrooms: Classroom[];

  @ManyToMany(() => Classroom, (classroom) => classroom.students)
  enrolledClassrooms: Classroom[];

  @OneToMany(() => Activity, (activity) => activity.createdBy)
  createdActivities: Activity[];

  @OneToMany(() => ActivityCompletion, (completion) => completion.student)
  activityCompletions: ActivityCompletion[];

  // Alias para completedActivities (para compatibilidad con gamificación)
  get completedActivities(): ActivityCompletion[] {
    return this.activityCompletions;
  }

  @ManyToMany(() => Achievement, (achievement) => achievement.users)
  @JoinTable({
    name: 'user_achievements',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'achievementId', referencedColumnName: 'id' },
  })
  achievements: Achievement[];

  @OneToMany(() => UserInventory, (inventory) => inventory.user)
  inventory: UserInventory[];
}
