import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classroom } from './classroom.entity';
import { Activity } from '../activities/activity.entity';
import { User, UserRole } from '../users/user.entity';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { JoinClassroomDto } from './dto/join-classroom.dto';

/**
 * Interface para opciones de filtrado de aulas
 */
interface FindClassroomsOptions {
  page: number;
  limit: number;
  search?: string;
  subject?: string;
  grade?: string;
  teacherId?: string;
}

/**
 * Servicio para la gestión de aulas virtuales
 * Contiene toda la lógica de negocio para operaciones con aulas
 */
@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Crea una nueva aula virtual
   * @param createClassroomDto - Datos de la nueva aula
   * @param teacherId - ID del docente que crea el aula
   * @returns Aula creada con código de invitación único
   */
  async create(createClassroomDto: CreateClassroomDto, teacherId: string): Promise<Classroom> {
    // Verificar que el usuario sea un docente
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los docentes pueden crear aulas');
    }

    // Generar código de invitación único
    const inviteCode = await this.generateUniqueInviteCode();

    // Normalizar etiquetas para evitar duplicados
    const normalizedTags = createClassroomDto.tags
      ? Array.from(new Set(createClassroomDto.tags.map(tag => tag.trim().toLowerCase()))).slice(0, 10) as string[] // Limpia, homogeniza y limita las etiquetas
      : undefined; // Si no llegan etiquetas dejamos el valor sin definir para no sobreescribir

    // Normalizar lista de correos invitados
    const normalizedInvites = createClassroomDto.invitedStudentEmails
      ? Array.from(new Set(createClassroomDto.invitedStudentEmails.map(email => email.trim().toLowerCase()))).slice(0, 20) as string[] // Quita espacios, normaliza y evita duplicados
      : undefined; // Si no se enviaron correos dejamos que el valor se mantenga vacío

    // Preparar configuración con valores por defecto combinados con los enviados
    const defaultSettings = {
      allowStudentDiscussion: true, // Habilitamos por defecto los foros entre estudiantes
      requireApprovalForJoin: false, // No se requiere aprobación previa salvo que el docente lo indique
      maxStudents: 50, // Capacidad inicial para nuevas aulas
      timezone: createClassroomDto.timezone || 'America/Santiago', // Establecemos zona horaria por defecto
      language: createClassroomDto.language || 'es', // Idioma base en español
    };

    const mergedSettings = {
      ...defaultSettings, // Partimos de la configuración base
      ...(createClassroomDto.settings || {}), // Permitimos que el docente sobreescriba valores específicos
    };

    // Crear el aula utilizando los datos normalizados
    const classroom = this.classroomRepository.create({
      ...createClassroomDto,
      teacherId,
      inviteCode,
      tags: normalizedTags, // Guardamos las etiquetas normalizadas
      invitedStudentEmails: normalizedInvites, // Persistimos los correos invitados limpios
      level: createClassroomDto.level || 'intermedio', // Nivel por defecto intermedio salvo que se indique otro
      timezone: createClassroomDto.timezone || 'America/Santiago', // Zona horaria final que usará el aula
      language: createClassroomDto.language || 'es', // Idioma final asociado
      settings: mergedSettings, // Configuración consolidada con defaults y overrides
    });

    return this.classroomRepository.save(classroom);
  }

  /**
   * Obtiene todas las aulas con filtros y paginación
   * @param options - Opciones de filtrado y paginación
   * @returns Lista paginada de aulas
   */
  async findAll(options: FindClassroomsOptions) {
    const { page, limit, search, subject, grade, teacherId } = options;

    const queryBuilder = this.classroomRepository
      .createQueryBuilder('classroom')
      .leftJoinAndSelect('classroom.teacher', 'teacher')
      .leftJoinAndSelect('classroom.students', 'students')
      .where('classroom.isActive = :isActive', { isActive: true });

    // Aplicar filtros
    if (search) {
      queryBuilder.andWhere(
        '(classroom.name ILIKE :search OR classroom.description ILIKE :search OR classroom.subject ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (subject) {
      queryBuilder.andWhere('classroom.subject ILIKE :subject', { subject: `%${subject}%` });
    }

    if (grade) {
      queryBuilder.andWhere('classroom.grade = :grade', { grade });
    }

    if (teacherId) {
      queryBuilder.andWhere('classroom.teacherId = :teacherId', { teacherId });
    }

    // Aplicar paginación
    const skip = (page - 1) * limit;
    queryBuilder
      .orderBy('classroom.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [classrooms, total] = await queryBuilder.getManyAndCount();

    return {
      classrooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Busca un aula por su ID
   * @param id - ID único del aula
   * @returns Aula encontrada con relaciones
   */
  async findById(id: string): Promise<Classroom> {
    const classroom = await this.classroomRepository.findOne({
      where: { id },
      relations: ['teacher', 'students', 'activities'],
    });

    if (!classroom) {
      throw new NotFoundException(`Aula con ID ${id} no encontrada`);
    }

    return classroom;
  }

  /**
   * Busca un aula por su código de invitación
   * @param inviteCode - Código de invitación del aula
   * @returns Aula encontrada
   */
  async findByInviteCode(inviteCode: string): Promise<Classroom> {
    const classroom = await this.classroomRepository.findOne({
      where: { inviteCode, isActive: true },
      relations: ['teacher'],
    });

    if (!classroom) {
      throw new NotFoundException('Código de invitación inválido o aula no activa');
    }

    return classroom;
  }

  /**
   * Actualiza los datos de un aula
   * @param id - ID del aula a actualizar
   * @param updateClassroomDto - Datos a actualizar
   * @param userId - ID del usuario que realiza la actualización
   * @returns Aula actualizada
   */
  async update(id: string, updateClassroomDto: UpdateClassroomDto, userId: string): Promise<Classroom> {
    const classroom = await this.findById(id);

    // Verificar permisos: solo el docente propietario o admin puede actualizar
    if (classroom.teacherId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('No tienes permisos para actualizar esta aula');
      }
    }

    const normalizedTags = updateClassroomDto.tags
      ? Array.from(new Set(updateClassroomDto.tags.map(tag => tag.trim().toLowerCase()))).slice(0, 10) as string[] // Normalizamos etiquetas nuevas
      : undefined; // Si no se envían etiquetas no tocamos las existentes

    const normalizedInvites = updateClassroomDto.invitedStudentEmails
      ? Array.from(new Set(updateClassroomDto.invitedStudentEmails.map(email => email.trim().toLowerCase()))).slice(0, 20) as string[] // Normalizamos correos agregados en la edición
      : undefined; // Sin correos nuevos mantenemos la lista previa

    const mergedSettings = updateClassroomDto.settings
      ? {
          ...classroom.settings, // Partimos de la configuración ya guardada
          ...updateClassroomDto.settings, // Aplicamos los cambios enviados
        }
      : undefined; // Si no llegan configuraciones nuevas mantenemos las actuales

    await this.classroomRepository.update(id, {
      ...updateClassroomDto,
      tags: normalizedTags,
      invitedStudentEmails: normalizedInvites,
      settings: mergedSettings,
    });
    return this.findById(id);
  }

  /**
   * Elimina (desactiva) un aula
   * @param id - ID del aula a eliminar
   * @param userId - ID del usuario que realiza la eliminación
   */
  async remove(id: string, userId: string): Promise<void> {
    const classroom = await this.findById(id);

    // Verificar permisos: solo el docente propietario o admin puede eliminar
    if (classroom.teacherId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('No tienes permisos para eliminar esta aula');
      }
    }

    // Desactivar en lugar de eliminar físicamente
    await this.classroomRepository.update(id, { isActive: false });
  }

  /**
   * Permite a un estudiante unirse a un aula usando el código de invitación
   * @param joinClassroomDto - Datos para unirse al aula
   * @param studentId - ID del estudiante
   * @returns Aula a la que se unió
   */
  async joinClassroom(joinClassroomDto: JoinClassroomDto, studentId: string): Promise<Classroom> {
    const { inviteCode } = joinClassroomDto;

    // Buscar el aula por código de invitación
    const classroom = await this.classroomRepository.findOne({
      where: { inviteCode, isActive: true },
      relations: ['students'],
    });

    if (!classroom) {
      throw new NotFoundException('Código de invitación inválido');
    }

    // Verificar que el usuario sea un estudiante
    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('Solo los estudiantes pueden unirse a aulas');
    }

    // Verificar que no esté ya inscrito
    const isAlreadyEnrolled = classroom.students.some(s => s.id === studentId);
    if (isAlreadyEnrolled) {
      throw new ConflictException('Ya estás inscrito en esta aula');
    }

    const currentStudents = classroom.students.length;
    const rawMaxStudents = classroom.settings?.maxStudents;

    const parsedMaxStudents =
      typeof rawMaxStudents === 'number'
        ? rawMaxStudents
        : typeof rawMaxStudents === 'string'
          ? Number.parseInt(rawMaxStudents, 10)
          : Number(rawMaxStudents ?? 50);

    const maxStudentsAllowed = Number.isFinite(parsedMaxStudents) && parsedMaxStudents > 0
      ? parsedMaxStudents
      : 50;

    if (currentStudents >= maxStudentsAllowed) {
      throw new BadRequestException(`El aula alcanzó su límite de ${maxStudentsAllowed} estudiantes`); // Informamos que no hay cupos disponibles
    }

    // Agregar el estudiante al aula
    classroom.students.push(student);
    await this.classroomRepository.save(classroom);

    return this.findById(classroom.id);
  }

  /**
   * Permite a un estudiante salirse de un aula
   * @param classroomId - ID del aula
   * @param studentId - ID del estudiante
   */
  async leaveClassroom(classroomId: string, studentId: string): Promise<void> {
    const classroom = await this.classroomRepository.findOne({
      where: { id: classroomId },
      relations: ['students'],
    });

    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }

    // Verificar que el estudiante esté inscrito
    const studentIndex = classroom.students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
      throw new BadRequestException('No estás inscrito en esta aula');
    }

    // Remover el estudiante del aula
    classroom.students.splice(studentIndex, 1);
    await this.classroomRepository.save(classroom);
  }

  /**
   * Obtiene las aulas de un docente específico
   * @param teacherId - ID del docente
   * @returns Lista de aulas del docente
   */
  async getTeacherClassrooms(teacherId: string): Promise<Classroom[]> {
    return this.classroomRepository.find({
      where: { teacherId, isActive: true },
      relations: ['students'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene las aulas en las que está inscrito un estudiante
   * @param studentId - ID del estudiante
   * @returns Lista de aulas del estudiante
   */
  async getStudentClassrooms(studentId: string): Promise<Classroom[]> {
    return this.classroomRepository
      .createQueryBuilder('classroom')
      .leftJoinAndSelect('classroom.teacher', 'teacher')
      .leftJoin('classroom.students', 'student')
      .where('student.id = :studentId', { studentId })
      .andWhere('classroom.isActive = :isActive', { isActive: true })
      .orderBy('classroom.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Genera un código de invitación único para el aula
   * @returns Código de invitación de 8 caracteres
   */
  private async generateUniqueInviteCode(): Promise<string> {
    let inviteCode: string;
    let exists = true;

    while (exists) {
      // Generar código alfanumérico de 8 caracteres
      inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Verificar que no exista
      const existingClassroom = await this.classroomRepository.findOne({
        where: { inviteCode },
      });
      
      exists = !!existingClassroom;
    }

    return inviteCode;
  }

  /**
   * Regenera el código de invitación de un aula
   * @param classroomId - ID del aula
   * @param userId - ID del usuario que solicita la regeneración
   * @returns Nuevo código de invitación
   */
  async regenerateInviteCode(classroomId: string, userId: string): Promise<string> {
    const classroom = await this.findById(classroomId);

    // Verificar permisos
    if (classroom.teacherId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('No tienes permisos para regenerar el código de esta aula');
      }
    }

    const newInviteCode = await this.generateUniqueInviteCode();
    await this.classroomRepository.update(classroomId, { inviteCode: newInviteCode });

    return newInviteCode;
  }

  /**
   * Obtiene estadísticas de un aula
   * @param classroomId - ID del aula
   * @returns Estadísticas del aula
   */
  async getClassroomStats(classroomId: string) {
    const classroom = await this.classroomRepository.findOne({
      where: { id: classroomId },
      relations: ['students', 'activities'],
    });

    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }

    const totalStudents = classroom.students?.length || 0;
    const totalActivities = classroom.activities?.length || 0;
    const activeActivities = classroom.activities?.filter(activity => activity.isActive).length || 0;

    return {
      totalStudents,
      totalActivities,
      activeActivities,
      createdAt: classroom.createdAt,
      isActive: classroom.isActive,
    };
  }

  /**
   * Agrega una actividad existente al aula
   * CU-20: Agregar Actividad a Aula
   * @param classroomId - ID del aula
   * @param activityId - ID de la actividad a agregar
   * @param userId - ID del usuario que realiza la acción
   * @returns Aula actualizada con la nueva actividad
   */
  async addActivity(classroomId: string, activityId: string, userId: string): Promise<Classroom> {
    // Verificar que el aula existe
    const classroom = await this.classroomRepository.findOne({
      where: { id: classroomId },
      relations: ['activities', 'teacher'],
    });

    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }

    // Verificar permisos: solo el docente propietario o admin pueden agregar actividades
    if (classroom.teacherId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('No tienes permisos para agregar actividades a esta aula');
      }
    }

    // Verificar que la actividad existe
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['createdBy', 'classroom'],
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    // Verificar que la actividad esté activa
    if (!activity.isActive) {
      throw new BadRequestException('No se puede agregar una actividad inactiva');
    }

    // Verificar que la actividad no esté ya en el aula
    const isAlreadyInClassroom = classroom.activities?.some(act => act.id === activityId);
    if (isAlreadyInClassroom) {
      throw new ConflictException('Esta actividad ya está en el aula');
    }

    // IMPORTANTE: Como la relación es ManyToOne desde Activity hacia Classroom,
    // necesitamos actualizar el classroomId de la actividad
    // Sin embargo, esto sobrescribiría el aula original de la actividad.
    // En su lugar, verificamos que la actividad pertenezca al mismo docente
    
    // Verificar que el docente sea el creador de la actividad o admin
    if (activity.createdBy.id !== classroom.teacherId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Solo puedes agregar actividades que tú hayas creado, o debes ser administrador',
        );
      }
    }

    // Verificar que la actividad no pertenezca ya a otra aula
    if (activity.classroom && activity.classroom.id !== classroomId) {
      throw new ConflictException(
        'Esta actividad ya pertenece a otra aula. Debes quitarla de allí primero o crear una copia.',
      );
    }

    // Asignar la actividad al aula
    activity.classroomId = classroomId;
    await this.activityRepository.save(activity);

    // Retornar el aula actualizada con sus actividades
    return this.findById(classroomId);
  }

  /**
   * Quita una actividad del aula (soft delete)
   * CU-22: Quitar Actividad de Aula
   * @param classroomId - ID del aula
   * @param activityId - ID de la actividad a quitar
   * @param userId - ID del usuario que realiza la acción
   */
  async removeActivity(classroomId: string, activityId: string, userId: string): Promise<void> {
    // Verificar que el aula existe
    const classroom = await this.classroomRepository.findOne({
      where: { id: classroomId },
      relations: ['activities'],
    });

    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }

    // Verificar permisos: solo el docente propietario o admin pueden quitar actividades
    if (classroom.teacherId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('No tienes permisos para quitar actividades de esta aula');
      }
    }

    // Verificar que la actividad existe y pertenece al aula
    const activity = classroom.activities?.find(act => act.id === activityId);
    if (!activity) {
      throw new NotFoundException('Actividad no encontrada en esta aula');
    }

    // Soft delete: marcar la actividad como inactiva en lugar de eliminarla
    activity.isActive = false;
    await this.classroomRepository.save(classroom);
  }
}
