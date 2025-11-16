import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { StoreItem, StoreItemType, ItemRarity, ItemAvailability } from '../entities/store-item.entity';
import { UserPurchase, PurchaseStatus, PaymentMethod } from '../entities/user-purchase.entity';
import { User, UserRole } from '../../users/user.entity';
import {
  CreateStoreItemDto,
  UpdateStoreItemDto,
  StoreFilterDto,
  PurchaseItemDto,
  EquipItemDto,
  InventoryFilterDto,
  StoreResponseDto,
  StoreStatsDto
} from '../dto/store.dto';

/**
 * Interfaz para resultados de operaciones de tienda
 * Define la estructura estándar de respuestas del servicio
 */
interface StoreOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Interfaz para resultados paginados de tienda
 * Estructura estándar para respuestas con paginación
 */
export interface StorePaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Servicio para gestión del Sistema de Tienda Cosmética
 * Implementa todos los casos de uso relacionados con compra y gestión de elementos cosméticos
 * 
 * Casos de Uso Implementados:
 * - CU-38: Comprar elementos cosméticos con monedas
 * - CU-39: Gestionar inventario personal
 * 
 * Principios SOLID Aplicados:
 * - Single Responsibility: Cada método tiene una responsabilidad específica
 * - Open/Closed: Extensible para nuevos tipos de elementos y métodos de pago
 * - Liskov Substitution: Interfaces bien definidas para intercambiabilidad
 * - Interface Segregation: Interfaces específicas para cada tipo de operación
 * - Dependency Inversion: Depende de abstracciones (Repository pattern)
 * 
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Injectable()
export class StoreService {
  constructor(
    /**
     * Repositorio para gestión de elementos de tienda
     * Abstracción del acceso a datos siguiendo Repository Pattern
     */
    @InjectRepository(StoreItem)
    private readonly storeItemRepository: Repository<StoreItem>,

    /**
     * Repositorio para gestión de compras de usuarios
     * Manejo del inventario y transacciones
     */
    @InjectRepository(UserPurchase)
    private readonly userPurchaseRepository: Repository<UserPurchase>,

    /**
     * Repositorio de usuarios
     * Validación de permisos y gestión de monedas
     */
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // =====================================
  // GESTIÓN DE ELEMENTOS DE TIENDA (ADMIN)
  // =====================================

  /**
   * Crea un nuevo elemento en la tienda
   * Solo para administradores - gestión del catálogo
   * 
   * @param createDto - Datos del elemento a crear
   * @returns Resultado de la operación con el elemento creado
   */
  async createStoreItem(createDto: CreateStoreItemDto): Promise<StoreOperationResult> {
    try {
      // Validar coherencia de fechas
      if (createDto.availableFrom && createDto.availableUntil) {
        if (createDto.availableFrom >= createDto.availableUntil) {
          throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
        }
      }

      // Validar descuento si está en oferta
      if (createDto.isOnSale && (!createDto.discountPercentage || createDto.discountPercentage <= 0)) {
        throw new BadRequestException('Los elementos en oferta deben tener un descuento válido');
      }

      // Crear elemento
      const storeItem = this.storeItemRepository.create({
        ...createDto,
        soldCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedItem = await this.storeItemRepository.save(storeItem);

      return {
        success: true,
        message: 'Elemento de tienda creado exitosamente',
        data: savedItem
      };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Error al crear elemento: ${error.message}`);
    }
  }

  /**
   * Actualiza un elemento existente de la tienda
   * Solo para administradores
   * 
   * @param itemId - ID del elemento a actualizar
   * @param updateDto - Datos de actualización
   * @returns Resultado de la operación de actualización
   */
  async updateStoreItem(itemId: string, updateDto: UpdateStoreItemDto): Promise<StoreOperationResult> {
    try {
      const storeItem = await this.storeItemRepository.findOne({
        where: { id: itemId }
      });

      if (!storeItem) {
        throw new NotFoundException('Elemento de tienda no encontrado');
      }

      // Validar descuento si se actualiza
      if (updateDto.isOnSale && updateDto.discountPercentage !== undefined) {
        if (updateDto.discountPercentage <= 0) {
          throw new BadRequestException('Los elementos en oferta deben tener un descuento válido');
        }
      }

      // Actualizar campos
      Object.assign(storeItem, updateDto, { updatedAt: new Date() });
      const updatedItem = await this.storeItemRepository.save(storeItem);

      return {
        success: true,
        message: 'Elemento actualizado exitosamente',
        data: updatedItem
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Error al actualizar elemento: ${error.message}`);
    }
  }

  // =====================================
  // CU-38: COMPRAR ELEMENTOS COSMÉTICOS CON MONEDAS
  // =====================================

  /**
   * Permite a un usuario comprar un elemento de la tienda
   * Implementa CU-38: Sistema de compras con monedas de gamificación
   * 
   * Validaciones implementadas:
   * - Usuario debe tener suficientes monedas
   * - Elemento debe estar disponible para compra
   * - Respetar límites de stock y por usuario
   * - Verificar requisitos de nivel y logros
   * - Gestionar transacciones atómicas
   * 
   * @param userId - ID del usuario que compra
   * @param purchaseDto - Datos de la compra
   * @returns Resultado de la operación de compra
   */
  async purchaseItem(userId: string, purchaseDto: PurchaseItemDto): Promise<StoreOperationResult> {
    try {
      // Obtener usuario y validar existencia
      const user = await this.userRepository.findOne({
        where: { id: userId, isActive: true }
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Obtener elemento de tienda
      const storeItem = await this.storeItemRepository.findOne({
        where: { id: purchaseDto.storeItemId, isActive: true }
      });

      if (!storeItem) {
        throw new NotFoundException('Elemento no encontrado en la tienda');
      }

      // Validar disponibilidad general del elemento
      if (!storeItem.isAvailableForPurchase()) {
        throw new ForbiddenException('Este elemento no está disponible para compra en este momento');
      }

      // Contar compras previas del usuario para este elemento
      const userPurchaseCount = await this.userPurchaseRepository.count({
        where: {
          userId,
          storeItemId: purchaseDto.storeItemId,
          purchaseStatus: PurchaseStatus.COMPLETED
        }
      });

      // Validar si el usuario puede comprar este elemento
      if (!storeItem.canUserPurchase(user, userPurchaseCount)) {
        if (user.level < storeItem.minLevelRequired) {
          throw new ForbiddenException(`Necesitas nivel ${storeItem.minLevelRequired} para comprar este elemento`);
        }
        if (storeItem.maxPerUser !== null && userPurchaseCount >= storeItem.maxPerUser) {
          throw new ForbiddenException('Has alcanzado el límite máximo de compras para este elemento');
        }
        throw new ForbiddenException('No cumples los requisitos para comprar este elemento');
      }

      // Calcular precio total
      const unitPrice = storeItem.getFinalPrice();
      const totalPrice = unitPrice * purchaseDto.quantity;

      // Validar monedas suficientes (si el pago es con monedas)
      if (purchaseDto.paymentMethod === PaymentMethod.COINS) {
        if (user.coins < totalPrice) {
          throw new BadRequestException(`Monedas insuficientes. Necesitas ${totalPrice} monedas, tienes ${user.coins}`);
        }
      }

      // SIN VALIDACIÓN DE STOCK - Tienda digital de recompensas ilimitada

      // Gestionar regalo si aplica
      let giftRecipient: User | null = null;
      if (purchaseDto.isGift && purchaseDto.giftToUserId) {
        giftRecipient = await this.userRepository.findOne({
          where: { id: purchaseDto.giftToUserId, isActive: true }
        });

        if (!giftRecipient) {
          throw new NotFoundException('Usuario destinatario del regalo no encontrado');
        }

        if (giftRecipient.id === userId) {
          throw new BadRequestException('No puedes regalarte elementos a ti mismo');
        }
      }

      // Crear registro de compra
      const purchase = this.userPurchaseRepository.create({
        userId: purchaseDto.isGift ? purchaseDto.giftToUserId : userId,
        storeItemId: purchaseDto.storeItemId,
        purchaseStatus: PurchaseStatus.PENDING,
        paymentMethod: purchaseDto.paymentMethod,
        pricePaid: unitPrice,
        originalPriceAtPurchase: storeItem.price,
        discountApplied: storeItem.discountPercentage,
        quantity: purchaseDto.quantity,
        isGift: purchaseDto.isGift || false,
        giftFromUserId: purchaseDto.isGift ? userId : null,
        giftMessage: purchaseDto.giftMessage,
        transactionId: this.generateTransactionId(),
        createdAt: new Date()
      });

      // Guardar compra
      const savedPurchase = await this.userPurchaseRepository.save(purchase);

      // Procesar pago (debitar monedas del usuario)
      if (purchaseDto.paymentMethod === PaymentMethod.COINS) {
        user.coins -= totalPrice;
        await this.userRepository.save(user);
      }

      // Actualizar estadísticas del elemento
      storeItem.incrementSoldCount();
      await this.storeItemRepository.save(storeItem);

      // Completar la transacción
      savedPurchase.markAsCompleted(savedPurchase.transactionId);
      await this.userPurchaseRepository.save(savedPurchase);

      const responseMessage = purchaseDto.isGift
        ? `Regalo enviado exitosamente a ${giftRecipient?.firstName || 'el usuario'}`
        : 'Compra realizada exitosamente';

      return {
        success: true,
        message: responseMessage,
        data: {
          purchase: savedPurchase,
          finalPrice: totalPrice,
          remainingCoins: user.coins,
          item: storeItem.getApiSummary()
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException ||
          error instanceof ForbiddenException ||
          error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Error al procesar compra: ${error.message}`);
    }
  }

  // =====================================
  // CU-39: GESTIONAR INVENTARIO PERSONAL
  // =====================================

  /**
   * Obtiene el inventario de un usuario
   * Implementa CU-39: Visualización de elementos adquiridos
   * 
   * @param userId - ID del usuario
   * @param filters - Filtros de búsqueda y paginación
   * @returns Inventario paginado del usuario
   */
  async getUserInventory(userId: string, filters: InventoryFilterDto): Promise<StorePaginatedResult<UserPurchase>> {
    try {
      const queryBuilder = this.userPurchaseRepository
        .createQueryBuilder('purchase')
        .leftJoinAndSelect('purchase.storeItem', 'item')
        .leftJoinAndSelect('purchase.giftFromUser', 'giftUser')
        .where('purchase.userId = :userId', { userId })
        .andWhere('purchase.purchaseStatus = :status', { status: PurchaseStatus.COMPLETED });

      // Aplicar filtros
      this.applyInventoryFilters(queryBuilder, filters);

      // Aplicar ordenamiento
      const sortField = this.getInventorySortField(filters.sortBy);
      queryBuilder.orderBy(sortField, filters.sortOrder || 'DESC');

      // Aplicar paginación
      const offset = filters.getOffset();
      queryBuilder.skip(offset).take(filters.limit);

      // Ejecutar consulta
      const [items, total] = await queryBuilder.getManyAndCount();

      return this.buildPaginatedResult(items, total, filters.page, filters.limit);

    } catch (error) {
      throw new BadRequestException(`Error al obtener inventario: ${error.message}`);
    }
  }

  /**
   * Equipa o desequipa un elemento cosmético
   * Gestiona el estado activo de elementos en el perfil del usuario
   * 
   * @param userId - ID del usuario
   * @param equipDto - Datos de equipamiento
   * @returns Resultado de la operación
   */
  async equipItem(userId: string, equipDto: EquipItemDto): Promise<StoreOperationResult> {
    try {
      // Buscar la compra del usuario
      const purchase = await this.userPurchaseRepository.findOne({
        where: {
          id: equipDto.purchaseId,
          userId,
          purchaseStatus: PurchaseStatus.COMPLETED
        },
        relations: ['storeItem']
      });

      if (!purchase) {
        throw new NotFoundException('Elemento no encontrado en tu inventario');
      }

      // Validar que puede ser equipado
      if (!purchase.canBeEquipped()) {
        if (purchase.isExpired()) {
          throw new ForbiddenException('Este elemento ha expirado y no puede ser equipado');
        }
        throw new ForbiddenException('Este elemento no puede ser equipado');
      }

      // Si se está equipando, desequipar otros elementos del mismo tipo
      if (equipDto.equip) {
        await this.unequipItemsByType(userId, purchase.storeItem.type, equipDto.purchaseId);
        purchase.equip();
      } else {
        purchase.unequip();
      }

      await this.userPurchaseRepository.save(purchase);

      const message = equipDto.equip
        ? `${purchase.storeItem.name} equipado exitosamente`
        : `${purchase.storeItem.name} desequipado exitosamente`;

      return {
        success: true,
        message,
        data: purchase.getPurchaseSummary()
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException(`Error al equipar elemento: ${error.message}`);
    }
  }

  /**
   * Obtiene los elementos equipados del usuario
   * Para mostrar el perfil cosmético actual
   * 
   * @param userId - ID del usuario
   * @returns Lista de elementos equipados
   */
  async getEquippedItems(userId: string): Promise<UserPurchase[]> {
    try {
      return await this.userPurchaseRepository.find({
        where: {
          userId,
          purchaseStatus: PurchaseStatus.COMPLETED,
          isEquipped: true
        },
        relations: ['storeItem'],
        order: { equippedAt: 'DESC' }
      });

    } catch (error) {
      throw new BadRequestException(`Error al obtener elementos equipados: ${error.message}`);
    }
  }

  // =====================================
  // MÉTODOS DE BÚSQUEDA Y EXPLORACIÓN
  // =====================================

  /**
   * Busca elementos en la tienda con filtros avanzados
   * Implementa búsqueda pública de elementos disponibles
   * 
   * @param userId - ID del usuario (para validar requisitos)
   * @param filters - Criterios de búsqueda y filtrado
   * @returns Lista paginada de elementos disponibles
   */
  async searchStoreItems(userId: string, filters: StoreFilterDto): Promise<StorePaginatedResult<StoreItem>> {
    try {
      // Obtener información del usuario para validaciones
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      const queryBuilder = this.storeItemRepository
        .createQueryBuilder('item')
        .where('item.isActive = :isActive', { isActive: true })
        .andWhere('item.availability IN (:...availabilities)', {
          availabilities: [
            ItemAvailability.AVAILABLE,
            ItemAvailability.LIMITED_TIME,
            ItemAvailability.SEASONAL,
            ItemAvailability.EVENT_EXCLUSIVE
          ]
        });

      // Aplicar filtros
      this.applyStoreFilters(queryBuilder, filters, user);

      // Aplicar ordenamiento
      const sortField = this.getStoreSortField(filters.sortBy);
      queryBuilder.orderBy(`item.${sortField}`, filters.sortOrder || 'ASC');

      // Aplicar paginación
      const offset = filters.getOffset();
      queryBuilder.skip(offset).take(filters.limit);

      // Ejecutar consulta
      const [items, total] = await queryBuilder.getManyAndCount();

      return this.buildPaginatedResult(items, total, filters.page, filters.limit);

    } catch (error) {
      throw new BadRequestException(`Error en búsqueda de tienda: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas generales de la tienda
   * Métricas para administradores y análisis
   * 
   * @returns Estadísticas completas de la tienda
   */
  async getStoreStats(): Promise<StoreStatsDto> {
    try {
      // Total de elementos
      const totalItems = await this.storeItemRepository.count({
        where: { isActive: true }
      });

      // Elementos disponibles
      const availableItems = await this.storeItemRepository.count({
        where: {
          isActive: true,
          availability: In([
            ItemAvailability.AVAILABLE,
            ItemAvailability.LIMITED_TIME,
            ItemAvailability.SEASONAL,
            ItemAvailability.EVENT_EXCLUSIVE
          ])
        }
      });

      // Elementos por tipo
      const typeCounts = await this.storeItemRepository
        .createQueryBuilder('item')
        .select('item.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('item.isActive = :isActive', { isActive: true })
        .groupBy('item.type')
        .getRawMany();

      const itemsByType = Object.values(StoreItemType).reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {} as Record<StoreItemType, number>);

      typeCounts.forEach(count => {
        itemsByType[count.type as StoreItemType] = parseInt(count.count);
      });

      // Elementos por rareza
      const rarityCounts = await this.storeItemRepository
        .createQueryBuilder('item')
        .select('item.rarity', 'rarity')
        .addSelect('COUNT(*)', 'count')
        .where('item.isActive = :isActive', { isActive: true })
        .groupBy('item.rarity')
        .getRawMany();

      const itemsByRarity = Object.values(ItemRarity).reduce((acc, rarity) => {
        acc[rarity] = 0;
        return acc;
      }, {} as Record<ItemRarity, number>);

      rarityCounts.forEach(count => {
        itemsByRarity[count.rarity as ItemRarity] = parseInt(count.count);
      });

      // Top elementos más vendidos
      const topSellingItems = await this.storeItemRepository
        .createQueryBuilder('item')
        .where('item.isActive = :isActive', { isActive: true })
        .orderBy('item.soldCount', 'DESC')
        .take(5)
        .getMany();

      // Total de ventas
      const totalSales = await this.userPurchaseRepository.count({
        where: { purchaseStatus: PurchaseStatus.COMPLETED }
      });

      // Ingresos totales
      const revenueResult = await this.userPurchaseRepository
        .createQueryBuilder('purchase')
        .select('SUM(purchase.pricePaid)', 'total')
        .where('purchase.purchaseStatus = :status', { status: PurchaseStatus.COMPLETED })
        .andWhere('purchase.paymentMethod = :method', { method: PaymentMethod.COINS })
        .getRawOne();

      const totalRevenue = parseInt(revenueResult?.total || '0');

      // Elementos destacados
      const featuredItems = await this.storeItemRepository.find({
        where: {
          isActive: true,
          isFeatured: true
        },
        order: { displayOrder: 'ASC' },
        take: 10
      });

      // Elementos en oferta
      const saleItems = await this.storeItemRepository.find({
        where: {
          isActive: true,
          isOnSale: true
        },
        order: { discountPercentage: 'DESC' },
        take: 10
      });

      return {
        totalItems,
        availableItems,
        itemsByType,
        itemsByRarity,
        topSellingItems,
        totalSales,
        totalRevenue,
        featuredItems,
        saleItems
      };

    } catch (error) {
      throw new BadRequestException(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  // =====================================
  // MÉTODOS AUXILIARES PRIVADOS
  // =====================================

  /**
   * Genera un ID único de transacción
   * @private
   * @returns ID de transacción único
   */
  private generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 9);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Desequipa elementos del mismo tipo antes de equipar uno nuevo
   * @private
   * @param userId - ID del usuario
   * @param itemType - Tipo de elemento
   * @param excludePurchaseId - ID de compra a excluir
   */
  private async unequipItemsByType(userId: string, itemType: StoreItemType, excludePurchaseId: string): Promise<void> {
    await this.userPurchaseRepository.update(
      {
        userId,
        isEquipped: true,
        id: excludePurchaseId ? undefined : undefined // Esto necesita ser refinado
      },
      {
        isEquipped: false,
        equippedAt: null
      }
    );

    // Enfoque más específico
    const equippedItems = await this.userPurchaseRepository.find({
      where: {
        userId,
        purchaseStatus: PurchaseStatus.COMPLETED,
        isEquipped: true
      },
      relations: ['storeItem']
    });

    for (const item of equippedItems) {
      if (item.storeItem.type === itemType && item.id !== excludePurchaseId) {
        item.unequip();
        await this.userPurchaseRepository.save(item);
      }
    }
  }

  /**
   * Aplica filtros al query builder de inventario
   * @private
   */
  private applyInventoryFilters(
    queryBuilder: SelectQueryBuilder<UserPurchase>,
    filters: InventoryFilterDto
  ): void {
    if (filters.type) {
      queryBuilder.andWhere('item.type = :type', { type: filters.type });
    }

    if (filters.equippedOnly) {
      queryBuilder.andWhere('purchase.isEquipped = :equipped', { equipped: true });
    }

    if (filters.activeOnly) {
      queryBuilder.andWhere(
        '(purchase.expiresAt IS NULL OR purchase.expiresAt > :now)',
        { now: new Date() }
      );
    }

    if (filters.rarity) {
      queryBuilder.andWhere('item.rarity = :rarity', { rarity: filters.rarity });
    }

    if (filters.giftsOnly) {
      queryBuilder.andWhere('purchase.isGift = :isGift', { isGift: true });
    }
  }

  /**
   * Aplica filtros al query builder de tienda
   * @private
   */
  private applyStoreFilters(
    queryBuilder: SelectQueryBuilder<StoreItem>,
    filters: StoreFilterDto,
    user?: User
  ): void {
    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(item.name) LIKE LOWER(:search) OR LOWER(item.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.type) {
      queryBuilder.andWhere('item.type = :type', { type: filters.type });
    }

    if (filters.rarity) {
      queryBuilder.andWhere('item.rarity = :rarity', { rarity: filters.rarity });
    }

    if (filters.availability) {
      queryBuilder.andWhere('item.availability = :availability', { availability: filters.availability });
    }

    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere('item.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere('item.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    if (filters.onSaleOnly) {
      queryBuilder.andWhere('item.isOnSale = :onSale', { onSale: true });
    }

    if (filters.featuredOnly) {
      queryBuilder.andWhere('item.isFeatured = :featured', { featured: true });
    }

    if (filters.availableForUserLevel && user) {
      queryBuilder.andWhere('item.minLevelRequired <= :userLevel', { userLevel: user.level });
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('item.tags && :tags', { tags: filters.tags });
    }
  }

  /**
   * Obtiene el campo válido para ordenamiento de inventario
   * @private
   */
  private getInventorySortField(sortBy?: string): string {
    const allowedFields = {
      'purchaseDate': 'purchase.createdAt',
      'equipDate': 'purchase.equippedAt',
      'itemName': 'item.name',
      'rarity': 'item.rarity'
    };

    return allowedFields[sortBy] || 'purchase.createdAt';
  }

  /**
   * Obtiene el campo válido para ordenamiento de tienda
   * @private
   */
  private getStoreSortField(sortBy?: string): string {
    const allowedFields = {
      'name': 'name',
      'price': 'price',
      'rarity': 'rarity',
      'createdAt': 'createdAt',
      'soldCount': 'soldCount',
      'displayOrder': 'displayOrder'
    };

    return allowedFields[sortBy] || 'displayOrder';
  }

  /**
   * Construye el resultado paginado estándar
   * @private
   */
  private buildPaginatedResult<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
  ): StorePaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }
}