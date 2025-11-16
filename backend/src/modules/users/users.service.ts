import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAvatarResponseDto } from './dto/update-avatar-response.dto';

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
 * 👤 SERVICIO DE GESTIÓN DE USUARIOS
 * 
 * Contiene toda la lógica de negocio relacionada con operaciones de usuarios:
 * - Creación y actualización con validaciones
 * - Gestión de contraseñas segura
 * - Búsqueda y filtrado avanzado
 * - Estadísticas y métricas
 * - Auditoría completa
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly saltRounds = 10;
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 📝 Crea un nuevo usuario en el sistema con validaciones completas
   * @param createUserDto - Datos del usuario a crear
   * @returns Usuario creado sin la contraseña
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const startTime = Date.now();
    this.logger.log(`📝 [CREATE] Iniciando creación de usuario: ${createUserDto.email}`);

    try {
      // ====== VALIDACIONES PREVIAS ======
      
      // Validar que el email no esté registrado
      this.logger.log(`🔍 [VALIDATION] Verificando email: ${createUserDto.email}`);
      const existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email.toLowerCase() },
      });

      if (existingUser) {
        this.logger.warn(`⚠️ [CONFLICT] Email ya registrado: ${createUserDto.email}`);
        throw new ConflictException('El email ya está registrado en el sistema');
      }

      // Validar fortaleza de contraseña (ya validada por interceptor, pero verificamos por seguridad)
      this.logger.log(`🔐 [SECURITY] Validando fortaleza de contraseña`);

      // ====== PROCESAMIENTO SEGURO ======
      
      // Hashear la contraseña antes de guardar
      this.logger.log(`🔐 [SECURITY] Hasheando contraseña para ${createUserDto.email}`);
      const hashedPassword = await bcrypt.hash(createUserDto.password, this.saltRounds);

      // Crear entidad de usuario
      const user = this.userRepository.create({
        ...createUserDto,
        email: createUserDto.email.toLowerCase().trim(),
        password: hashedPassword,
        name: `${createUserDto.firstName} ${createUserDto.lastName}`.trim(),
        isActive: true,
      });

      // Guardar en base de datos
      this.logger.log(`💾 [DATABASE] Guardando usuario: ${createUserDto.email}`);
      const savedUser = await this.userRepository.save(user);

      // Log de éxito
      const duration = Date.now() - startTime;
      this.logger.log(`✅ [SUCCESS] Usuario creado exitosamente en ${duration}ms`);
      this.logger.log(`👤 [USER_INFO] ID: ${savedUser.id}, Email: ${savedUser.email}, Rol: ${savedUser.role}`);

      // Retornar sin contraseña
      delete savedUser.password;
      return savedUser;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ [ERROR] Error creando usuario después de ${duration}ms: ${error.message}`);
      
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error interno creando usuario');
    }
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
   * Actualiza el avatar del usuario
   * CU-11: Modificar Avatar de Usuario
   * @param userId - ID del usuario
   * @param file - Archivo de imagen subido
   * @returns Respuesta con la URL del nuevo avatar
   */
  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UpdateAvatarResponseDto> {
    const startTime = Date.now();
    this.logger.log(`🖼️ [UPDATE_AVATAR] Iniciando actualización de avatar para usuario: ${userId}`);

    try {
      // Buscar el usuario
      this.logger.log(`🔍 [VALIDATION] Buscando usuario: ${userId}`);
      const user = await this.findById(userId);

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Validar el archivo
      this.logger.log(`✅ [VALIDATION] Validando archivo: ${file.originalname}`);
      
      // Validar tipo de archivo
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, WebP',
        );
      }

      // Validar tamaño (2MB máximo)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        // Eliminar el archivo subido
        fs.unlinkSync(file.path);
        throw new BadRequestException(
          `El archivo es demasiado grande. Tamaño máximo: 2MB. Tamaño del archivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        );
      }

      this.logger.log(`✅ [VALIDATION] Archivo válido: ${file.filename}`);

      // Eliminar el avatar anterior si existe
      if (user.avatar) {
        this.logger.log(`🗑️ [CLEANUP] Eliminando avatar anterior: ${user.avatar}`);
        
        // Extraer el nombre del archivo de la URL
        // Formato esperado: /uploads/avatars/avatar-123456789.jpg
        const avatarPath = user.avatar.replace(/^\//, ''); // Remover slash inicial si existe
        const fullPath = path.join(process.cwd(), avatarPath);

        // Verificar si el archivo existe antes de eliminarlo
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            this.logger.log(`✅ [CLEANUP] Avatar anterior eliminado exitosamente`);
          } catch (error) {
            this.logger.warn(`⚠️ [CLEANUP] No se pudo eliminar el avatar anterior: ${error.message}`);
            // No lanzar error, continuar con la actualización
          }
        } else {
          this.logger.warn(`⚠️ [CLEANUP] Avatar anterior no encontrado en disco: ${fullPath}`);
        }
      }

      // Generar la URL del nuevo avatar
      // El archivo ya está guardado por Multer en ./uploads/avatars/
      const avatarUrl = `/uploads/avatars/${file.filename}`;
      
      this.logger.log(`💾 [DATABASE] Actualizando avatar en la base de datos: ${avatarUrl}`);

      // Actualizar el usuario con la nueva URL del avatar
      await this.userRepository.update(userId, {
        avatar: avatarUrl,
      });

      // Log de éxito
      const duration = Date.now() - startTime;
      this.logger.log(`✅ [SUCCESS] Avatar actualizado exitosamente en ${duration}ms`);
      this.logger.log(`📊 [AVATAR_INFO] Usuario: ${user.email}, Archivo: ${file.filename}, Tamaño: ${(file.size / 1024).toFixed(2)}KB`);

      return {
        id: userId,
        avatar: avatarUrl,
        message: 'Avatar actualizado exitosamente',
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ [ERROR] Error actualizando avatar después de ${duration}ms: ${error.message}`);
      
      // Si hubo error y el archivo fue subido, eliminarlo
      if (file && file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
          this.logger.log(`🗑️ [CLEANUP] Archivo temporal eliminado después de error`);
        } catch (cleanupError) {
          this.logger.warn(`⚠️ [CLEANUP] No se pudo eliminar archivo temporal: ${cleanupError.message}`);
        }
      }

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error interno actualizando avatar');
    }
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
        'activityCompletions',
        'achievements',
        'ownedClassrooms',
        'enrolledClassrooms',
      ],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Calcular estadísticas adicionales
    const completions = user.activityCompletions || [];
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
      totalActivitiesCompleted: user.activityCompletions?.length || 0,
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
