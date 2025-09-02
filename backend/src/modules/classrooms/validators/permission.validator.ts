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
import { IPermissionValidator } from '../interfaces';
import { 
  AuthorizationException,
  ResourceNotFoundException 
} from '../../../common/exceptions/business.exception';

@Injectable()
export class PermissionValidator implements IPermissionValidator {
  private readonly logger = new Logger(PermissionValidator.name);

  // TODO: Inyectar repositorios de usuarios y aulas cuando estén disponibles
  // constructor(
  //   private readonly userRepository: IUserRepository,
  //   private readonly classroomRepository: IClassroomRepository,
  // ) {}

  async validateCanCreateClassroom(userId: string): Promise<void> {
    this.logger.log(`Validating create classroom permission for user: ${userId}`);
    
    // TODO: Implementar validación real cuando tengamos acceso a user repository
    // const user = await this.userRepository.findById(userId);
    // 
    // if (!user) {
    //   throw new ResourceNotFoundException('Usuario', userId);
    // }
    // 
    // if (user.role !== 'teacher' && user.role !== 'admin') {
    //   throw new AuthorizationException('crear aula', 'aula', userId);
    // }

    // Por ahora, validación básica
    if (!userId || userId.trim() === '') {
      throw new AuthorizationException('crear aula', 'aula', 'usuario-invalido');
    }

    // Simulación: validar formato de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new AuthorizationException('crear aula', 'aula', userId);
    }
  }

  async validateCanModifyClassroom(classroomId: string, userId: string): Promise<void> {
    this.logger.log(`Validating modify classroom permission for user ${userId} on classroom ${classroomId}`);

    // TODO: Implementar validación real cuando tengamos acceso a repositorios
    // const classroom = await this.classroomRepository.findById(classroomId);
    // const user = await this.userRepository.findById(userId);
    // 
    // if (!classroom) {
    //   throw new ResourceNotFoundException('Aula', classroomId);
    // }
    // 
    // if (!user) {
    //   throw new ResourceNotFoundException('Usuario', userId);
    // }
    // 
    // // Solo el profesor propietario o admin pueden modificar
    // if (classroom.teacherId !== userId && user.role !== 'admin') {
    //   throw new AuthorizationException('modificar aula', 'aula', userId);
    // }

    // Por ahora, validación básica
    if (!userId || !classroomId) {
      throw new AuthorizationException('modificar aula', 'aula', userId || 'usuario-invalido');
    }

    // Validar formato de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId) || !uuidRegex.test(classroomId)) {
      throw new AuthorizationException('modificar aula', 'aula', userId);
    }
  }

  async validateCanDeleteClassroom(classroomId: string, userId: string): Promise<void> {
    this.logger.log(`Validating delete classroom permission for user ${userId} on classroom ${classroomId}`);

    // TODO: Implementar validación real cuando tengamos acceso a repositorios
    // const classroom = await this.classroomRepository.findById(classroomId);
    // const user = await this.userRepository.findById(userId);
    // 
    // if (!classroom) {
    //   throw new ResourceNotFoundException('Aula', classroomId);
    // }
    // 
    // if (!user) {
    //   throw new ResourceNotFoundException('Usuario', userId);
    // }
    // 
    // // Solo el profesor propietario o admin pueden eliminar
    // if (classroom.teacherId !== userId && user.role !== 'admin') {
    //   throw new AuthorizationException('eliminar aula', 'aula', userId);
    // }

    // Por ahora, validación básica (misma lógica que modificar)
    await this.validateCanModifyClassroom(classroomId, userId);
  }

  async validateCanJoinClassroom(userId: string): Promise<void> {
    this.logger.log(`Validating join classroom permission for user: ${userId}`);

    // TODO: Implementar validación real cuando tengamos acceso a user repository
    // const user = await this.userRepository.findById(userId);
    // 
    // if (!user) {
    //   throw new ResourceNotFoundException('Usuario', userId);
    // }
    // 
    // if (!user.isActive) {
    //   throw new AuthorizationException('unirse a aula', 'aula', userId);
    // }
    // 
    // // Verificar si el usuario no está bloqueado
    // if (user.lockedUntil && user.lockedUntil > new Date()) {
    //   throw new AuthorizationException('unirse a aula', 'aula', userId);
    // }

    // Por ahora, validación básica
    if (!userId || userId.trim() === '') {
      throw new AuthorizationException('unirse a aula', 'aula', 'usuario-invalido');
    }

    // Validar formato de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new AuthorizationException('unirse a aula', 'aula', userId);
    }
  }

  async validateCanViewClassroom(classroomId: string, userId: string): Promise<void> {
    this.logger.log(`Validating view classroom permission for user ${userId} on classroom ${classroomId}`);

    // TODO: Implementar validación real cuando tengamos acceso a repositorios
    // const classroom = await this.classroomRepository.findById(classroomId);
    // const user = await this.userRepository.findById(userId);
    // 
    // if (!classroom) {
    //   throw new ResourceNotFoundException('Aula', classroomId);
    // }
    // 
    // if (!user) {
    //   throw new ResourceNotFoundException('Usuario', userId);
    // }
    // 
    // // Verificar si el usuario tiene acceso al aula
    // const hasAccess = classroom.teacherId === userId || 
    //                   classroom.students?.some(student => student.id === userId) ||
    //                   user.role === 'admin';
    // 
    // if (!hasAccess) {
    //   throw new AuthorizationException('ver aula', 'aula', userId);
    // }

    // Por ahora, validación básica
    if (!userId || !classroomId) {
      throw new AuthorizationException('ver aula', 'aula', userId || 'usuario-invalido');
    }

    // Validar formato de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId) || !uuidRegex.test(classroomId)) {
      throw new AuthorizationException('ver aula', 'aula', userId);
    }
  }

  /**
   * Valida formato de UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
