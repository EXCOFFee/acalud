/**
 * ✅ VALIDADOR DE PERMISOS - SIGUIENDO PRINCIPIOS SOLID
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Solo maneja validación de permisos específicos
 * - OCP: Extensible para nuevos tipos de permisos
 * - LSP: Implementa completamente la interface
 * - DIP: Depende de abstracciones de repositorios
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPermissionValidator } from '../interfaces';
import {
  AuthorizationException,
  ResourceNotFoundException,
} from '../../../common/exceptions/business.exception';
import { User, UserRole } from '../../users/user.entity';
import { Classroom } from '../classroom.entity';

@Injectable()
export class PermissionValidator implements IPermissionValidator {
  private readonly logger = new Logger(PermissionValidator.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
  ) {}

  async validateCanCreateClassroom(userId: string): Promise<void> {
    this.logger.log(`Validating create classroom permission for user: ${userId}`);

    const user = await this.loadActiveUser(userId);

    if (user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN) {
      throw new AuthorizationException('crear aula', 'aula', userId);
    }
  }

  async validateCanModifyClassroom(classroomId: string, userId: string): Promise<void> {
    this.logger.log(`Validating modify classroom permission for user ${userId} on classroom ${classroomId}`);

    const [user, classroom] = await Promise.all([
      this.loadActiveUser(userId),
      this.loadClassroom(classroomId),
    ]);

    if (classroom.teacherId !== userId && user.role !== UserRole.ADMIN) {
      throw new AuthorizationException('modificar aula', 'aula', userId);
    }
  }

  async validateCanDeleteClassroom(classroomId: string, userId: string): Promise<void> {
    this.logger.log(`Validating delete classroom permission for user ${userId} on classroom ${classroomId}`);

    await this.validateCanModifyClassroom(classroomId, userId);
  }

  async validateCanJoinClassroom(userId: string): Promise<void> {
    this.logger.log(`Validating join classroom permission for user: ${userId}`);

    const user = await this.loadActiveUser(userId);

    if (user.role !== UserRole.STUDENT) {
      throw new AuthorizationException('unirse a aula', 'aula', userId);
    }
  }

  async validateCanViewClassroom(classroomId: string, userId: string): Promise<void> {
    this.logger.log(`Validating view classroom permission for user ${userId} on classroom ${classroomId}`);

    const [user, classroom] = await Promise.all([
      this.loadActiveUser(userId),
      this.loadClassroom(classroomId, ['students']),
    ]);

    const isTeacher = classroom.teacherId === userId;
    const isStudent = classroom.students?.some(student => student.id === userId) ?? false;

    if (!isTeacher && !isStudent && user.role !== UserRole.ADMIN) {
      throw new AuthorizationException('ver aula', 'aula', userId);
    }
  }

  private async loadActiveUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });

    if (!user) {
      throw new ResourceNotFoundException('Usuario', userId);
    }

    return user;
  }

  private async loadClassroom(classroomId: string, relations: string[] = []): Promise<Classroom> {
    const classroom = await this.classroomRepository.findOne({
      where: { id: classroomId, isActive: true },
      relations,
    });

    if (!classroom) {
      throw new ResourceNotFoundException('Aula', classroomId);
    }

    return classroom;
  }
}
