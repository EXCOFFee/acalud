import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
    const classroom = await this.classroomRepository.findOne({
      where: { id: createActivityDto.classroomId },
      relations: ['teacher'],
    });

    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }

    if (classroom.teacher.id !== teacherId) {
      throw new ForbiddenException('Solo el docente propietario puede crear actividades en esta aula');
    }

    const activity = this.activityRepository.create({
      ...createActivityDto,
      createdById: teacherId,
      classroom,
    });

    return await this.activityRepository.save(activity);
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

  async completeActivity(activityId: string, completeActivityDto: CompleteActivityDto, studentId: string): Promise<ActivityCompletion> {
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

    const isEnrolled = activity.classroom.students.some(student => student.id === studentId);
    if (!isEnrolled) {
      throw new ForbiddenException('No tienes acceso a esta actividad');
    }

    const existingCompletion = await this.completionRepository.findOne({
      where: { activityId, studentId },
      relations: ['student', 'activity'],
    });

    let completion: ActivityCompletion;

    if (existingCompletion) {
      existingCompletion.score = completeActivityDto.score;
      existingCompletion.attempts += 1;
      existingCompletion.timeSpent = completeActivityDto.timeSpent;
      existingCompletion.completedAt = new Date();
      completion = await this.completionRepository.save(existingCompletion);
    } else {
      completion = this.completionRepository.create({
        activityId,
        studentId,
        score: completeActivityDto.score,
        maxScore: 100,
        timeSpent: completeActivityDto.timeSpent,
        attempts: 1,
        answers: completeActivityDto.answers as any,
      });
      completion = await this.completionRepository.save(completion);
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
}
