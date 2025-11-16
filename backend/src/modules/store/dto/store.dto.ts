import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsInt, 
  IsArray, 
  Min, 
  Max, 
  Length,
  IsUUID,
  IsUrl,
  ArrayMaxSize,
  IsBoolean,
  IsDateString,
  ValidateNested,
  IsNumber
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { StoreItemType, ItemRarity, ItemAvailability } from '../entities/store-item.entity';
import { PaymentMethod } from '../entities/user-purchase.entity';

/**
 * DTO base para paginación de resultados de tienda
 * Extiende funcionalidades básicas de paginación
 */
export class StorePaginationDto {
  @ApiPropertyOptional({ 
    description: 'Número de página (empezando desde 1)', 
    minimum: 1, 
    default: 1 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Número de elementos por página', 
    minimum: 1, 
    maximum: 100, 
    default: 20 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10) || 20)
  limit?: number = 20;

  /**
   * Calcula el offset para la consulta de base de datos
   * @returns Número de registros a saltar
   */
  getOffset(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * DTO para filtrar elementos de la tienda
 * Implementa búsqueda avanzada con múltiples criterios
 */
export class StoreFilterDto extends StorePaginationDto {
  @ApiPropertyOptional({ 
    description: 'Término de búsqueda en nombre y descripción',
    minLength: 2,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser una cadena de texto' })
  @Length(2, 100, { message: 'El término debe tener entre 2 y 100 caracteres' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrar por tipo de elemento',
    enum: StoreItemType
  })
  @IsOptional()
  @IsEnum(StoreItemType, { message: 'Tipo de elemento inválido' })
  type?: StoreItemType;

  @ApiPropertyOptional({ 
    description: 'Filtrar por rareza',
    enum: ItemRarity
  })
  @IsOptional()
  @IsEnum(ItemRarity, { message: 'Rareza inválida' })
  rarity?: ItemRarity;

  @ApiPropertyOptional({ 
    description: 'Filtrar por disponibilidad',
    enum: ItemAvailability
  })
  @IsOptional()
  @IsEnum(ItemAvailability, { message: 'Estado de disponibilidad inválido' })
  availability?: ItemAvailability;

  @ApiPropertyOptional({ 
    description: 'Precio mínimo en monedas',
    minimum: 0
  })
  @IsOptional()
  @IsInt({ message: 'El precio mínimo debe ser un número entero' })
  @Min(0, { message: 'El precio mínimo debe ser 0 o mayor' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  minPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Precio máximo en monedas',
    minimum: 1
  })
  @IsOptional()
  @IsInt({ message: 'El precio máximo debe ser un número entero' })
  @Min(1, { message: 'El precio máximo debe ser 1 o mayor' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  maxPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Solo elementos en oferta',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo ofertas debe ser booleano' })
  @Transform(({ value }) => value === 'true' || value === true)
  onSaleOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Solo elementos destacados',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo destacados debe ser booleano' })
  @Transform(({ value }) => value === 'true' || value === true)
  featuredOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Solo elementos disponibles para el nivel del usuario',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo nivel debe ser booleano' })
  @Transform(({ value }) => value === 'true' || value === true)
  availableForUserLevel?: boolean;

  @ApiPropertyOptional({ 
    description: 'Etiquetas para filtrar (separadas por coma)' 
  })
  @IsOptional()
  @IsString({ message: 'Las etiquetas deben ser una cadena de texto' })
  @Transform(({ value }) => {
    if (!value) return undefined;
    return value.split(',').map((tag: string) => tag.trim().toLowerCase()).filter(Boolean);
  })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Campo por el cual ordenar',
    enum: ['name', 'price', 'rarity', 'createdAt', 'soldCount', 'displayOrder'],
    default: 'displayOrder'
  })
  @IsOptional()
  @IsString({ message: 'El campo de ordenamiento debe ser una cadena' })
  sortBy?: string = 'displayOrder';

  @ApiPropertyOptional({ 
    description: 'Orden de clasificación',
    enum: ['ASC', 'DESC'],
    default: 'ASC'
  })
  @IsOptional()
  @IsString({ message: 'El orden debe ser una cadena' })
  @Transform(({ value }) => value?.toUpperCase())
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

