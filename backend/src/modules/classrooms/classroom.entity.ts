import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsBoolean, 
  IsObject,
  MaxLength,
  MinLength,
  Matches,
  IsIn,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsEmail,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { User } from '../users/user.entity';
import { Activity } from '../activities/activity.entity';
import { ClassroomInvitation } from './classroom-invitation.entity';

@Entity('classrooms')
export class Classroom {
  @ApiProperty({ description: 'ID único del aula' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Nombre del aula' })
  @Column()
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiProperty({ description: 'Descripción del aula' })
  @Column({ type: 'text' })
  @IsString({ message: 'La descripción debe ser un texto válido' })
  @IsOptional()
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  description: string;

  @ApiProperty({ description: 'Materia del aula' })
  @Column()
  @IsString({ message: 'La materia debe ser un texto válido' })
  @IsNotEmpty({ message: 'La materia es obligatoria' })
  @MaxLength(50, { message: 'La materia no puede exceder 50 caracteres' })
  subject: string;

  @ApiProperty({ description: 'Grado o curso del aula' })
  @Column()
  @IsString({ message: 'El grado debe ser un texto válido' })
  @IsNotEmpty({ message: 'El grado es obligatorio' })
  @MaxLength(20, { message: 'El grado no puede exceder 20 caracteres' })
  grade: string;

  @ApiProperty({ description: 'Código de invitación único' })
  @Column({ unique: true })
  @IsString({ message: 'El código de invitación debe ser un texto válido' })
  @MinLength(6, { message: 'El código debe tener al menos 6 caracteres' })
  @MaxLength(10, { message: 'El código no puede exceder 10 caracteres' })
  @Matches(/^[A-Z0-9]+$/, { message: 'El código solo puede contener letras mayúsculas y números' })
  inviteCode: string;

  @ApiProperty({ description: 'Color del aula para identificación visual' })
  @Column({ default: '#6366f1' })
  @IsString({ message: 'El color debe ser un texto válido' })
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe ser un código hexadecimal válido' })
  color: string;

  @ApiProperty({ description: 'Imagen de portada del aula', required: false })
  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'La imagen de portada debe ser un texto válido' })
  coverImage?: string;

  @ApiProperty({ description: 'Configuraciones específicas del aula' })
  @Column({ type: 'jsonb', default: {} })
  @IsObject({ message: 'Las configuraciones deben ser un objeto válido' })
  @IsOptional()
  settings: Record<string, unknown>;

  @ApiProperty({ description: 'Nivel de dificultad declarado para el aula', enum: ['básico', 'intermedio', 'avanzado'], default: 'intermedio' })
  @Column({ type: 'varchar', length: 20, default: 'intermedio' })
  @IsString({ message: 'El nivel debe ser un texto válido' })
  @IsIn(['básico', 'intermedio', 'avanzado'], { message: 'El nivel debe ser básico, intermedio o avanzado' })
  level: 'básico' | 'intermedio' | 'avanzado';

