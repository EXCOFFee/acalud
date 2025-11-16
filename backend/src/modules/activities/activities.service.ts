import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity, ActivityType, DifficultyLevel } from './activity.entity';
import { ActivityCompletion } from './activity-completion.entity';
import { User, UserRole } from '../users/user.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CompleteActivityDto } from './dto/complete-activity.dto';

interface FindActivitiesOptions {
  page: number;
  limit: number;
  classroomId?: string;
  type?: ActivityType;
  difficulty?: DifficultyLevel;
  search?: string;
  isActive?: boolean;
  userId?: string;
}

export interface ActivityStats {
  totalCompletions: number;
  averageScore: number;
  averageAttempts: number;
  completionRate: number;
  topScorers: Array<{
    user: Partial<User>;
    score: number;
    completedAt: Date;
  }>;
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    
    @InjectRepository(ActivityCompletion)
    private readonly completionRepository: Repository<ActivityCompletion>,
    
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
  ) {}

  async create(createActivityDto: CreateActivityDto, teacherId: string): Promise<Activity> {
    const startTime = Date.now();
    this.logger.log(`📝 [CREATE_ACTIVITY] Iniciando creación de actividad: ${createActivityDto.title}`);

    try {
      // ====== VALIDACIONES PREVIAS ======
      
      // Validar aula existe
      this.logger.log(`🔍 [VALIDATION] Verificando aula: ${createActivityDto.classroomId}`);
      const classroom = await this.classroomRepository.findOne({
        where: { id: createActivityDto.classroomId },
        relations: ['teacher'],
      });

      if (!classroom) {
        this.logger.warn(`⚠️ [NOT_FOUND] Aula no encontrada: ${createActivityDto.classroomId}`);
        throw new NotFoundException('Aula no encontrada');
      }

      // Validar permisos del docente
      if (classroom.teacher.id !== teacherId) {
        this.logger.warn(`⚠️ [FORBIDDEN] Docente ${teacherId} intentó crear actividad en aula de otro docente`);
        throw new ForbiddenException('Solo el docente propietario puede crear actividades en esta aula');
      }

      this.logger.log(`✅ [PERMISSION] Docente autorizado para crear actividad`);

      // ====== CREACIÓN DE ACTIVIDAD ======
      
      this.logger.log(`🏗️ [BUILD] Construyendo entidad de actividad`);
      const activity = this.activityRepository.create({
        ...createActivityDto,
        createdById: teacherId,
        classroom,
      });

      // Guardar en base de datos
      this.logger.log(`💾 [DATABASE] Guardando actividad en la base de datos`);
      const savedActivity = await this.activityRepository.save(activity);

      // Log de éxito
      const duration = Date.now() - startTime;
      this.logger.log(`✅ [SUCCESS] Actividad creada exitosamente en ${duration}ms`);
      this.logger.log(`📊 [ACTIVITY_INFO] ID: ${savedActivity.id}, Tipo: ${savedActivity.type}, Dificultad: ${savedActivity.difficulty}`);

      return savedActivity;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ [ERROR] Error creando actividad después de ${duration}ms: ${error.message}`);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error interno creando actividad');
    }
  }

  async findAll(options: FindActivitiesOptions) {
    const { page, limit, classroomId, type, difficulty, search, isActive = true, userId } = options;
    
    const queryBuilder = this.activityRepository.createQueryBuilder('activity')
      .leftJoinAndSelect('activity.classroom', 'classroom')
      .leftJoinAndSelect('activity.createdBy', 'createdBy')
      .leftJoinAndSelect('activity.completions', 'completions');

    if (classroomId) {
      queryBuilder.andWhere('activity.classroomId = :classroomId', { classroomId });
    }

    if (type) {
      queryBuilder.andWhere('activity.type = :type', { type });
    }

    if (difficulty) {
      queryBuilder.andWhere('activity.difficulty = :difficulty', { difficulty });
    }

    if (search) {
      queryBuilder.andWhere(
        '(activity.title ILIKE :search OR activity.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('activity.isActive = :isActive', { isActive });
    }

    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['enrolledClassrooms'],
      });

      if (user) {
        if (user.role === UserRole.TEACHER) {
          queryBuilder.andWhere('activity.createdById = :userId', { userId });
        } else if (user.role === UserRole.STUDENT) {
          const classroomIds = user.enrolledClassrooms.map(c => c.id);
          if (classroomIds.length > 0) {
            queryBuilder.andWhere('activity.classroomId IN (:...classroomIds)', { classroomIds });
          }
        }
      }
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    queryBuilder.orderBy('activity.createdAt', 'DESC');

    const [activities, total] = await queryBuilder.getManyAndCount();

    return {
      data: activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getClassroomActivities(classroomId: string, userId: string): Promise<Activity[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['enrolledClassrooms'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === UserRole.STUDENT) {
      const hasAccess = user.enrolledClassrooms.some(classroom => classroom.id === classroomId);
      if (!hasAccess) {
        throw new ForbiddenException('No tienes acceso a este aula');
      }
    } else if (user.role === UserRole.TEACHER) {
      const classroom = await this.classroomRepository.findOne({
        where: { id: classroomId, teacher: { id: userId } },
      });
      if (!classroom) {
        throw new ForbiddenException('No tienes permisos para acceder a este aula');
      }
    }

    return await this.activityRepository.find({
      where: { classroom: { id: classroomId } },
      relations: ['classroom', 'createdBy', 'completions'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['classroom', 'createdBy', 'completions'],
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    await this.checkActivityAccess(activity, userId);
    return activity;
  }

  async update(id: string, updateActivityDto: UpdateActivityDto, teacherId: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['createdBy', 'classroom'],
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (activity.createdBy.id !== teacherId) {
      throw new ForbiddenException('Solo el docente propietario puede actualizar esta actividad');
    }

    Object.assign(activity, updateActivityDto);
    return await this.activityRepository.save(activity);
  }

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (user.role === UserRole.ADMIN) {
      activity.isActive = false;
      await this.activityRepository.save(activity);
      return;
    }

    if (activity.createdBy.id !== userId) {
      throw new ForbiddenException('Solo el docente propietario puede eliminar esta actividad');
    }

    activity.isActive = false;
    await this.activityRepository.save(activity);
  }

  /**
   * ✅ Completar actividad y otorgar recompensas
   * Registra la completación de una actividad y otorga monedas y experiencia al estudiante
   * 
   * @param activityId - ID de la actividad completada
   * @param completeActivityDto - Datos de la completación (score, tiempo, respuestas)
   * @param studentId - ID del estudiante que completó la actividad
   * @returns Registro de completación con recompensas otorgadas
   * 
   * Lógica de recompensas:
   * - Monedas base: 10 + (score * 0.5) - Ejemplo: 100 puntos = 60 monedas
   * - Experiencia base: 20 + (score * 1) - Ejemplo: 100 puntos = 120 XP
   * - Bonus por velocidad: Si completa en menos tiempo del estimado, +20% recompensas
   * - Solo la primera completación otorga recompensas completas
   * - Recompletaciones otorgan 30% de las recompensas si mejora el score
   */
  async completeActivity(activityId: string, completeActivityDto: CompleteActivityDto, studentId: string): Promise<ActivityCompletion> {
    // ========================================
    // 1️⃣ VALIDAR ACTIVIDAD Y ACCESO
    // ========================================
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['classroom', 'classroom.students'],
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (!activity.isActive) {
      throw new BadRequestException('Esta actividad no está disponible');
    }

    // Verificar que el estudiante está inscrito en el aula
    const isEnrolled = activity.classroom.students.some(student => student.id === studentId);
    if (!isEnrolled) {
      throw new ForbiddenException('No tienes acceso a esta actividad');
    }

    // ========================================
    // 2️⃣ BUSCAR COMPLETACIÓN PREVIA
    // ========================================
    const existingCompletion = await this.completionRepository.findOne({
      where: { activityId, studentId },
      relations: ['student', 'activity'],
    });

    // ========================================
    // 3️⃣ OBTENER ESTUDIANTE PARA ACTUALIZAR
    // ========================================
    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // ========================================
    // 4️⃣ CALCULAR RECOMPENSAS
    // ========================================
  const score = completeActivityDto.score;

    // Cálculo de monedas: Base 10 + 0.5 por cada punto de score
    let coinsEarned = Math.floor(10 + (score * 0.5));

    // Cálculo de experiencia: Base 20 + 1 por cada punto de score
    let experienceEarned = Math.floor(20 + score);

    // Bonus por velocidad (si completa en menos del 80% del tiempo estimado)
    const estimatedTime = activity.estimatedTime || 600; // 10 minutos por defecto
    const timeSpentSeconds = completeActivityDto.timeSpent;
    if (timeSpentSeconds < estimatedTime * 0.8) {
      const speedBonus = 1.2; // 20% bonus
      coinsEarned = Math.floor(coinsEarned * speedBonus);
      experienceEarned = Math.floor(experienceEarned * speedBonus);
      this.logger.log(`⚡ Bonus por velocidad aplicado: +20%`);
    }

  let completion: ActivityCompletion;

    // ========================================
    // 5️⃣ GUARDAR COMPLETACIÓN
    // ========================================
    if (existingCompletion) {
      // Ya existe una completación previa
      const previousScore = existingCompletion.score;
      const improvedScore = score > previousScore;

      existingCompletion.score = score;
      existingCompletion.attempts += 1;
      existingCompletion.timeSpent = completeActivityDto.timeSpent;
      existingCompletion.completedAt = new Date();
      completion = await this.completionRepository.save(existingCompletion);

      // Si mejoró el score, otorgar 30% de recompensas
      if (improvedScore) {
        coinsEarned = Math.floor(coinsEarned * 0.3);
        experienceEarned = Math.floor(experienceEarned * 0.3);
        this.logger.log(`🔄 Recompletación con mejora: ${previousScore} → ${score} (30% recompensas)`);
      } else {
        // No mejoró, no otorgar recompensas adicionales
        coinsEarned = 0;
        experienceEarned = 0;
        this.logger.log(`❌ Recompletación sin mejora: No se otorgan recompensas`);
      }
    } else {
      // Primera completación: recompensas completas
      completion = this.completionRepository.create({
        activityId,
        studentId,
        score: completeActivityDto.score,
        maxScore: 100,
        timeSpent: completeActivityDto.timeSpent,
        attempts: 1,
  answers: completeActivityDto.answers as unknown as ActivityCompletion['answers'],
      });
      completion = await this.completionRepository.save(completion);
      this.logger.log(`🎉 Primera completación: Recompensas completas otorgadas`);
    }

    // ========================================
    // 6️⃣ OTORGAR RECOMPENSAS AL ESTUDIANTE
    // ========================================
    if (coinsEarned > 0 || experienceEarned > 0) {
      // Actualizar monedas
      student.coins += coinsEarned;
      
      // Actualizar experiencia
      student.experience += experienceEarned;

      // Calcular nuevo nivel basado en experiencia
      // Fórmula: Nivel = floor(sqrt(experience / 100))
      // Nivel 1: 0 XP, Nivel 2: 100 XP, Nivel 3: 400 XP, Nivel 4: 900 XP, etc.
      const newLevel = Math.floor(Math.sqrt(student.experience / 100)) + 1;
      const oldLevel = student.level;

      // Si subió de nivel, notificar
      if (newLevel > oldLevel) {
        student.level = newLevel;
        this.logger.log(`🎊 ¡Nivel subido! ${oldLevel} → ${newLevel}`);
      }

      // Guardar cambios en el estudiante
      await this.userRepository.save(student);

      this.logger.log(`💰 Recompensas otorgadas a ${student.name}:`);
      this.logger.log(`   • Monedas: +${coinsEarned} (Total: ${student.coins})`);
      this.logger.log(`   • Experiencia: +${experienceEarned} (Total: ${student.experience})`);
      this.logger.log(`   • Nivel: ${student.level}`);
    }

    return completion;
  }

  async getActivityStats(activityId: string, teacherId: string): Promise<ActivityStats> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['createdBy'],
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (activity.createdBy.id !== teacherId) {
      throw new ForbiddenException('No tienes permisos para ver las estadísticas de esta actividad');
    }

    const completions = await this.completionRepository.find({
      where: { activityId },
      relations: ['student'],
      order: { score: 'DESC' },
    });

    const totalCompletions = completions.length;
    const averageScore = totalCompletions > 0 
      ? completions.reduce((sum, c) => sum + c.score, 0) / totalCompletions 
      : 0;
    const averageAttempts = totalCompletions > 0
      ? completions.reduce((sum, c) => sum + c.attempts, 0) / totalCompletions
      : 0;

    const totalStudents = activity.classroom?.students?.length || 0;
    const completionRate = totalStudents > 0 ? (totalCompletions / totalStudents) * 100 : 0;

    const topScorers = completions.slice(0, 5).map(c => ({
      user: {
        id: c.student.id,
        firstName: c.student.firstName,
        lastName: c.student.lastName,
        avatar: c.student.avatar,
      },
      score: c.score,
      completedAt: c.completedAt,
    }));

    return {
      totalCompletions,
      averageScore,
      averageAttempts,
      completionRate,
      topScorers,
    };
  }

  private async checkActivityAccess(activity: Activity, userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['enrolledClassrooms'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.TEACHER && activity.createdBy.id === userId) {
      return;
    }

    if (user.role === UserRole.STUDENT) {
      const hasAccess = user.enrolledClassrooms.some(
        classroom => classroom.id === activity.classroom.id
      );

      if (!hasAccess) {
        throw new ForbiddenException('No tienes acceso a esta actividad');
      }
      return;
    }

    throw new ForbiddenException('No tienes permisos para acceder a esta actividad');
  }

  /**
   * Publica una actividad en la biblioteca pública
   * CU-27: Publicar Actividad
   * @param activityId - ID de la actividad a publicar
   * @param teacherId - ID del docente que publica
   * @returns Actividad publicada
   */
  async publishActivity(activityId: string, teacherId: string): Promise<Activity> {
    const startTime = Date.now();
    this.logger.log(`📢 [PUBLISH_ACTIVITY] Iniciando publicación de actividad: ${activityId}`);

    try {
      // ====== VALIDACIONES PREVIAS ======
      
      // Buscar la actividad
      this.logger.log(`🔍 [VALIDATION] Buscando actividad: ${activityId}`);
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
        relations: ['createdBy', 'classroom'],
      });

      if (!activity) {
        this.logger.warn(`⚠️ [NOT_FOUND] Actividad no encontrada: ${activityId}`);
        throw new NotFoundException('Actividad no encontrada');
      }

      // Verificar que el usuario sea el creador
      if (activity.createdBy.id !== teacherId) {
        this.logger.warn(`⚠️ [FORBIDDEN] Usuario ${teacherId} intentó publicar actividad de otro docente`);
        throw new ForbiddenException('Solo el creador puede publicar esta actividad');
      }

      // Verificar que la actividad no esté ya publicada
      if (activity.isPublic) {
        this.logger.warn(`⚠️ [ALREADY_PUBLIC] Actividad ya está publicada: ${activityId}`);
        throw new BadRequestException('Esta actividad ya está publicada');
      }

      // ====== VALIDACIONES DE CONTENIDO ======
      
      // Validar que la actividad esté completa y tenga contenido válido
      this.logger.log(`✅ [VALIDATION] Validando contenido de la actividad`);
      
      if (!activity.title || activity.title.trim().length < 3) {
        throw new BadRequestException('La actividad debe tener un título válido (mínimo 3 caracteres)');
      }

      if (!activity.description || activity.description.trim().length < 10) {
        throw new BadRequestException('La actividad debe tener una descripción válida (mínimo 10 caracteres)');
      }

      if (!activity.content || Object.keys(activity.content).length === 0) {
        throw new BadRequestException('La actividad debe tener contenido definido');
      }

      // Si es un quiz, validar que tenga preguntas
      if (activity.type === ActivityType.QUIZ) {
        if (!activity.content.questions || !Array.isArray(activity.content.questions) || activity.content.questions.length === 0) {
          throw new BadRequestException('Un quiz debe tener al menos una pregunta para ser publicado');
        }
      }

      // Validar que tenga recompensas definidas
      if (!activity.rewards || typeof activity.rewards.coins !== 'number' || typeof activity.rewards.experience !== 'number') {
        throw new BadRequestException('La actividad debe tener recompensas definidas');
      }

      // Validar que la actividad esté activa
      if (!activity.isActive) {
        throw new BadRequestException('No se puede publicar una actividad inactiva');
      }

      this.logger.log(`✅ [VALIDATION] Todas las validaciones pasaron correctamente`);

      // ====== PUBLICAR ACTIVIDAD ======
      
      this.logger.log(`📢 [PUBLISH] Marcando actividad como pública`);
      activity.isPublic = true;
      
      // Guardar cambios
      this.logger.log(`💾 [DATABASE] Guardando cambios en la base de datos`);
      const publishedActivity = await this.activityRepository.save(activity);

      // Log de éxito
      const duration = Date.now() - startTime;
      this.logger.log(`✅ [SUCCESS] Actividad publicada exitosamente en ${duration}ms`);
      this.logger.log(`📊 [ACTIVITY_INFO] ID: ${publishedActivity.id}, Título: ${publishedActivity.title}`);

      return publishedActivity;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ [ERROR] Error publicando actividad después de ${duration}ms: ${error.message}`);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error interno publicando actividad');
    }
  }
}