/**
 * DTO para crear un nuevo elemento en la tienda
 * Solo para uso administrativo
 */
export class CreateStoreItemDto {
  @ApiProperty({ 
    description: 'Nombre del elemento',
    minLength: 2,
    maxLength: 100
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ 
    description: 'Descripción del elemento',
    minLength: 10,
    maxLength: 1000
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @Length(10, 1000, { message: 'La descripción debe tener entre 10 y 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty({ 
    description: 'Tipo de elemento',
    enum: StoreItemType
  })
  @IsEnum(StoreItemType, { message: 'Tipo de elemento inválido' })
  type: StoreItemType;

  @ApiProperty({ 
    description: 'Rareza del elemento',
    enum: ItemRarity
  })
  @IsEnum(ItemRarity, { message: 'Rareza inválida' })
  rarity: ItemRarity;

  @ApiProperty({ 
    description: 'Precio en monedas de gamificación',
    minimum: 1
  })
  @IsInt({ message: 'El precio debe ser un número entero' })
  @Min(1, { message: 'El precio debe ser al menos 1 moneda' })
  price: number;

  @ApiProperty({ 
    description: 'URL de la imagen principal' 
  })
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  imageUrl: string;

  @ApiPropertyOptional({ 
    description: 'Estado de disponibilidad',
    enum: ItemAvailability,
    default: ItemAvailability.AVAILABLE
  })
  @IsOptional()
  @IsEnum(ItemAvailability, { message: 'Estado de disponibilidad inválido' })
  availability?: ItemAvailability = ItemAvailability.AVAILABLE;

  @ApiPropertyOptional({ 
    description: 'URLs de imágenes adicionales',
    maxLength: 10
  })
  @IsOptional()
  @IsArray({ message: 'Las imágenes adicionales deben ser un array' })
  @ArrayMaxSize(10, { message: 'Máximo 10 imágenes adicionales' })
  @IsUrl({}, { each: true, message: 'Cada imagen debe ser una URL válida' })
  additionalImages?: string[];

  @ApiPropertyOptional({ 
    description: 'Datos específicos del elemento (JSON)' 
  })
  @IsOptional()
  itemData?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Etiquetas del elemento',
    maxLength: 20
  })
  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @ArrayMaxSize(20, { message: 'Máximo 20 etiquetas' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser una cadena' })
  @Length(2, 30, { each: true, message: 'Cada etiqueta debe tener entre 2 y 30 caracteres' })
  @Transform(({ value }) => value?.map((tag: string) => tag.toLowerCase().trim()).filter(Boolean))
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Nivel mínimo requerido',
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @IsInt({ message: 'El nivel mínimo debe ser un número entero' })
  @Min(1, { message: 'El nivel mínimo debe ser 1 o mayor' })
  minLevelRequired?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Logros requeridos (IDs)' 
  })
  @IsOptional()
  @IsArray({ message: 'Los logros requeridos deben ser un array' })
  @IsUUID(4, { each: true, message: 'Cada logro debe ser un UUID válido' })
  requiredAchievements?: string[];

  @ApiPropertyOptional({ 
    description: 'Fecha de inicio de disponibilidad' 
  })
  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha válida' })
  availableFrom?: Date;

  @ApiPropertyOptional({ 
    description: 'Fecha de fin de disponibilidad' 
  })
  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha válida' })
  availableUntil?: Date;

  @ApiPropertyOptional({ 
    description: 'Límite de stock (null = ilimitado)' 
  })
  @IsOptional()
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(1, { message: 'El stock debe ser 1 o mayor' })
  stockLimit?: number;

  @ApiPropertyOptional({ 
    description: 'Máximo por usuario (null = ilimitado)' 
  })
  @IsOptional()
  @IsInt({ message: 'El máximo por usuario debe ser un número entero' })
  @Min(1, { message: 'El máximo por usuario debe ser 1 o mayor' })
  maxPerUser?: number;

