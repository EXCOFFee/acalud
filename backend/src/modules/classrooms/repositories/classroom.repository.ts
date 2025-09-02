/**
 * ✅ IMPLEMENTACIÓN DEL REPOSITORIO DE AULAS - SIGUIENDO PRINCIPIOS SOLID
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Solo maneja acceso a datos de aulas
 * - OCP: Extensible para diferentes bases de datos
 * - LSP: Implementa completamente la interface
 * - DIP: Depende de abstracciones de TypeORM
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Classroom } from '../classroom.entity';
import { User } from '../../users/user.entity';
import { 
  IClassroomRepository, 
  CreateClassroomData, 
  ClassroomFilters, 
  PaginatedResult 
} from '../interfaces';
import { ResourceNotFoundException } from '../../../common/exceptions/business.exception';

@Injectable()
export class ClassroomRepository implements IClassroomRepository {
  constructor(
    @InjectRepository(Classroom)
    private readonly repository: Repository<Classroom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(classroomData: CreateClassroomData): Promise<Classroom> {
    const classroom = this.repository.create(classroomData);
    return this.repository.save(classroom);
  }

  async findById(id: string): Promise<Classroom | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['teacher', 'students', 'activities'],
    });
  }

  async findByInviteCode(code: string): Promise<Classroom | null> {
    return this.repository.findOne({
      where: { inviteCode: code, isActive: true },
      relations: ['teacher', 'students'],
    });
  }

  async findWithFilters(filters: ClassroomFilters): Promise<PaginatedResult<Classroom>> {
    const queryBuilder = this.repository
      .createQueryBuilder('classroom')
      .leftJoinAndSelect('classroom.teacher', 'teacher')
      .leftJoinAndSelect('classroom.students', 'students')
      .where('classroom.isActive = :isActive', { isActive: true });

    // Aplicar filtros de manera tipada y segura
    this.applyFilters(queryBuilder, filters);
    this.applyPagination(queryBuilder, filters);
    this.applySorting(queryBuilder);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
        hasNextPage: filters.page * filters.limit < total,
        hasPreviousPage: filters.page > 1,
      },
    };
  }

  async update(id: string, updateData: Partial<Classroom>): Promise<Classroom> {
    const result = await this.repository.update(id, {
      ...updateData,
      updatedAt: new Date(),
    });

    if (result.affected === 0) {
      throw new ResourceNotFoundException('Aula', id);
    }

    const updatedClassroom = await this.findById(id);
    if (!updatedClassroom) {
      throw new ResourceNotFoundException('Aula', id);
    }

    return updatedClassroom;
  }

  async delete(id: string): Promise<void> {
    // Soft delete - marcamos como inactivo
    const result = await this.repository.update(id, { 
      isActive: false,
      updatedAt: new Date(),
    });

    if (result.affected === 0) {
      throw new ResourceNotFoundException('Aula', id);
    }
  }

  async addStudent(classroomId: string, studentId: string): Promise<Classroom> {
    const classroom = await this.findById(classroomId);
    if (!classroom) {
      throw new ResourceNotFoundException('Aula', classroomId);
    }

    const student = await this.userRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new ResourceNotFoundException('Usuario', studentId);
    }

    // Verificar si ya está inscrito
    const isAlreadyEnrolled = classroom.students?.some(s => s.id === studentId);
    if (isAlreadyEnrolled) {
      return classroom; // Ya está inscrito, retornar aula actual
    }

    // Agregar estudiante
    if (!classroom.students) {
      classroom.students = [];
    }
    classroom.students.push(student);

    await this.repository.save(classroom);
    return this.findById(classroomId) as Promise<Classroom>;
  }

  async removeStudent(classroomId: string, studentId: string): Promise<Classroom> {
    const classroom = await this.findById(classroomId);
    if (!classroom) {
      throw new ResourceNotFoundException('Aula', classroomId);
    }

    if (classroom.students) {
      classroom.students = classroom.students.filter(student => student.id !== studentId);
      await this.repository.save(classroom);
    }

    return this.findById(classroomId) as Promise<Classroom>;
  }

  async getStudentCount(classroomId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('classroom')
      .leftJoin('classroom.students', 'student')
      .select('COUNT(student.id)', 'count')
      .where('classroom.id = :classroomId', { classroomId })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  /**
   * Aplica filtros de manera tipada y segura
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<Classroom>, 
    filters: ClassroomFilters
  ): void {
    const { search, subject, grade, teacherId, isActive } = filters;

    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(classroom.name) LIKE :search OR LOWER(classroom.description) LIKE :search OR LOWER(classroom.subject) LIKE :search)',
        { search: searchTerm }
      );
    }

    if (subject && subject.trim()) {
      queryBuilder.andWhere('LOWER(classroom.subject) LIKE :subject', { 
        subject: `%${subject.trim().toLowerCase()}%` 
      });
    }

    if (grade && grade.trim()) {
      queryBuilder.andWhere('classroom.grade = :grade', { 
        grade: grade.trim() 
      });
    }

    if (teacherId && this.isValidUUID(teacherId)) {
      queryBuilder.andWhere('classroom.teacherId = :teacherId', { teacherId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('classroom.isActive = :isActive', { isActive });
    }
  }

  /**
   * Aplica paginación
   */
  private applyPagination(
    queryBuilder: SelectQueryBuilder<Classroom>, 
    filters: ClassroomFilters
  ): void {
    const skip = (filters.page - 1) * filters.limit;
    queryBuilder.skip(skip).take(filters.limit);
  }

  /**
   * Aplica ordenamiento por defecto
   */
  private applySorting(queryBuilder: SelectQueryBuilder<Classroom>): void {
    queryBuilder.orderBy('classroom.createdAt', 'DESC');
  }

  /**
   * Valida formato UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
