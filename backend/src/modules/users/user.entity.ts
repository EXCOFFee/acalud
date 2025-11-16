import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDate,
  IsBoolean,
  IsUUID,
  Length,
  Matches,
  MinDate,
  MaxDate,
} from 'class-validator';
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
  @IsUUID('4', { message: 'ID debe ser un UUID válido' })
  id: string;

  @ApiProperty({ description: 'Email del usuario' })
  @Column({ unique: true })
  @IsEmail({}, { message: 'Email debe tener un formato válido' })
  @IsNotEmpty({ message: 'Email es obligatorio' })
  @Length(5, 255, { message: 'Email debe tener entre 5 y 255 caracteres' })
  email: string;

  @ApiProperty({ description: 'Nombre del usuario' })
  @Column()
  @IsString({ message: 'Nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Nombre es obligatorio' })
  @Length(1, 100, { message: 'Nombre debe tener entre 1 y 100 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: 'Nombre solo puede contener letras y espacios' })
  firstName: string;

  @ApiProperty({ description: 'Apellido del usuario' })
  @Column()
  @IsString({ message: 'Apellido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Apellido es obligatorio' })
  @Length(1, 100, { message: 'Apellido debe tener entre 1 y 100 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: 'Apellido solo puede contener letras y espacios' })
  lastName: string;

  @ApiProperty({ description: 'Nombre completo del usuario' })
  @Column()
  @IsString({ message: 'Nombre completo debe ser una cadena de texto' })
  @Length(1, 200, { message: 'Nombre completo debe tener entre 1 y 200 caracteres' })
  name: string;

  @ApiProperty({ description: 'Fecha de nacimiento', required: false })
  @Column({ type: 'date', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Fecha de nacimiento debe ser una fecha válida' })
  @MaxDate(new Date(), { message: 'Fecha de nacimiento no puede ser futura' })
  dateOfBirth?: Date;

  @ApiProperty({ description: 'Biografía del usuario', required: false })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Biografía debe ser una cadena de texto' })
  @Length(0, 1000, { message: 'Biografía no puede exceder 1000 caracteres' })
  bio?: string;

  @Exclude()
  @Column()
  @IsString({ message: 'Contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Contraseña es obligatoria' })
  @Length(8, 255, { message: 'Contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ enum: UserRole, description: 'Rol del usuario' })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  @IsEnum(UserRole, { message: 'Rol debe ser un valor válido (TEACHER, STUDENT, ADMIN)' })
  @IsNotEmpty({ message: 'Rol es obligatorio' })
  role: UserRole;

  @ApiProperty({ description: 'URL del avatar del usuario', required: false })
  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'URL del avatar debe ser una cadena de texto' })
  @Length(0, 500, { message: 'URL del avatar no puede exceder 500 caracteres' })
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

  // Relaciones con juegos educativos
  @OneToMany('Game', (game: any) => game.createdBy)
  createdGames: any[];

  @OneToMany('GameResult', (result: any) => result.user)
  gameResults: any[];

  // Relación con perfil de usuario
  @OneToOne('UserProfile', (profile: any) => profile.user)
  profile: any;

  // Relaciones con biblioteca de actividades
  @OneToMany('ActivityLibrary', (activity: any) => activity.author)
  sharedActivities: any[];

  @OneToMany('ActivityRating', (rating: any) => rating.user)
  activityRatings: any[];

  // Relaciones con sistema de tienda
  @OneToMany('UserPurchase', (purchase: any) => purchase.user)
  purchases: any[];

  // Relaciones con sistema de comunicaciones
  // Comentado temporalmente - CommunicationsModule deshabilitado
  // @ManyToMany('Chat', (chat: any) => chat.participants)
  // chats: any[];

  /**
   * 🔐 Validaciones personalizadas antes de insertar/actualizar
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateUser() {
    try {
      // Validar que email tenga formato correcto
      if (!this.email || !this.isValidEmail(this.email)) {
        throw new Error('Email debe tener un formato válido');
      }

      // Normalizar email a minúsculas
      this.email = this.email.toLowerCase().trim();

      // Validar nombres
      if (!this.firstName || this.firstName.trim().length === 0) {
        throw new Error('Nombre es obligatorio');
      }

      if (!this.lastName || this.lastName.trim().length === 0) {
        throw new Error('Apellido es obligatorio');
      }

      // Generar nombre completo si no existe
      if (!this.name) {
        this.name = `${this.firstName.trim()} ${this.lastName.trim()}`;
      }

      // Validar edad mínima si hay fecha de nacimiento
      if (this.dateOfBirth) {
        const age = this.calculateAge(this.dateOfBirth);
        if (age < 5) {
          throw new Error('La edad mínima permitida es 5 años');
        }
        if (age > 120) {
          throw new Error('Fecha de nacimiento no válida');
        }
      }

      // Validar bio
      if (this.bio && this.bio.length > 1000) {
        throw new Error('Biografía no puede exceder 1000 caracteres');
      }

      console.log(`✅ Usuario validado exitosamente: ${this.email}`);
    } catch (error) {
      console.error(`❌ Error validando usuario: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📧 Validar formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 🎂 Calcular edad desde fecha de nacimiento
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * 👤 Obtener nombre completo formateado
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * 🎭 Verificar si es profesor
   */
  isTeacher(): boolean {
    return this.role === UserRole.TEACHER;
  }

  /**
   * 🎓 Verificar si es estudiante
   */
  isStudent(): boolean {
    return this.role === UserRole.STUDENT;
  }

  /**
   * 👑 Verificar si es administrador
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * 🔒 Verificar si usuario está activo
   */
  checkIfActive(): boolean {
    return this.isActive;
  }
}