  @ApiPropertyOptional({ 
    description: 'Elemento destacado',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo destacado debe ser booleano' })
  isFeatured?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Elemento en oferta',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo oferta debe ser booleano' })
  isOnSale?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Porcentaje de descuento',
    minimum: 0,
    maximum: 99
  })
  @IsOptional()
  @IsInt({ message: 'El descuento debe ser un número entero' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @Max(99, { message: 'El descuento no puede ser mayor al 99%' })
  discountPercentage?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Orden de visualización',
    default: 0
  })
  @IsOptional()
  @IsInt({ message: 'El orden debe ser un número entero' })
  displayOrder?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Metadatos adicionales' 
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO para actualizar un elemento de la tienda
 * Todos los campos son opcionales para actualizaciones parciales
 */
export class UpdateStoreItemDto {
  @ApiPropertyOptional({ 
    description: 'Nuevo nombre del elemento',
    minLength: 2,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Nueva descripción del elemento',
    minLength: 10,
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @Length(10, 1000, { message: 'La descripción debe tener entre 10 y 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Nuevo precio en monedas',
    minimum: 1
  })
  @IsOptional()
  @IsInt({ message: 'El precio debe ser un número entero' })
  @Min(1, { message: 'El precio debe ser al menos 1 moneda' })
  price?: number;

  @ApiPropertyOptional({ 
    description: 'Nueva URL de imagen principal' 
  })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  imageUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Nuevo estado de disponibilidad',
    enum: ItemAvailability
  })
  @IsOptional()
  @IsEnum(ItemAvailability, { message: 'Estado de disponibilidad inválido' })
  availability?: ItemAvailability;

  @ApiPropertyOptional({ 
    description: 'Nueva rareza',
    enum: ItemRarity
  })
  @IsOptional()
  @IsEnum(ItemRarity, { message: 'Rareza inválida' })
  rarity?: ItemRarity;

