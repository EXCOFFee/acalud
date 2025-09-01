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
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';
import { Activity } from '../activities/activity.entity';

@Entity('classrooms')
export class Classroom {
  @ApiProperty({ description: 'ID único del aula' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Nombre del aula' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Descripción del aula' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'Materia del aula' })
  @Column()
  subject: string;

  @ApiProperty({ description: 'Grado o curso del aula' })
  @Column()
  grade: string;

  @ApiProperty({ description: 'Código de invitación único' })
  @Column({ unique: true })
  inviteCode: string;

  @ApiProperty({ description: 'Color del aula para identificación visual' })
  @Column({ default: '#6366f1' })
  color: string;

  @ApiProperty({ description: 'Imagen de portada del aula', required: false })
  @Column({ nullable: true })
  coverImage?: string;

  @ApiProperty({ description: 'Configuraciones específicas del aula' })
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Indica si el aula está activa' })
  @Column({ default: true })
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
}
