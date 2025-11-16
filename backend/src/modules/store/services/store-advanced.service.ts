/**
 * 🛍️ SERVICIO AVANZADO DE TIENDA Y ECONOMÍA VIRTUAL
 * 
 * Gestión completa del sistema de tienda educativa con monedas virtuales.
 * Incluye compras, inventario, transacciones, estadísticas y gamificación.
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Sistema completo de monedas virtuales
 * - Compras con validaciones avanzadas  
 * - Inventario personalizado por usuario
 * - Sistema de recompensas automáticas
 * - Análisis y estadísticas detalladas
 * - Integración con gamificación
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Entidades
import { StoreItem, StoreItemType, ItemRarity, ItemAvailability } from '../entities/store-item.entity';
import { UserPurchase, PaymentMethod, PurchaseStatus } from '../entities/user-purchase.entity';
import { 
  UserCurrencyBalance, 
  CurrencyTransaction, 
  CurrencyType, 
  TransactionType, 
  TransactionSource,
  TransactionStatus 
} from '../entities/virtual-currency.entity';

// DTOs
import {
  CreateStoreItemDto,
  UpdateStoreItemDto,
  PurchaseItemDto,
  StoreFilterDto,
  InventoryFilterDto,
  EquipItemDto,
  StoreResponseDto,
  StoreStatsDto
} from '../dto/store.dto';

// Interfaces
interface PurchaseValidation {
  isValid: boolean;
  errors: string[];
  finalPrice: number;
  userBalance: number;
}

interface RewardConfig {
  baseAmount: number;
  multiplier: number;
  bonusConditions: {
    perfectScore?: number;
    streak?: number;
    firstTime?: number;
  };
}

@Injectable()
export class StoreAdvancedService {
  private readonly logger = new Logger(StoreAdvancedService.name);

  constructor(
    @InjectRepository(StoreItem)
    private readonly storeItemRepository: Repository<StoreItem>,
    @InjectRepository(UserPurchase)
    private readonly userPurchaseRepository: Repository<UserPurchase>,
    @InjectRepository(UserCurrencyBalance)
    private readonly currencyBalanceRepository: Repository<UserCurrencyBalance>,
    @InjectRepository(CurrencyTransaction)
    private readonly transactionRepository: Repository<CurrencyTransaction>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // =============================================================================
  // GESTIÓN DE ITEMS DE TIENDA
  // =============================================================================

  /**
   * 🛍️ Obtener items de tienda con filtros
   */
  async getStoreItems(filters: StoreFilterDto, userId?: string): Promise<any> {
    this.logger.log(`🛍️ Obteniendo items de tienda con filtros`);

    const queryBuilder = this.createStoreItemQuery(filters, userId);

    // Aplicar paginación
    const offset = (filters.page - 1) * filters.limit;
    queryBuilder.skip(offset).take(filters.limit);

    // Ejecutar consulta
    const [items, total] = await queryBuilder.getManyAndCount();

    // Obtener estadísticas
    const stats = await this.getSearchStats(filters);

    return {
      data: items.map(item => this.mapStoreItemToResponse(item)),
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      hasNextPage: filters.page < Math.ceil(total / filters.limit),
      hasPrevPage: filters.page > 1,
      appliedFilters: this.getAppliedFilters(filters),
      searchStats: stats,
    };
  }

  /**
   * 📄 Obtener item específico
   */
  async getStoreItem(itemId: string, userId?: string): Promise<any> {
    this.logger.log(`📄 Obteniendo item: ${itemId}`);

    const item = await this.storeItemRepository.findOne({
      where: { id: itemId, isActive: true },
    });

    if (!item) {
      throw new NotFoundException(`Item con ID ${itemId} no encontrado`);
    }

    // Incrementar contador de vistas
    await this.storeItemRepository.increment({ id: itemId }, 'soldCount', 0);

    const response = this.mapStoreItemToResponse(item);

    // Si hay usuario, añadir información personalizada
    if (userId) {
      const userInfo = await this.getUserItemInfo(userId, itemId);
      response.userInfo = userInfo;
    }

    return response;
  }

  /**
   * ✨ Crear nuevo item de tienda (solo admin)
   */
  async createStoreItem(createDto: CreateStoreItemDto): Promise<any> {
    this.logger.log(`✨ Creando nuevo item: ${createDto.name}`);

    // Verificar duplicados por nombre
    const existingItem = await this.storeItemRepository.findOne({
      where: { name: createDto.name },
    });

    if (existingItem) {
      throw new ConflictException(`Ya existe un item con el nombre: ${createDto.name}`);
    }

    const item = this.storeItemRepository.create({
      ...createDto,
      isActive: true,
      soldCount: 0,
    });

    const savedItem = await this.storeItemRepository.save(item);

    this.logger.log(`✅ Item creado exitosamente: ${savedItem.id}`);

    // Emitir evento
    this.eventEmitter.emit('store.item.created', {
      itemId: savedItem.id,
      name: savedItem.name,
      type: savedItem.type,
      price: savedItem.price,
    });

    return this.mapStoreItemToResponse(savedItem);
  }

  /**
   * ✏️ Actualizar item existente
   */
  async updateStoreItem(itemId: string, updateDto: UpdateStoreItemDto): Promise<any> {
    this.logger.log(`✏️ Actualizando item: ${itemId}`);

    const item = await this.storeItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item con ID ${itemId} no encontrado`);
    }

    // Actualizar campos
    Object.assign(item, updateDto);
    const updatedItem = await this.storeItemRepository.save(item);

    this.logger.log(`✅ Item actualizado exitosamente: ${itemId}`);

    // Emitir evento
    this.eventEmitter.emit('store.item.updated', {
      itemId: updatedItem.id,
      changes: updateDto,
    });

    return this.mapStoreItemToResponse(updatedItem);
  }

  // =============================================================================
  // SISTEMA DE COMPRAS
  // =============================================================================

  /**
   * 🛒 Realizar compra de item
   */
  async purchaseItem(userId: string, purchaseDto: PurchaseItemDto): Promise<any> {
    this.logger.log(`🛒 Usuario ${userId} comprando item ${purchaseDto.storeItemId}`);

    // Validar compra
    const validation = await this.validatePurchase(userId, purchaseDto);
    if (!validation.isValid) {
      throw new BadRequestException(`Compra inválida: ${validation.errors.join(', ')}`);
    }

    // Obtener item y balance
    const item = await this.storeItemRepository.findOne({
      where: { id: purchaseDto.storeItemId },
    });

    const balance = await this.getUserBalance(userId, CurrencyType.COINS);

    // Iniciar transacción de compra
    return await this.executeTransaction(async () => {
      // Descontar monedas
      const transaction = await balance.spendCurrency(
        validation.finalPrice,
        `Compra de ${item.name}`,
        {
          itemId: item.id,
          itemName: item.name,
          quantity: purchaseDto.quantity || 1,
        }
      );

      // Crear registro de compra
      const purchase = this.userPurchaseRepository.create({
        userId,
        storeItemId: item.id,
        quantity: purchaseDto.quantity || 1,
        pricePaid: validation.finalPrice,
        originalPriceAtPurchase: item.price,
        discountApplied: item.discountPercentage || 0,
        paymentMethod: purchaseDto.paymentMethod || PaymentMethod.COINS,
        purchaseStatus: PurchaseStatus.COMPLETED,
        isGift: purchaseDto.isGift || false,
        giftFromUserId: purchaseDto.isGift ? userId : null,
        giftMessage: purchaseDto.giftMessage,
      });

      const savedPurchase = await this.userPurchaseRepository.save(purchase);
      // Asegurar que savedPurchase sea un objeto y no un array
      const finalPurchase = Array.isArray(savedPurchase) ? savedPurchase[0] : savedPurchase;

      // Actualizar estadísticas del item
      await item.incrementSoldCount();
      await this.storeItemRepository.save(item);

      // Guardar balance actualizado
      await this.currencyBalanceRepository.save(balance);
      await this.transactionRepository.save(transaction);

      this.logger.log(`✅ Compra realizada exitosamente: ${finalPurchase.id}`);

      // Emitir eventos
      this.eventEmitter.emit('store.purchase.completed', {
        userId,
        purchaseId: finalPurchase.id,
        itemId: item.id,
        amount: validation.finalPrice,
      });

      return {
        success: true,
        message: 'Compra realizada exitosamente',
        data: {
          purchase: savedPurchase,
          remainingBalance: balance.currentBalance,
          item: this.mapStoreItemToResponse(item),
        },
      };
    });
  }

  /**
   * 📦 Obtener inventario de usuario
   */
  async getUserInventory(userId: string, filters: InventoryFilterDto): Promise<any> {
    this.logger.log(`📦 Obteniendo inventario del usuario: ${userId}`);

    const queryBuilder = this.userPurchaseRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.storeItem', 'item')
      .where('purchase.userId = :userId', { userId });

    // Aplicar filtros
    if (filters.type) {
      queryBuilder.andWhere('item.type = :type', { type: filters.type });
    }

    if (filters.equippedOnly) {
      queryBuilder.andWhere('purchase.isEquipped = :equipped', { equipped: true });
    }

    if (filters.rarity) {
      queryBuilder.andWhere('item.rarity = :rarity', { rarity: filters.rarity });
    }

    if (filters.giftsOnly) {
      queryBuilder.andWhere('purchase.isGift = :isGift', { isGift: true });
    }

    // Ordenamiento
    const sortField = filters.sortBy === 'purchaseDate' ? 'purchase.createdAt' : 
                     filters.sortBy === 'itemName' ? 'item.name' :
                     'purchase.createdAt';

    queryBuilder.orderBy(sortField, filters.sortOrder);

    // Paginación
    const offset = (filters.page - 1) * filters.limit;
    queryBuilder.skip(offset).take(filters.limit);

    const [purchases, total] = await queryBuilder.getManyAndCount();

    return {
      data: purchases.map(purchase => this.mapPurchaseToInventoryItem(purchase)),
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      hasNextPage: filters.page < Math.ceil(total / filters.limit),
      hasPrevPage: filters.page > 1,
      summary: await this.getInventorySummary(userId),
    };
  }

  /**
   * ⚙️ Equipar/desequipar item
   */
  async equipItem(userId: string, equipDto: EquipItemDto): Promise<StoreResponseDto> {
    this.logger.log(`⚙️ ${equipDto.equip ? 'Equipando' : 'Desequipando'} item: ${equipDto.purchaseId}`);

    const purchase = await this.userPurchaseRepository.findOne({
      where: { id: equipDto.purchaseId, userId },
      relations: ['storeItem'],
    });

    if (!purchase) {
      throw new NotFoundException('Compra no encontrada en tu inventario');
    }

    // Si equipando, desequipar otros del mismo tipo
    if (equipDto.equip) {
      await this.userPurchaseRepository.update(
        { 
          userId, 
          isEquipped: true,
          storeItem: { type: purchase.storeItem.type } 
        },
        { isEquipped: false }
      );
    }

    // Equipar/desequipar el item
    purchase.isEquipped = equipDto.equip;
    purchase.equippedAt = equipDto.equip ? new Date() : null;
    
    await this.userPurchaseRepository.save(purchase);

    // Emitir evento
    this.eventEmitter.emit('store.item.equipped', {
      userId,
      purchaseId: purchase.id,
      itemId: purchase.storeItem.id,
      equipped: equipDto.equip,
    });

    return {
      success: true,
      message: `Item ${equipDto.equip ? 'equipado' : 'desequipado'} exitosamente`,
      data: { purchase: this.mapPurchaseToInventoryItem(purchase) },
    };
  }

  // =============================================================================
  // SISTEMA DE MONEDAS VIRTUALES
  // =============================================================================

  /**
   * 💰 Obtener balance de usuario
   */
  async getUserBalance(userId: string, currencyType: CurrencyType = CurrencyType.COINS): Promise<UserCurrencyBalance> {
    let balance = await this.currencyBalanceRepository.findOne({
      where: { userId, currencyType },
    });

    if (!balance) {
      // Crear balance inicial
      balance = this.currencyBalanceRepository.create({
        userId,
        currencyType,
        currentBalance: this.getInitialBalance(currencyType),
      });
      balance = await this.currencyBalanceRepository.save(balance);
    }

    return balance;
  }

  /**
   * 🎁 Otorgar monedas por actividad
   */
  async grantCurrency(
    userId: string,
    amount: number,
    source: TransactionSource,
    reason: string,
    currencyType: CurrencyType = CurrencyType.COINS,
    metadata?: any
  ): Promise<any> {
    this.logger.log(`🎁 Otorgando ${amount} ${currencyType} a usuario ${userId} por: ${reason}`);

    const balance = await this.getUserBalance(userId, currencyType);
    
    // Aplicar multiplicadores si aplica
    const finalAmount = this.applyBonusMultipliers(amount, source, metadata);

    const transaction = await balance.addCurrency(finalAmount, source, reason, metadata);
    
    // Guardar cambios
    await this.currencyBalanceRepository.save(balance);
    await this.transactionRepository.save(transaction);

    // Emitir evento
    this.eventEmitter.emit('currency.granted', {
      userId,
      amount: finalAmount,
      currencyType,
      source,
      balanceAfter: balance.currentBalance,
    });

    // Verificar logros de monedas
    await this.checkCurrencyAchievements(userId, balance);

    return {
      success: true,
      message: `Se otorgaron ${finalAmount} ${currencyType}`,
      data: {
        amount: finalAmount,
        newBalance: balance.currentBalance,
        transaction: transaction,
      },
    };
  }

  /**
   * 📊 Obtener historial de transacciones
   */
  async getTransactionHistory(
    userId: string,
    filters: any = {}
  ): Promise<any> {
    this.logger.log(`📊 Obteniendo historial de transacciones para usuario: ${userId}`);

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    // Aplicar filtros
    if (filters.transactionType) {
      queryBuilder.andWhere('transaction.transactionType = :type', { 
        type: filters.transactionType 
      });
    }

    if (filters.source) {
      queryBuilder.andWhere('transaction.source = :source', { source: filters.source });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('transaction.createdAt >= :dateFrom', { 
        dateFrom: filters.dateFrom 
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('transaction.createdAt <= :dateTo', { 
        dateTo: filters.dateTo 
      });
    }

    // Ordenamiento
    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    queryBuilder.skip(offset).take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    // Calcular resumen
    const summary = await this.getTransactionSummary(userId, filters);

    return {
      data: transactions.map(tx => ({
        ...tx,
        displayInfo: tx.getDisplayInfo(),
        formattedAmount: tx.getFormattedAmount(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
      summary,
    };
  }

  // =============================================================================
  // ANÁLISIS Y ESTADÍSTICAS
  // =============================================================================

  /**
   * 📈 Obtener estadísticas de la tienda
   */
  async getStoreStats(): Promise<StoreStatsDto> {
    this.logger.log(`📈 Generando estadísticas de la tienda`);

    const [
      totalItems,
      availableItems,
      itemsByType,
      itemsByRarity,
      topSellingItems,
      totalSales,
      totalRevenue,
      featuredItems,
      saleItems
    ] = await Promise.all([
      this.storeItemRepository.count({ where: { isActive: true } }),
      this.storeItemRepository.count({ 
        where: { 
          isActive: true, 
          availability: ItemAvailability.AVAILABLE 
        } 
      }),
      this.getItemsByType(),
      this.getItemsByRarity(),
      this.getTopSellingItems(),
      this.userPurchaseRepository.count(),
      this.getTotalRevenue(),
      this.getFeaturedItems(),
      this.getSaleItems(),
    ]);

    return {
      totalItems,
      availableItems,
      itemsByType,
      itemsByRarity,
      topSellingItems,
      totalSales,
      totalRevenue,
      featuredItems,
      saleItems,
    };
  }

  // =============================================================================
  // UTILIDADES PRIVADAS
  // =============================================================================

  private createStoreItemQuery(filters: StoreFilterDto, userId?: string): SelectQueryBuilder<StoreItem> {
    const queryBuilder = this.storeItemRepository
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true });

    // Aplicar filtros
    if (filters.type) {
      queryBuilder.andWhere('item.type = :type', { type: filters.type });
    }

    if (filters.rarity) {
      queryBuilder.andWhere('item.rarity = :rarity', { rarity: filters.rarity });
    }

    if (filters.availability) {
      queryBuilder.andWhere('item.availability = :availability', { 
        availability: filters.availability 
      });
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

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(item.name) LIKE LOWER(:search) OR LOWER(item.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('item.tags && :tags', { tags: filters.tags });
    }

    // Disponibilidad para nivel de usuario
    if (filters.availableForUserLevel && userId) {
      // Esto requeriría obtener el nivel del usuario
      // queryBuilder.andWhere('item.minLevelRequired <= :userLevel', { userLevel });
    }

    // Solo items disponibles actualmente
    // TODO: Agregar availableOnly al StoreFilterDto
    // if (filters.availableOnly !== false) {
    if (true) { // Temporalmente siempre aplicar filtro de disponibilidad
      const now = new Date();
      queryBuilder
        .andWhere('(item.availableFrom IS NULL OR item.availableFrom <= :now)', { now })
        .andWhere('(item.availableUntil IS NULL OR item.availableUntil >= :now)', { now })
        .andWhere('item.availability IN (:...availableStatuses)', {
          availableStatuses: [
            ItemAvailability.AVAILABLE,
            ItemAvailability.LIMITED_TIME,
            ItemAvailability.SEASONAL,
            ItemAvailability.EVENT_EXCLUSIVE
          ]
        });
    }

    // Ordenamiento
    const sortField = filters.sortBy === 'price' ? 'item.price' :
                     filters.sortBy === 'name' ? 'item.name' :
                     filters.sortBy === 'rarity' ? 'item.rarity' :
                     filters.sortBy === 'createdAt' ? 'item.createdAt' :
                     filters.sortBy === 'popularity' ? 'item.soldCount' :
                     'item.displayOrder';

    queryBuilder.orderBy(sortField, filters.sortOrder);

    return queryBuilder;
  }

  private async validatePurchase(userId: string, purchaseDto: PurchaseItemDto): Promise<PurchaseValidation> {
    const errors: string[] = [];

    // Obtener item
    const item = await this.storeItemRepository.findOne({
      where: { id: purchaseDto.storeItemId },
    });

    if (!item) {
      errors.push('Item no encontrado');
      return { isValid: false, errors, finalPrice: 0, userBalance: 0 };
    }

    // Verificar disponibilidad
    if (!item.isAvailableForPurchase()) {
      errors.push('Item no disponible para compra');
    }

    // Obtener balance del usuario
    const balance = await this.getUserBalance(userId, CurrencyType.COINS);
    const finalPrice = item.getFinalPrice() * (purchaseDto.quantity || 1);

    // Verificar balance suficiente
    if (balance.currentBalance < finalPrice) {
      errors.push(`Balance insuficiente. Necesitas ${finalPrice} monedas, tienes ${balance.currentBalance}`);
    }

    // Verificar límites de compra por usuario
    if (item.maxPerUser) {
      const userPurchases = await this.userPurchaseRepository.count({
        where: { userId, storeItemId: item.id },
      });

      if (userPurchases >= item.maxPerUser) {
        errors.push(`Has alcanzado el límite máximo de compras para este item (${item.maxPerUser})`);
      }
    }

    // Verificar stock disponible
    const remainingStock = item.getRemainingStock();
    if (remainingStock !== null && remainingStock < (purchaseDto.quantity || 1)) {
      errors.push(`Stock insuficiente. Disponible: ${remainingStock}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      finalPrice,
      userBalance: balance.currentBalance,
    };
  }

  private mapStoreItemToResponse(item: StoreItem): any {
    return {
      ...item.getApiSummary(),
      rarityColor: item.getRarityColor(),
      rarityDisplayName: item.getRarityDisplayName(),
    };
  }

  private mapPurchaseToInventoryItem(purchase: UserPurchase): any {
    return {
      id: purchase.id,
      item: this.mapStoreItemToResponse(purchase.storeItem),
      quantity: purchase.quantity,
      totalPrice: purchase.pricePaid,
      isEquipped: purchase.isEquipped,
      isGift: purchase.isGift,
      giftMessage: purchase.giftMessage,
      purchasedAt: purchase.createdAt,
      equippedAt: purchase.equippedAt,
    };
  }

  private async executeTransaction<T>(operation: () => Promise<T>): Promise<T> {
    // Implementar transacción de base de datos
    return await operation();
  }

  private getInitialBalance(currencyType: CurrencyType): number {
    switch (currencyType) {
      case CurrencyType.COINS:
        return this.configService.get<number>('INITIAL_COINS', 100);
      case CurrencyType.GEMS:
        return this.configService.get<number>('INITIAL_GEMS', 10);
      default:
        return 0;
    }
  }

  private applyBonusMultipliers(
    amount: number, 
    source: TransactionSource, 
    metadata?: any
  ): number {
    let finalAmount = amount;

    // Aplicar multiplicadores basados en la fuente
    const multipliers = {
      [TransactionSource.PERFECT_SCORE]: 1.5,
      [TransactionSource.STREAK_ACHIEVEMENT]: 2.0,
      [TransactionSource.WEEKLY_GOAL]: 1.25,
    };

    const multiplier = multipliers[source] || 1.0;
    finalAmount *= multiplier;

    // Aplicar bonus por condiciones especiales
    if (metadata?.isFirstTime) {
      finalAmount *= 2; // Bonus del 100% por primera vez
    }

    if (metadata?.streakDays > 7) {
      finalAmount *= 1.1; // 10% extra por racha de más de 7 días
    }

    return Math.floor(finalAmount);
  }

  private async checkCurrencyAchievements(userId: string, balance: UserCurrencyBalance): Promise<void> {
    // Verificar logros basados en balance de monedas
    const milestones = [100, 500, 1000, 5000, 10000, 50000];
    
    for (const milestone of milestones) {
      if (balance.lifetimeEarnings >= milestone) {
        this.eventEmitter.emit('achievement.milestone.reached', {
          userId,
          type: 'currency',
          milestone,
          currentAmount: balance.lifetimeEarnings,
        });
      }
    }
  }

  private async getUserItemInfo(userId: string, itemId: string): Promise<any> {
    const userPurchase = await this.userPurchaseRepository.findOne({
      where: { userId, storeItemId: itemId },
    });

    const balance = await this.getUserBalance(userId, CurrencyType.COINS);

    return {
      owned: !!userPurchase,
      equipped: userPurchase?.isEquipped || false,
      canAfford: balance.currentBalance >= 0, // Se calculará el precio real
      purchaseCount: userPurchase ? userPurchase.quantity : 0,
    };
  }

  private async getSearchStats(filters: StoreFilterDto): Promise<any> {
    // Estadísticas básicas de la búsqueda
    const baseQuery = this.storeItemRepository
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true });

    const [
      totalItems,
      avgPrice,
      minPrice,
      maxPrice
    ] = await Promise.all([
      baseQuery.getCount(),
      baseQuery.select('AVG(item.price)', 'avg').getRawOne(),
      baseQuery.select('MIN(item.price)', 'min').getRawOne(),
      baseQuery.select('MAX(item.price)', 'max').getRawOne(),
    ]);

    return {
      totalItems,
      availableItems: totalItems, // Simplificado
      featuredItems: 0, // Se calculará
      saleItems: 0, // Se calculará
      averagePrice: Math.floor(parseFloat(avgPrice?.avg || '0')),
      priceRange: {
        min: parseInt(minPrice?.min || '0'),
        max: parseInt(maxPrice?.max || '0'),
      },
    };
  }

  private getAppliedFilters(filters: StoreFilterDto): any {
    const applied: any = {};
    
    if (filters.type) applied.type = filters.type;
    if (filters.rarity) applied.rarity = filters.rarity;
    if (filters.minPrice) applied.minPrice = filters.minPrice;
    if (filters.maxPrice) applied.maxPrice = filters.maxPrice;
    if (filters.search) applied.search = filters.search;
    
    return applied;
  }

  private async getInventorySummary(userId: string): Promise<any> {
    const summary = await this.userPurchaseRepository
      .createQueryBuilder('purchase')
      .leftJoin('purchase.storeItem', 'item')
      .select([
        'COUNT(*) as totalItems',
        'COUNT(CASE WHEN purchase.isEquipped = true THEN 1 END) as equippedItems',
        'SUM(purchase.totalPrice) as totalSpent',
        'COUNT(CASE WHEN item.rarity = :legendary THEN 1 END) as legendaryItems',
      ])
      .where('purchase.userId = :userId', { userId })
      .setParameter('legendary', ItemRarity.LEGENDARY)
      .getRawOne();

    return {
      totalItems: parseInt(summary.totalItems),
      equippedItems: parseInt(summary.equippedItems),
      totalSpent: parseInt(summary.totalSpent || '0'),
      legendaryItems: parseInt(summary.legendaryItems),
    };
  }

  private async getTransactionSummary(userId: string, filters: any): Promise<any> {
    const summary = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select([
        'SUM(CASE WHEN transaction.transactionType IN (:...earnTypes) THEN transaction.amount ELSE 0 END) as totalEarned',
        'SUM(CASE WHEN transaction.transactionType IN (:...spendTypes) THEN transaction.amount ELSE 0 END) as totalSpent',
        'COUNT(*) as transactionCount',
        'AVG(transaction.amount) as averageTransaction',
      ])
      .where('transaction.userId = :userId', { userId })
      .setParameter('earnTypes', [TransactionType.EARNED, TransactionType.BONUS, TransactionType.REWARD])
      .setParameter('spendTypes', [TransactionType.SPENT])
      .getRawOne();

    return {
      totalEarned: parseInt(summary.totalEarned || '0'),
      totalSpent: parseInt(summary.totalSpent || '0'),
      netBalance: parseInt(summary.totalEarned || '0') - parseInt(summary.totalSpent || '0'),
      transactionCount: parseInt(summary.transactionCount),
      averageTransaction: Math.floor(parseFloat(summary.averageTransaction || '0')),
      topSources: [], // Se implementaría una consulta adicional
    };
  }

  private async getItemsByType(): Promise<Record<StoreItemType, number>> {
    const results = await this.storeItemRepository
      .createQueryBuilder('item')
      .select('item.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('item.isActive = :isActive', { isActive: true })
      .groupBy('item.type')
      .getRawMany();

    const itemsByType: Record<StoreItemType, number> = {} as any;
    
    Object.values(StoreItemType).forEach(type => {
      itemsByType[type] = 0;
    });

    results.forEach(result => {
      itemsByType[result.type as StoreItemType] = parseInt(result.count);
    });

    return itemsByType;
  }

  private async getItemsByRarity(): Promise<Record<ItemRarity, number>> {
    const results = await this.storeItemRepository
      .createQueryBuilder('item')
      .select('item.rarity', 'rarity')
      .addSelect('COUNT(*)', 'count')
      .where('item.isActive = :isActive', { isActive: true })
      .groupBy('item.rarity')
      .getRawMany();

    const itemsByRarity: Record<ItemRarity, number> = {} as any;
    
    Object.values(ItemRarity).forEach(rarity => {
      itemsByRarity[rarity] = 0;
    });

    results.forEach(result => {
      itemsByRarity[result.rarity as ItemRarity] = parseInt(result.count);
    });

    return itemsByRarity;
  }

  private async getTopSellingItems(): Promise<any[]> {
    return await this.storeItemRepository.find({
      where: { isActive: true },
      order: { soldCount: 'DESC' },
      take: 5,
    });
  }

  private async getTotalRevenue(): Promise<number> {
    const result = await this.userPurchaseRepository
      .createQueryBuilder('purchase')
      .select('SUM(purchase.totalPrice)', 'total')
      .getRawOne();

    return parseInt(result?.total || '0');
  }

  private async getFeaturedItems(): Promise<any[]> {
    return await this.storeItemRepository.find({
      where: { isActive: true, isFeatured: true },
      take: 10,
    });
  }

  private async getSaleItems(): Promise<any[]> {
    return await this.storeItemRepository.find({
      where: { isActive: true, isOnSale: true },
      take: 10,
    });
  }
}