import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Interface para opciones de filtrado y paginación
 */
interface FindAllOptions {
  page: number;
  limit: number;
  role?: string;
  search?: string;
}

/**
 * Interface para estadísticas del usuario
 */
export interface UserStats {
  totalActivitiesCompleted: number;
  totalExperience: number;
  currentLevel: number;
  totalCoins: number;
  averageScore: number;
  totalTimeSpent: number;
  achievementsUnlocked: number;
  streak: number;
  ranking: number;
  classroomsAsStudent: number;
  classroomsAsTeacher: number;
  recentActivities: Array<{
    activityTitle: string;
    score: number;
    completedAt: Date;
  }>;
}

/**
 * Servicio para la gestión de usuarios
 * Contiene toda la lógica de negocio relacionada con operaciones de usuarios
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Crea un nuevo usuario en el sistema
   * @param createUserDto - Datos del usuario a crear
   * @returns Usuario creado sin la contraseña
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado en el sistema');
    }

    // Hashear la contraseña antes de guardar
    const saltRounds = 12; // Alto nivel de seguridad
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Crear el usuario con valores por defecto para gamificación
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      level: 1, // Nivel inicial
      experience: 0, // Experiencia inicial
      coins: 100, // Monedas iniciales como bienvenida
    });

    const savedUser = await this.userRepository.save(user);

    // Remover la contraseña del objeto retornado
    delete savedUser.password;
    return savedUser;
  }

  /**
   * Obtiene todos los usuarios con filtros y paginación
   * @param options - Opciones de filtrado y paginación
   * @returns Lista paginada de usuarios
   */
  async findAll(options: FindAllOptions) {
    const { page, limit, role, search } = options;
    
    // Construir query base
    const queryBuilder: SelectQueryBuilder<User> = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.isActive',
        'user.level',
        'user.experience',
        'user.coins',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Aplicar filtro por rol si se especifica
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    // Aplicar filtro de búsqueda por nombre o email
    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Aplicar paginación
    const skip = (page - 1) * limit;
    queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // Ejecutar query y contar total
    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users,
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
   * Busca un usuario por su ID
   * @param id - ID único del usuario
   * @returns Usuario encontrado sin la contraseña
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'avatar',
        'isActive',
        'level',
        'experience',
        'coins',
        'createdAt',
        'updatedAt',
      ],
      relations: ['ownedClassrooms', 'enrolledClassrooms', 'achievements'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  /**
   * Busca un usuario por su email (incluye contraseña para autenticación)
   * @param email - Email del usuario
   * @returns Usuario con contraseña para validación
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'level',
        'experience',
        'coins',
      ],
    });
  }

  /**
   * Actualiza los datos de un usuario
   * @param id - ID del usuario a actualizar
   * @param updateUserDto - Datos a actualizar
   * @returns Usuario actualizado
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Verificar que el usuario existe
    const user = await this.findById(id);

    // Si se está actualizando el email, verificar que no exista
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está en uso por otro usuario');
      }
    }

    // Si se está actualizando la contraseña, hashearla
    if (updateUserDto.password) {
      const saltRounds = 12;
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    // Actualizar el usuario
    await this.userRepository.update(id, updateUserDto);

    // Retornar el usuario actualizado sin la contraseña
    return this.findById(id);
  }

  /**
   * Elimina (desactiva) un usuario del sistema
   * @param id - ID del usuario a eliminar
   */
  async remove(id: string): Promise<void> {
    const user = await this.findById(id);

    // En lugar de eliminar físicamente, desactivamos el usuario
    await this.userRepository.update(id, { isActive: false });
  }

  /**
   * Obtiene las estadísticas de gamificación de un usuario
   * @param userId - ID del usuario
   * @returns Estadísticas del usuario
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'completedActivities',
        'achievements',
        'ownedClassrooms',
        'enrolledClassrooms',
      ],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Calcular estadísticas adicionales
    const completions = user.completedActivities || [];
    const averageScore = completions.length > 0 
      ? completions.reduce((sum, completion) => sum + completion.score, 0) / completions.length 
      : 0;
    const totalTimeSpent = completions.reduce((sum, completion) => sum + completion.timeSpent, 0);

    // Obtener actividades recientes (últimas 5)
    const recentActivities = completions
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5)
      .map(completion => ({
        activityTitle: completion.activity?.title || 'Actividad',
        score: completion.score,
        completedAt: completion.completedAt,
      }));

    return {
      totalActivitiesCompleted: user.completedActivities?.length || 0,
      totalExperience: user.experience,
      currentLevel: user.level,
      totalCoins: user.coins,
      averageScore,
      totalTimeSpent,
      achievementsUnlocked: user.achievements?.length || 0,
      streak: 0, // TODO: Implementar lógica de streak
      ranking: 0, // TODO: Implementar ranking entre usuarios
      classroomsAsStudent: user.enrolledClassrooms?.length || 0,
      classroomsAsTeacher: user.ownedClassrooms?.length || 0,
      recentActivities,
    };
  }

  /**
   * Obtiene el ranking de usuarios por experiencia
   * @param limit - Número de usuarios a incluir en el ranking
   * @returns Lista de usuarios ordenados por experiencia
   */
  async getExperienceRanking(limit: number) {
    const users = await this.userRepository.find({
      select: [
        'id',
        'firstName',
        'lastName',
        'avatar',
        'level',
        'experience',
        'role',
      ],
      where: { isActive: true },
      order: {
        experience: 'DESC',
        level: 'DESC',
      },
      take: limit,
    });

    // Agregar posición en el ranking
    return users.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  }

  /**
   * Actualiza la experiencia y nivel de un usuario
   * @param userId - ID del usuario
   * @param experienceGained - Experiencia ganada
   */
  async updateExperience(userId: string, experienceGained: number): Promise<void> {
    const user = await this.findById(userId);
    const newExperience = user.experience + experienceGained;
    
    // Calcular nuevo nivel basado en experiencia
    // Fórmula: Nivel = floor(sqrt(experiencia / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;

    await this.userRepository.update(userId, {
      experience: newExperience,
      level: newLevel,
    });
  }

  /**
   * Actualiza las monedas de un usuario
   * @param userId - ID del usuario
   * @param coinsAmount - Cantidad de monedas (puede ser negativa para restar)
   */
  async updateCoins(userId: string, coinsAmount: number): Promise<void> {
    const user = await this.findById(userId);
    const newCoins = Math.max(0, user.coins + coinsAmount); // No permitir monedas negativas

    await this.userRepository.update(userId, {
      coins: newCoins,
    });
  }

  /**
   * Verifica si un usuario puede acceder a un aula específica
   * @param userId - ID del usuario
   * @param classroomId - ID del aula
   * @returns True si puede acceder, false si no
   */
  async canAccessClassroom(userId: string, classroomId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['ownedClassrooms', 'enrolledClassrooms'],
    });

    if (!user) {
      return false;
    }

    // Verificar si es el propietario del aula o está inscrito
    const isOwner = user.ownedClassrooms?.some(classroom => classroom.id === classroomId);
    const isEnrolled = user.enrolledClassrooms?.some(classroom => classroom.id === classroomId);

    return isOwner || isEnrolled;
  }
}
