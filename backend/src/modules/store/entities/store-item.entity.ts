import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index,
  OneToMany,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { UserPurchase } from './user-purchase.entity';

/**
 * Enumeración para los tipos de elementos de la tienda
 * Define las categorías de artículos cosméticos disponibles
 */
export enum StoreItemType {
  AVATAR = 'avatar',           // Avatares completos del personaje
  AVATAR_ACCESSORY = 'avatar_accessory', // Accesorios para el avatar (sombreros, gafas, etc.)
  AVATAR_CLOTHING = 'avatar_clothing',   // Ropa para el avatar
  AVATAR_BACKGROUND = 'avatar_background', // Fondos para el avatar
  THEME = 'theme',             // Temas visuales para la interfaz
  EMOTE = 'emote',             // Emoticonos y reacciones
  SOUND_PACK = 'sound_pack',   // Paquetes de sonidos
  CELEBRATION = 'celebration', // Animaciones de celebración
  FRAME = 'frame',             // Marcos decorativos para perfil
  BADGE = 'badge',             // Insignias especiales
  OTHER = 'other'              // Otros elementos cosméticos
}

/**
 * Enumeración para la rareza de los elementos
 * Sistema de clasificación por escasez y valor
 */
export enum ItemRarity {
  COMMON = 'common',           // Elementos comunes (baratos, fáciles de obtener)
  UNCOMMON = 'uncommon',       // Elementos poco comunes
  RARE = 'rare',               // Elementos raros (más caros)
  EPIC = 'epic',               // Elementos épicos (muy caros)
  LEGENDARY = 'legendary',     // Elementos legendarios (extremadamente caros)
  LIMITED = 'limited'          // Elementos de tiempo limitado
}

/**
 * Enumeración para el estado de disponibilidad del elemento
 * Controla cuándo y cómo se pueden adquirir los elementos
 */
export enum ItemAvailability {
  AVAILABLE = 'available',     // Disponible para compra normal
  LIMITED_TIME = 'limited_time', // Disponible por tiempo limitado
  SEASONAL = 'seasonal',       // Disponible solo en temporadas específicas
  EVENT_EXCLUSIVE = 'event_exclusive', // Exclusivo de eventos especiales
  ACHIEVEMENT_LOCKED = 'achievement_locked', // Desbloqueado por logros
  LEVEL_LOCKED = 'level_locked', // Desbloqueado por nivel
  DISABLED = 'disabled',       // Temporalmente deshabilitado
  RETIRED = 'retired'          // Retirado permanentemente (ya no disponible)
}