  @ApiProperty({ description: 'Zona horaria asociada al aula', default: 'America/Santiago' })
  @Column({ type: 'varchar', length: 60, default: 'America/Santiago' })
  @IsString({ message: 'La zona horaria debe ser un texto válido' })
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+$/, { message: 'La zona horaria debe tener el formato Región/Ciudad' })
  timezone: string;

  @ApiProperty({ description: 'Idioma principal del aula', enum: ['es', 'en', 'fr', 'pt'], default: 'es' })
  @Column({ type: 'varchar', length: 5, default: 'es' })
  @IsString({ message: 'El idioma debe ser un texto válido' })
  @IsIn(['es', 'en', 'fr', 'pt'], { message: 'El idioma debe ser es, en, fr o pt' })
  language: 'es' | 'en' | 'fr' | 'pt';

  @ApiProperty({ description: 'Etiquetas para clasificación', required: false, type: [String] })
  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben enviarse en formato de lista' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser un texto' })
  @ArrayMaxSize(10, { message: 'Solo se pueden asignar hasta 10 etiquetas' })
  @ArrayUnique({ message: 'Las etiquetas no pueden repetirse' })
  tags?: string[];

  @ApiProperty({ description: 'Correos invitados pendientes de aceptar', required: false, type: [String] })
  @Column('text', { array: true, nullable: true })
  @IsOptional()
  @IsArray({ message: 'Las invitaciones deben enviarse como lista de correos' })
  @IsEmail({}, { each: true, message: 'Cada invitación debe ser un correo válido' })
  @ArrayMaxSize(20, { message: 'No se pueden almacenar más de 20 invitaciones simultáneas' })
  @ArrayUnique({ message: 'No se permiten correos duplicados en las invitaciones' })
  invitedStudentEmails?: string[];

  @ApiProperty({ description: 'Indica si el aula está activa' })
  @Column({ default: true })
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación del aula' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ApiProperty({ description: 'ID del docente propietario' })
  @Column('uuid')
  teacherId: string;

  @ManyToOne(() => User, (user) => user.ownedClassrooms)
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @ManyToMany(() => User, (user) => user.enrolledClassrooms)
  @JoinTable({
    name: 'classroom_students',
    joinColumn: { name: 'classroomId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' },
  })
  students: User[];

  @OneToMany(() => Activity, (activity) => activity.classroom)
  activities: Activity[];

  @OneToMany(() => ClassroomInvitation, (invitation) => invitation.classroom, {
    cascade: false,
  })
  invitations: ClassroomInvitation[];

  /**
   * 🔍 Validación antes de insertar o actualizar
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateClassroom() {
    this.validateName();
    this.validateInviteCode();
    this.validateColor();
    this.validateGradeAndSubject();
    this.validateLevel();
    this.validateTimezone();
    this.validateLanguage();
    this.normalizeTags();
    this.normalizeInvitations();
  }

  /**
   * ✅ Validar nombre
   */
  private validateName() {
    if (!this.name || this.name.trim().length === 0) {
      throw new BadRequestException('El nombre del aula no puede estar vacío');
    }

    if (this.name.length < 3) {
      throw new BadRequestException('El nombre debe tener al menos 3 caracteres');
    }

    if (this.name.length > 100) {
      throw new BadRequestException('El nombre no puede exceder 100 caracteres');
    }

    this.name = this.name.trim();
  }

  /**
   * ✅ Validar nivel
   */
  private validateLevel() {
    if (!['básico', 'intermedio', 'avanzado'].includes(this.level)) {
      throw new BadRequestException('El nivel declarado para el aula es inválido');
    }
  }

  /**
   * ✅ Validar zona horaria
   */
  private validateTimezone() {
    const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/;
    if (!this.timezone || !timezoneRegex.test(this.timezone)) {
      throw new BadRequestException('La zona horaria del aula no tiene un formato válido');
    }
  }

  /**
   * ✅ Validar idioma
   */
  private validateLanguage() {
    if (!['es', 'en', 'fr', 'pt'].includes(this.language)) {
      throw new BadRequestException('El idioma del aula no está dentro de los permitidos');
    }
  }

  /**
   * ✅ Normalizar etiquetas
   */
  private normalizeTags() {
    if (!this.tags) {
      return;
    }

    this.tags = Array.from(new Set(this.tags.map(tag => tag.trim().toLowerCase())));

    if (this.tags.length > 10) {
      throw new BadRequestException('El aula no puede tener más de 10 etiquetas');
    }
  }

  /**
   * ✅ Normalizar invitaciones
   */
  private normalizeInvitations() {
    if (!this.invitedStudentEmails) {
      return;
    }

    this.invitedStudentEmails = Array.from(new Set(
      this.invitedStudentEmails.map(email => email.trim().toLowerCase())
    ));

    if (this.invitedStudentEmails.length > 20) {
      throw new BadRequestException('El aula no puede contener más de 20 correos invitados a la vez');
    }
  }

  /**
   * ✅ Validar código de invitación
   */
  private validateInviteCode() {
    if (!this.inviteCode || this.inviteCode.trim().length === 0) {
      throw new BadRequestException('El código de invitación es obligatorio');
    }

    if (this.inviteCode.length < 6 || this.inviteCode.length > 10) {
      throw new BadRequestException('El código debe tener entre 6 y 10 caracteres');
    }

    // Validar que solo contenga letras mayúsculas y números
    const codeRegex = /^[A-Z0-9]+$/;
    if (!codeRegex.test(this.inviteCode)) {
      throw new BadRequestException('El código solo puede contener letras mayúsculas y números');
    }

    this.inviteCode = this.inviteCode.toUpperCase().trim();
  }

  /**
   * ✅ Validar color
   */
  private validateColor() {
    if (!this.color) {
      this.color = '#6366f1'; // Color por defecto
      return;
    }

    // Validar formato hexadecimal
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(this.color)) {
      throw new BadRequestException('El color debe ser un código hexadecimal válido (ej: #6366f1)');
    }

    this.color = this.color.toLowerCase();
  }

  /**
   * ✅ Validar grado y materia
   */
  private validateGradeAndSubject() {
    if (!this.subject || this.subject.trim().length === 0) {
      throw new BadRequestException('La materia es obligatoria');
    }

    if (!this.grade || this.grade.trim().length === 0) {
      throw new BadRequestException('El grado es obligatorio');
    }

    this.subject = this.subject.trim();
    this.grade = this.grade.trim();
  }

  /**
   * ✅ Generar código de invitación aleatorio
   */
  static generateInviteCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  /**
   * ✅ Obtener número de estudiantes
   */
  getStudentCount(): number {
    return this.students ? this.students.length : 0;
  }

  /**
   * ✅ Obtener número de actividades
   */
  getActivityCount(): number {
    return this.activities ? this.activities.length : 0;
  }

  /**
   * ✅ Verificar si un usuario es estudiante de esta aula
   */
  hasStudent(userId: string): boolean {
    if (!this.students) return false;
    return this.students.some(student => student.id === userId);
  }

  /**
   * ✅ Verificar si un usuario es el docente de esta aula
   */
  isTeacherOf(userId: string): boolean {
    return this.teacherId === userId;
  }
}