  @ApiPropertyOptional({ 
    description: 'Nuevas etiquetas' 
  })
  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @ArrayMaxSize(20, { message: 'Máximo 20 etiquetas' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser una cadena' })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Nuevo elemento destacado' 
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo destacado debe ser booleano' })
  isFeatured?: boolean;

  @ApiPropertyOptional({ 
    description: 'Nuevo elemento en oferta' 
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo oferta debe ser booleano' })
  isOnSale?: boolean;

  @ApiPropertyOptional({ 
    description: 'Nuevo porcentaje de descuento',
    minimum: 0,
    maximum: 99
  })
  @IsOptional()
  @IsInt({ message: 'El descuento debe ser un número entero' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @Max(99, { message: 'El descuento no puede ser mayor al 99%' })
  discountPercentage?: number;

  @ApiPropertyOptional({ 
    description: 'Estado activo del elemento' 
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  isActive?: boolean;
}

/**
 * DTO para realizar una compra en la tienda
 * Implementa validaciones para transacciones
 */
export class PurchaseItemDto {
  @ApiProperty({ 
    description: 'ID del elemento a comprar' 
  })
  @IsUUID(4, { message: 'El ID del elemento debe ser un UUID válido' })
  storeItemId: string;

  @ApiPropertyOptional({ 
    description: 'Cantidad a comprar',
    minimum: 1,
    maximum: 100,
    default: 1
  })
  @IsOptional()
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  @Max(100, { message: 'La cantidad máxima es 100' })
  quantity?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Método de pago',
    enum: PaymentMethod,
    default: PaymentMethod.COINS
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Método de pago inválido' })
  paymentMethod?: PaymentMethod = PaymentMethod.COINS;

  @ApiPropertyOptional({ 
    description: 'Es un regalo para otro usuario' 
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo regalo debe ser booleano' })
  isGift?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'ID del usuario destinatario del regalo' 
  })
  @IsOptional()
  @IsUUID(4, { message: 'El ID del destinatario debe ser un UUID válido' })
  giftToUserId?: string;

  @ApiPropertyOptional({ 
    description: 'Mensaje del regalo',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'El mensaje debe ser una cadena de texto' })
  @Length(0, 500, { message: 'El mensaje no puede exceder 500 caracteres' })
  @Transform(({ value }) => value?.trim())
  giftMessage?: string;
}

/**
 * DTO para equipar/desequipar elementos cosméticos
 * Gestiona el inventario activo del usuario
 */
export class EquipItemDto {
  @ApiProperty({ 
    description: 'ID de la compra a equipar/desequipar' 
  })
  @IsUUID(4, { message: 'El ID de la compra debe ser un UUID válido' })
  purchaseId: string;

  @ApiProperty({ 
    description: 'Equipar (true) o desequipar (false)' 
  })
  @IsBoolean({ message: 'El campo equipar debe ser booleano' })
  equip: boolean;
}

/**
 * DTO para filtrar el inventario de usuario
 * Búsqueda en elementos adquiridos
 */
export class InventoryFilterDto extends StorePaginationDto {
  @ApiPropertyOptional({ 
    description: 'Filtrar por tipo de elemento',
    enum: StoreItemType
  })
  @IsOptional()
  @IsEnum(StoreItemType, { message: 'Tipo de elemento inválido' })
  type?: StoreItemType;

  @ApiPropertyOptional({ 
    description: 'Solo elementos equipados',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo equipados debe ser booleano' })
  @Transform(({ value }) => value === 'true' || value === true)
  equippedOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Solo elementos no expirados',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activos debe ser booleano' })
  @Transform(({ value }) => value === 'false' ? false : true)
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Filtrar por rareza',
    enum: ItemRarity
  })
  @IsOptional()
  @IsEnum(ItemRarity, { message: 'Rareza inválida' })
  rarity?: ItemRarity;

  @ApiPropertyOptional({ 
    description: 'Solo elementos que fueron regalos' 
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo regalos debe ser booleano' })
  @Transform(({ value }) => value === 'true' || value === true)
  giftsOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Ordenar por',
    enum: ['purchaseDate', 'equipDate', 'itemName', 'rarity'],
    default: 'purchaseDate'
  })
  @IsOptional()
  @IsString({ message: 'El campo de ordenamiento debe ser una cadena' })
  sortBy?: string = 'purchaseDate';

  @ApiPropertyOptional({ 
    description: 'Orden de clasificación',
    enum: ['ASC', 'DESC'],
    default: 'DESC'
  })
  @IsOptional()
  @IsString({ message: 'El orden debe ser una cadena' })
  @Transform(({ value }) => value?.toUpperCase())
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * DTO para respuestas de operaciones de tienda
 * Estandariza las respuestas de la API
 */
export class StoreResponseDto {
  @ApiProperty({ description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({ description: 'Mensaje descriptivo del resultado' })
  message: string;

  @ApiPropertyOptional({ description: 'Datos adicionales de la respuesta' })
  data?: any;

  @ApiPropertyOptional({ description: 'Detalles del error si aplica' })
  error?: string;

  @ApiPropertyOptional({ description: 'Código de error específico' })
  errorCode?: string;
}

/**
 * DTO para estadísticas de la tienda
 * Métricas y datos analíticos
 */
export class StoreStatsDto {
  @ApiProperty({ description: 'Total de elementos en la tienda' })
  totalItems: number;

  @ApiProperty({ description: 'Total de elementos disponibles' })
  availableItems: number;

  @ApiProperty({ description: 'Elementos por tipo' })
  itemsByType: Record<StoreItemType, number>;

  @ApiProperty({ description: 'Elementos por rareza' })
  itemsByRarity: Record<ItemRarity, number>;

  @ApiProperty({ description: 'Top 5 elementos más vendidos' })
  topSellingItems: any[];

  @ApiProperty({ description: 'Total de ventas realizadas' })
  totalSales: number;

  @ApiProperty({ description: 'Ingresos totales en monedas' })
  totalRevenue: number;

  @ApiProperty({ description: 'Elementos destacados activos' })
  featuredItems: any[];

  @ApiProperty({ description: 'Elementos en oferta activos' })
  saleItems: any[];
}