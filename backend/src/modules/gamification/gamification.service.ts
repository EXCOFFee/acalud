import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement, AchievementType } from './achievement.entity';
import { UserInventory, ItemType } from './user-inventory.entity';
import { User } from '../users/user.entity';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { PurchaseItemDto } from './dto/purchase-item.dto';

/**
 * Interface para estadísticas de gamificación
 */
export interface GamificationStats {
  totalUsers: number;
  totalAchievements: number;
  totalItemsPurchased: number;
  averageUserLevel: number;
  topUsers: Array<{
    user: Partial<User>;
    level: number;
    experience: number;
    coins: number;
  }>;
}

/**
 * Interface para el inventario del usuario
 */
export interface UserInventoryResponse {
  items: UserInventory[];
  totalCoins: number;
  totalItems: number;
  categories: Record<string, number>;
}

/**
 * Servicio para la gestión del sistema de gamificación
 * Contiene toda la lógica para logros, inventario, niveles y recompensas
 */
@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(UserInventory)
    private readonly inventoryRepository: Repository<UserInventory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Crea un nuevo logro en el sistema
   * @param createAchievementDto - Datos del logro a crear
   * @returns Logro creado
   */
  async createAchievement(createAchievementDto: CreateAchievementDto): Promise<Achievement> {
    // Verificar que no existe un logro con el mismo identificador
    const existingAchievement = await this.achievementRepository.findOne({
      where: { identifier: createAchievementDto.identifier },
    });

    if (existingAchievement) {
      throw new ConflictException('Ya existe un logro con este identificador');
    }

    const achievement = this.achievementRepository.create(createAchievementDto);
    return this.achievementRepository.save(achievement);
  }

  /**
   * Obtiene todos los logros disponibles
   * @returns Lista de logros
   */
  async getAllAchievements(): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { isActive: true },
      order: { type: 'ASC', points: 'ASC' },
    });
  }

  /**
   * Obtiene los logros de un usuario específico
   * @param userId - ID del usuario
   * @returns Lista de logros del usuario
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['achievements'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user.achievements || [];
  }

  /**
   * Otorga un logro a un usuario
   * @param userId - ID del usuario
   * @param achievementId - ID del logro
   * @returns Logro otorgado
   */
  async grantAchievement(userId: string, achievementId: string): Promise<Achievement> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['achievements'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const achievement = await this.achievementRepository.findOne({
      where: { id: achievementId, isActive: true },
    });

    if (!achievement) {
      throw new NotFoundException('Logro no encontrado');
    }

    // Verificar que el usuario no tiene ya este logro
    const hasAchievement = user.achievements?.some(a => a.id === achievementId);
    if (hasAchievement) {
      throw new ConflictException('El usuario ya tiene este logro');
    }

    // Agregar el logro al usuario
    if (!user.achievements) {
      user.achievements = [];
    }
    user.achievements.push(achievement);

    // Otorgar recompensas del logro
    await this.userRepository.increment(
      { id: userId },
      'experience',
      achievement.rewards.experience || 0
    );

    await this.userRepository.increment(
      { id: userId },
      'coins',
      achievement.rewards.coins || 0
    );

    // Guardar los cambios
    await this.userRepository.save(user);

    // Actualizar nivel si es necesario
    await this.updateUserLevel(userId);

    return achievement;
  }

  /**
   * Verifica y otorga logros automáticamente basados en acciones del usuario
   * @param userId - ID del usuario
   * @param actionType - Tipo de acción realizada
   * @param metadata - Datos adicionales de la acción
   */
  async checkAndGrantAchievements(
    userId: string,
    actionType: string,
    metadata?: Record<string, any>
  ): Promise<Achievement[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['achievements', 'completedActivities', 'enrolledClassrooms'],
    });

    if (!user) {
      return [];
    }

    const userAchievementIds = user.achievements?.map(a => a.id) || [];
    const pendingAchievements = await this.achievementRepository.find({
      where: { isActive: true },
    });

    const newAchievements: Achievement[] = [];

    for (const achievement of pendingAchievements) {
      // Saltar si ya tiene el logro
      if (userAchievementIds.includes(achievement.id)) {
        continue;
      }

      // Verificar criterios del logro
      const meetsRequirements = await this.checkAchievementRequirements(
        user,
        achievement,
        actionType,
        metadata
      );

      if (meetsRequirements) {
        try {
          const grantedAchievement = await this.grantAchievement(userId, achievement.id);
          newAchievements.push(grantedAchievement);
        } catch (error) {
          // Continuar con otros logros si uno falla
          console.error(`Error otorgando logro ${achievement.id}:`, error);
        }
      }
    }

    return newAchievements;
  }

  /**
   * Obtiene el inventario de un usuario
   * @param userId - ID del usuario
   * @returns Inventario del usuario
   */
  async getUserInventory(userId: string): Promise<UserInventoryResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const items = await this.inventoryRepository.find({
      where: { userId },
      order: { purchasedAt: 'DESC' },
    });

    // Contar items por categoría
    const categories = {
      [ItemType.AVATAR]: 0,
      [ItemType.THEME]: 0,
      [ItemType.BADGE]: 0,
      [ItemType.POWER_UP]: 0,
      [ItemType.DECORATION]: 0,
    };

    items.forEach(item => {
      categories[item.itemType]++;
    });

    return {
      items,
      totalCoins: user.coins,
      totalItems: items.length,
      categories,
    };
  }

  /**
   * Permite a un usuario comprar un item
   * @param userId - ID del usuario
   * @param purchaseItemDto - Datos de la compra
   * @returns Item comprado
   */
  async purchaseItem(userId: string, purchaseItemDto: PurchaseItemDto): Promise<UserInventory> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el usuario tiene suficientes monedas
    if (user.coins < purchaseItemDto.price) {
      throw new BadRequestException('No tienes suficientes monedas para esta compra');
    }

    // Verificar que no tiene ya este item (si es único)
    if (purchaseItemDto.isUnique) {
      const existingItem = await this.inventoryRepository.findOne({
        where: { 
          userId, 
          itemId: purchaseItemDto.itemId 
        },
      });

      if (existingItem) {
        throw new ConflictException('Ya tienes este item en tu inventario');
      }
    }

    // Crear el item en el inventario
    const inventoryItem = this.inventoryRepository.create({
      userId,
      itemId: purchaseItemDto.itemId,
      itemType: purchaseItemDto.itemType,
      itemName: purchaseItemDto.itemName,
      itemData: purchaseItemDto.itemData,
      pricePaid: purchaseItemDto.price,
      purchasedAt: new Date(),
    });

    // Descontar monedas del usuario
    await this.userRepository.decrement(
      { id: userId },
      'coins',
      purchaseItemDto.price
    );

    return this.inventoryRepository.save(inventoryItem);
  }

  /**
   * Obtiene estadísticas generales de gamificación
   * @returns Estadísticas del sistema
   */
  async getGamificationStats(): Promise<GamificationStats> {
    const totalUsers = await this.userRepository.count();
    const totalAchievements = await this.achievementRepository.count({ where: { isActive: true } });
    const totalItemsPurchased = await this.inventoryRepository.count();

    // Calcular nivel promedio
    const avgResult = await this.userRepository
      .createQueryBuilder('user')
      .select('AVG(user.level)', 'average')
      .getRawOne();
    
    const averageUserLevel = parseFloat(avgResult.average) || 1;

    // Obtener top usuarios
    const topUsers = await this.userRepository.find({
      select: ['id', 'firstName', 'lastName', 'avatar', 'level', 'experience', 'coins'],
      where: { isActive: true },
      order: { experience: 'DESC', level: 'DESC' },
      take: 10,
    });

    return {
      totalUsers,
      totalAchievements,
      totalItemsPurchased,
      averageUserLevel,
      topUsers: topUsers.map(user => ({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
        level: user.level,
        experience: user.experience,
        coins: user.coins,
      })),
    };
  }

  /**
   * Actualiza el nivel de un usuario basado en su experiencia
   * @param userId - ID del usuario
   */
  private async updateUserLevel(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    // Fórmula: Nivel = floor(sqrt(experiencia / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(user.experience / 100)) + 1;

    if (newLevel > user.level) {
      await this.userRepository.update(userId, { level: newLevel });
      
      // Verificar logros de nivel
      await this.checkAndGrantAchievements(userId, 'level_up', { newLevel });
    }
  }

  /**
   * Verifica si un usuario cumple los requisitos para un logro
   * @param user - Usuario a verificar
   * @param achievement - Logro a verificar
   * @param actionType - Tipo de acción realizada
   * @param metadata - Datos adicionales
   * @returns True si cumple los requisitos
   */
  private async checkAchievementRequirements(
    user: User,
    achievement: Achievement,
    actionType: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const criteria = achievement.criteria;

    switch (achievement.type) {
      case AchievementType.ACTIVITIES_COMPLETED:
        return (user.completedActivities?.length || 0) >= (criteria.count || 1);

      case AchievementType.EXPERIENCE_GAINED:
        return user.experience >= (criteria.amount || 100);

      case AchievementType.LEVEL_REACHED:
        return user.level >= (criteria.level || 1);

      case AchievementType.CLASSROOMS_JOINED:
        return (user.enrolledClassrooms?.length || 0) >= (criteria.count || 1);

      case AchievementType.PERFECT_SCORE:
        return actionType === 'activity_completed' && 
               metadata?.score === 100 && 
               (metadata?.consecutivePerfectScores || 1) >= (criteria.count || 1);

      case AchievementType.STREAK:
        return actionType === 'daily_activity' && 
               (metadata?.dayStreak || 0) >= (criteria.days || 7);

      case AchievementType.SPECIAL:
        // Logros especiales requieren lógica personalizada
        return this.checkSpecialAchievement(user, achievement, actionType, metadata);

      default:
        return false;
    }
  }

  /**
   * Verifica logros especiales con lógica personalizada
   * @param user - Usuario a verificar
   * @param achievement - Logro especial
   * @param actionType - Tipo de acción
   * @param metadata - Datos adicionales
   * @returns True si cumple los requisitos
   */
  private checkSpecialAchievement(
    user: User,
    achievement: Achievement,
    actionType: string,
    metadata?: Record<string, any>
  ): boolean {
    const identifier = achievement.identifier;

    switch (identifier) {
      case 'first_login':
        return actionType === 'user_login' && metadata?.isFirstLogin === true;

      case 'night_owl':
        return actionType === 'activity_completed' && 
               metadata?.completedAt && 
               new Date(metadata.completedAt).getHours() >= 22;

      case 'early_bird':
        return actionType === 'activity_completed' && 
               metadata?.completedAt && 
               new Date(metadata.completedAt).getHours() <= 6;

      case 'quiz_master':
        return actionType === 'activity_completed' && 
               metadata?.activityType === 'quiz' && 
               metadata?.score >= 95;

      default:
        return false;
    }
  }
}