/**
 * Entidad que representa un elemento de la tienda cosmética
 * Implementa el catálogo completo de artículos disponibles para compra
 * Sigue principios SOLID para gestión de productos digitales
 * 
 * @description Gestiona todos los elementos cosméticos que los usuarios pueden adquirir
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Entity('store_items')
@Index(['type', 'availability'])
@Index(['rarity', 'price'])
@Index(['isActive', 'availability'])
@Index(['createdAt'])
export class StoreItem {
  /**
   * Identificador único del elemento de tienda
   * Clave primaria auto-generada
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nombre del elemento
   * Título mostrado al usuario en la tienda
   */
  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  /**
   * Descripción detallada del elemento
   * Información adicional sobre el artículo cosmético
   */
  @Column({ type: 'text' })
  @IsString({ message: 'La descripción debe ser un texto válido' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  description: string;

  /**
   * Tipo de elemento cosmético
   * Categoriza el artículo para organización en tienda
   */
  @Column({
    type: 'enum',
    enum: StoreItemType,
    default: StoreItemType.OTHER
  })
  @IsEnum(StoreItemType, { message: 'El tipo de elemento debe ser válido' })
  type: StoreItemType;

  /**
   * Nivel de rareza del elemento
   * Determina la escasez y valor percibido
   */
  @Column({
    type: 'enum',
    enum: ItemRarity,
    default: ItemRarity.COMMON
  })
  @IsEnum(ItemRarity, { message: 'La rareza del elemento debe ser válida' })
  rarity: ItemRarity;

  /**
   * Estado de disponibilidad del elemento
   * Controla cuándo puede ser adquirido
   */
  @Column({
    type: 'enum',
    enum: ItemAvailability,
    default: ItemAvailability.AVAILABLE
  })
  @IsEnum(ItemAvailability, { message: 'La disponibilidad debe ser válida' })
  availability: ItemAvailability;

  /**
   * Precio en monedas de gamificación
   * Costo del elemento en la moneda virtual del sistema
   */
  @Column({ type: 'int' })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  @Max(1000000, { message: 'El precio no puede exceder 1,000,000' })
  price: number;

  /**
   * Precio original (para mostrar descuentos)
   * Permite mostrar ofertas y promociones
   */
  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'El precio original debe ser un número' })
  @Min(0, { message: 'El precio original no puede ser negativo' })
  originalPrice: number;

  /**
   * URL de la imagen principal del elemento
   * Imagen de vista previa en la tienda
   */
  @Column({ type: 'varchar', length: 500 })
  @IsString({ message: 'La URL de la imagen debe ser un texto válido' })
  @IsNotEmpty({ message: 'La URL de la imagen es obligatoria' })
  imageUrl: string;

  /**
   * URLs de imágenes adicionales
   * Galería de imágenes para vista detallada
   */
  @Column({ type: 'json', nullable: true })
  additionalImages: string[];

  /**
   * Datos específicos del elemento cosmético
   * Información técnica como colores, tamaños, animaciones, etc.
   */
  @Column({ type: 'json', nullable: true })
  itemData: Record<string, any>;

  /**
   * Etiquetas para categorización y búsqueda
   * Permite filtrado flexible en la tienda
   */
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  /**
   * Nivel mínimo requerido para comprar
   * Restricción por progreso del usuario
   */
  @Column({ type: 'int', default: 1 })
  minLevelRequired: number;

  /**
   * Logros requeridos para desbloquear
   * IDs de achievements necesarios
   */
  @Column({ type: 'text', array: true, default: [], nullable: true })
  requiredAchievements: string[];

  /**
   * Fecha de inicio de disponibilidad
   * Para elementos de tiempo limitado
   */
  @Column({ type: 'timestamp', nullable: true })
  availableFrom: Date;

  /**
   * Fecha de fin de disponibilidad
   * Para elementos de tiempo limitado
   */
  @Column({ type: 'timestamp', nullable: true })
  availableUntil: Date;

  /**
   * Límite de stock disponible
   * Para elementos con cantidad limitada (null = ilimitado)
   */
  @Column({ type: 'int', nullable: true })
  stockLimit: number;

  /**
   * Cantidad vendida hasta ahora
   * Contador de ventas para estadísticas
   */
  @Column({ type: 'int', default: 0 })
  soldCount: number;

  /**
   * Límite de compras por usuario
   * Máximo que un usuario puede comprar (null = ilimitado)
   */
  @Column({ type: 'int', nullable: true })
  maxPerUser: number;

  /**
   * Indica si el elemento está destacado
   * Para promoción especial en la tienda
   */
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  /**
   * Indica si el elemento está en oferta
   * Para mostrar descuentos especiales
   */
  @Column({ type: 'boolean', default: false })
  isOnSale: boolean;

  /**
   * Porcentaje de descuento actual
   * Para cálculo automático de precios rebajados
   */
  @Column({ type: 'int', default: 0 })
  discountPercentage: number;

  /**
   * Orden de visualización en la tienda
   * Para control manual del orden de elementos
   */
  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  /**
   * Indica si el elemento está activo
   * Control de activación/desactivación
   */
  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  /**
   * Metadatos adicionales del elemento
   * Información extra configurable
   */
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  /**
   * Fecha de creación del elemento
   * Auditoría automática
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Fecha de última actualización
   * Auditoría automática de cambios
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // =====================================
  // RELACIONES CON OTRAS ENTIDADES
  // =====================================

  /**
   * Relación con las compras de usuarios
   * Permite rastrear quién ha comprado este elemento
   */
  @OneToMany(() => UserPurchase, purchase => purchase.storeItem)
  purchases: UserPurchase[];

  // =====================================
  // MÉTODOS DE VALIDACIÓN
  // =====================================

  /**
   * 🔍 Validación antes de insertar o actualizar
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateStoreItem() {
    this.validateName();
    this.validateDescription();
    this.validatePrice();
    this.validateStock();
    this.validateDiscount();
  }

  /**
   * ✅ Validar nombre
   */
  private validateName() {
    if (!this.name || this.name.trim().length === 0) {
      throw new BadRequestException('El nombre del elemento no puede estar vacío');
    }

    if (this.name.length < 3 || this.name.length > 100) {
      throw new BadRequestException('El nombre debe tener entre 3 y 100 caracteres');
    }

    this.name = this.name.trim();
  }

  /**
   * ✅ Validar descripción
   */
  private validateDescription() {
    if (!this.description || this.description.trim().length === 0) {
      throw new BadRequestException('La descripción no puede estar vacía');
    }

    if (this.description.length < 10 || this.description.length > 1000) {
      throw new BadRequestException('La descripción debe tener entre 10 y 1000 caracteres');
    }

    this.description = this.description.trim();
  }

  /**
   * ✅ Validar precio
   */
  private validatePrice() {
    if (typeof this.price !== 'number' || this.price < 0) {
      throw new BadRequestException('El precio debe ser un número no negativo');
    }

    if (this.price > 1000000) {
      throw new BadRequestException('El precio no puede exceder 1,000,000');
    }

    // Validar que el precio original sea mayor que el precio actual si hay descuento
    if (this.originalPrice && this.originalPrice < this.price) {
      throw new BadRequestException('El precio original debe ser mayor que el precio actual');
    }
  }

  /**
   * ✅ Validar stock
   */
  private validateStock() {
    if (this.stockLimit !== null && this.stockLimit !== undefined) {
      if (this.stockLimit < 0) {
        throw new BadRequestException('El límite de stock no puede ser negativo');
      }

      if (this.stockLimit > 1000000) {
        throw new BadRequestException('El límite de stock es demasiado alto');
      }
    }

    if (this.soldCount < 0) {
      throw new BadRequestException('El contador de ventas no puede ser negativo');
    }
  }

  /**
   * ✅ Validar descuento
   */
  private validateDiscount() {
    if (this.discountPercentage < 0 || this.discountPercentage > 100) {
      throw new BadRequestException('El porcentaje de descuento debe estar entre 0 y 100');
    }

    // Si hay descuento, debe estar en oferta
    if (this.discountPercentage > 0 && !this.isOnSale) {
      this.isOnSale = true;
    }

    // Si no está en oferta, el descuento debe ser 0
    if (!this.isOnSale && this.discountPercentage > 0) {
      this.discountPercentage = 0;
    }
  }

  // =====================================
  // MÉTODOS DE NEGOCIO
  // =====================================

  /**
   * Verifica si el elemento está disponible para compra
   * Evalúa todos los criterios de disponibilidad
   * 
   * @returns {boolean} True si está disponible
   */
  isAvailableForPurchase(): boolean {
    // Solo verificar si está activo
    if (!this.isActive) {
      return false;
    }
    
    const now = new Date();
    
    // Verificar disponibilidad por fechas
    if (this.availableFrom && now < this.availableFrom) {
      return false;
    }
    if (this.availableUntil && now > this.availableUntil) {
      return false;
    }
    
    // SIN VALIDACIÓN DE STOCK - Es una tienda digital de recompensas
    // Los items son ilimitados una vez activos
    
    // Verificar estado de disponibilidad
    return this.availability === ItemAvailability.AVAILABLE ||
           this.availability === ItemAvailability.LIMITED_TIME ||
           this.availability === ItemAvailability.SEASONAL ||
           this.availability === ItemAvailability.EVENT_EXCLUSIVE;
  }

  /**
   * Verifica si un usuario puede comprar este elemento
   * Evalúa restricciones específicas del usuario
   * 
   * @param {any} user - Usuario que quiere comprar
   * @param {number} userPurchaseCount - Cantidad ya comprada por el usuario
   * @returns {boolean} True si el usuario puede comprar
   */
  canUserPurchase(user: any, userPurchaseCount: number = 0): boolean {
    if (!this.isAvailableForPurchase()) {
      return false;
    }
    
    // Verificar nivel mínimo
    if (user.level < this.minLevelRequired) {
      return false;
    }
    
    // SIN LÍMITE DE COMPRAS POR USUARIO - Tienda digital ilimitada
    // El usuario puede comprar items repetidamente si lo desea
    
    // Verificar logros requeridos si existen
    if (this.requiredAchievements && this.requiredAchievements.length > 0) {
      // Aquí se verificarían los logros del usuario
      // return user.achievements.some(achievement => this.requiredAchievements.includes(achievement.id));
    }
    
    return true;
  }

  /**
   * Calcula el precio final del elemento considerando descuentos
   * Aplica descuentos activos y ofertas especiales
   * 
   * @returns {number} Precio final a pagar
   */
  getFinalPrice(): number {
    if (!this.isOnSale || this.discountPercentage <= 0) {
      return this.price;
    }
    
    const discount = Math.floor((this.price * this.discountPercentage) / 100);
    return Math.max(1, this.price - discount); // Precio mínimo de 1 moneda
  }

  /**
   * Obtiene el ahorro en monedas por descuento
   * Calcula cuánto se ahorra con la oferta actual
   * 
   * @returns {number} Cantidad de monedas ahorradas
   */
  getSavingsAmount(): number {
    if (!this.isOnSale || this.discountPercentage <= 0) {
      return 0;
    }
    
    return this.price - this.getFinalPrice();
  }

  /**
   * Verifica si el elemento es de edición limitada
   * Determina si tiene restricciones de tiempo o cantidad
   * 
   * @returns {boolean} True si es edición limitada
   */
  isLimitedEdition(): boolean {
    return this.availability === ItemAvailability.LIMITED_TIME ||
           this.availability === ItemAvailability.EVENT_EXCLUSIVE ||
           this.stockLimit !== null ||
           this.availableUntil !== null;
  }

  /**
   * Obtiene el tiempo restante de disponibilidad
   * Para elementos de tiempo limitado
   * 
   * @returns {number|null} Milisegundos restantes o null si no aplica
   */
  getTimeRemaining(): number | null {
    if (!this.availableUntil) return null;
    
    const now = new Date();
    const remaining = this.availableUntil.getTime() - now.getTime();
    
    return Math.max(0, remaining);
  }

  /**
   * Obtiene el stock restante del elemento
   * Para elementos con cantidad limitada
   * 
   * @returns {number|null} Unidades restantes o null si es ilimitado
   */
  getRemainingStock(): number | null {
    if (this.stockLimit === null) return null;
    
    return Math.max(0, this.stockLimit - this.soldCount);
  }

  /**
   * Incrementa el contador de ventas
   * Se llama cuando se realiza una compra exitosa
   */
  incrementSoldCount(): void {
    this.soldCount += 1;
  }

  /**
   * Obtiene el color asociado con la rareza
   * Para visualización en la UI
   * 
   * @returns {string} Código de color hexadecimal
   */
  getRarityColor(): string {
    const colors = {
      [ItemRarity.COMMON]: '#9e9e9e',      // Gris
      [ItemRarity.UNCOMMON]: '#4caf50',    // Verde
      [ItemRarity.RARE]: '#2196f3',        // Azul
      [ItemRarity.EPIC]: '#9c27b0',        // Púrpura
      [ItemRarity.LEGENDARY]: '#ff9800',   // Naranja
      [ItemRarity.LIMITED]: '#f44336'      // Rojo
    };
    
    return colors[this.rarity] || colors[ItemRarity.COMMON];
  }

  /**
   * Obtiene el texto descriptivo de la rareza
   * Para mostrar al usuario
   * 
   * @returns {string} Descripción de la rareza
   */
  getRarityDisplayName(): string {
    const names = {
      [ItemRarity.COMMON]: 'Común',
      [ItemRarity.UNCOMMON]: 'Poco Común',
      [ItemRarity.RARE]: 'Raro',
      [ItemRarity.EPIC]: 'Épico',
      [ItemRarity.LEGENDARY]: 'Legendario',
      [ItemRarity.LIMITED]: 'Edición Limitada'
    };
    
    return names[this.rarity] || 'Desconocido';
  }

  /**
   * Verifica si el elemento cumple con los filtros de búsqueda
   * Para funcionalidad de búsqueda en la tienda
   * 
   * @param {any} filters - Criterios de filtrado
   * @returns {boolean} True si cumple con los filtros
   */
  matchesFilters(filters: {
    type?: StoreItemType;
    rarity?: ItemRarity;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    search?: string;
  }): boolean {
    // Filtro por tipo
    if (filters.type && this.type !== filters.type) return false;
    
    // Filtro por rareza
    if (filters.rarity && this.rarity !== filters.rarity) return false;
    
    // Filtro por precio
    const finalPrice = this.getFinalPrice();
    if (filters.minPrice && finalPrice < filters.minPrice) return false;
    if (filters.maxPrice && finalPrice > filters.maxPrice) return false;
    
    // Filtro por etiquetas
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => 
        this.tags.some(itemTag => itemTag.toLowerCase().includes(tag.toLowerCase()))
      );
      if (!hasMatchingTag) return false;
    }
    
    // Filtro por búsqueda de texto
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = `${this.name} ${this.description} ${this.tags.join(' ')}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) return false;
    }
    
    return true;
  }

  /**
   * Obtiene un resumen del elemento para API
   * Información estructurada para respuestas
   * 
   * @returns {object} Resumen del elemento
   */
  getApiSummary(): {
    id: string;
    name: string;
    description: string;
    type: StoreItemType;
    rarity: ItemRarity;
    originalPrice: number;
    finalPrice: number;
    savings: number;
    imageUrl: string;
    isAvailable: boolean;
    isLimited: boolean;
    remainingStock: number | null;
    timeRemaining: number | null;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      rarity: this.rarity,
      originalPrice: this.price,
      finalPrice: this.getFinalPrice(),
      savings: this.getSavingsAmount(),
      imageUrl: this.imageUrl,
      isAvailable: this.isAvailableForPurchase(),
      isLimited: this.isLimitedEdition(),
      remainingStock: this.getRemainingStock(),
      timeRemaining: this.getTimeRemaining()
    };
  }
}