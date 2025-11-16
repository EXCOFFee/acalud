import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  ValidationPipe,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StoreService, StorePaginatedResult } from '../services/store.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole } from '../../users/user.entity';
import { StoreItem } from '../entities/store-item.entity';
import { UserPurchase } from '../entities/user-purchase.entity';
import { ErrorHandlingInterceptor } from '../../../common/interceptors/error-handling.interceptor';
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
 * Interfaz para respuestas estandarizadas de la API
 * Proporciona consistencia en todas las respuestas del controlador
 */
interface ApiStandardResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  path: string;
}

/**
 * Interfaz para respuestas paginadas de la API
 * Estructura estándar para endpoints que retornan listas
 */
interface ApiPaginatedResponse<T = any> extends ApiStandardResponse<T> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Controlador REST para el Sistema de Tienda Cosmética
 * Expone todos los endpoints relacionados con compras y gestión de elementos cosméticos
 * 
 * Endpoints Organizados por Casos de Uso:
 * 
 * CU-38: Comprar elementos cosméticos con monedas:
 * - POST /store/purchase - Comprar elemento
 * - GET /store/items - Explorar catálogo de tienda
 * - GET /store/items/:id - Ver detalles de elemento
 * 
 * CU-39: Gestionar inventario personal:
 * - GET /store/inventory - Ver inventario personal
 * - PATCH /store/inventory/:purchaseId/equip - Equipar/desequipar elemento
 * - GET /store/inventory/equipped - Ver elementos equipados
 * 
 * Administración (solo para administradores):
 * - POST /store/admin/items - Crear elemento de tienda
 * - PUT /store/admin/items/:id - Actualizar elemento
 * - GET /store/admin/stats - Estadísticas de tienda
 * 
 * Principios SOLID Aplicados:
 * - Single Responsibility: Cada endpoint tiene una responsabilidad específica
 * - Open/Closed: Extensible mediante decoradores y guards adicionales
 * - Liskov Substitution: Interfaces consistentes para todas las operaciones
 * - Interface Segregation: DTOs específicos para cada operación
 * - Dependency Inversion: Depende del servicio abstracto, no implementación concreta
 * 
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@ApiTags('Store - Sistema de Tienda Cosmética')
@Controller('store')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ErrorHandlingInterceptor)
@ApiBearerAuth()
export class StoreController {
  constructor(
    /**
     * Servicio de tienda
     * Abstracción de la lógica de negocio siguiendo Dependency Inversion
     */
    private readonly storeService: StoreService,
  ) {}

  // =====================================
  // CU-38: COMPRAR ELEMENTOS COSMÉTICOS CON MONEDAS
  // =====================================

  /**
   * Permite a un usuario comprar un elemento de la tienda
   * Implementa CU-38: Sistema de compras con monedas de gamificación
   * 
   * Características implementadas:
   * - Validación de monedas suficientes
   * - Verificación de stock y límites
   * - Sistema de regalos entre usuarios
   * - Gestión de transacciones atómicas
   * - Aplicación automática de descuentos
   * 
   * @param user - Usuario autenticado que realiza la compra
   * @param purchaseDto - Datos de la compra
   * @returns Resultado de la operación de compra
   */
  @Post('purchase')
  @ApiOperation({
    summary: 'Comprar elemento de la tienda',
    description: `
    Permite a un usuario autenticado comprar elementos cosméticos utilizando monedas de gamificación.
    
    Validaciones implementadas:
    - Usuario debe tener suficientes monedas
    - Elemento debe estar disponible y en stock
    - Respetar límites por usuario y requisitos de nivel
    - Gestionar sistema de regalos si aplica
    
    El sistema automáticamente:
    - Aplica descuentos vigentes
    - Debita las monedas del usuario
    - Actualiza estadísticas de ventas
    - Procesa regalos si se especifica destinatario
    `
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Compra realizada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Compra realizada exitosamente',
        data: {
          purchase: {
            id: 'uuid-purchase-id',
            transactionId: 'TXN_1234567890_ABC123',
            finalPrice: 150,
            quantity: 1,
            isGift: false
          },
          finalPrice: 150,
          remainingCoins: 850,
          item: {
            id: 'uuid-item-id',
            name: 'Avatar Premium',
            rarity: 'legendary'
          }
        },
        timestamp: '2024-01-15T10:30:00Z',
        path: '/store/purchase'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error en la compra - monedas insuficientes, stock agotado, etc.'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No cumples los requisitos para comprar este elemento'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Elemento no encontrado'
  })
  async purchaseItem(
    @GetUser() user: any,
    @Body(ValidationPipe) purchaseDto: PurchaseItemDto
  ): Promise<ApiStandardResponse> {
    const result = await this.storeService.purchaseItem(user.id, purchaseDto);

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString(),
      path: '/store/purchase'
    };
  }

  /**
   * Explora el catálogo de elementos disponibles en la tienda
   * Implementa búsqueda avanzada con filtros múltiples
   * 
   * @param user - Usuario autenticado
   * @param search - Término de búsqueda en nombre y descripción
   * @param type - Filtro por tipo de elemento
   * @param rarity - Filtro por rareza
   * @param availability - Filtro por disponibilidad
   * @param minPrice - Precio mínimo
   * @param maxPrice - Precio máximo
   * @param onSaleOnly - Solo elementos en oferta
   * @param featuredOnly - Solo elementos destacados
   * @param availableForUserLevel - Solo elementos disponibles para el nivel del usuario
   * @param tags - Tags de elementos
   * @param page - Página actual
   * @param limit - Elementos por página
   * @param sortBy - Campo de ordenamiento
   * @param sortOrder - Orden ascendente o descendente
   * @returns Lista paginada de elementos disponibles
   */
  @Get('items')
  @ApiOperation({
    summary: 'Explorar catálogo de tienda',
    description: `
    Permite explorar todos los elementos disponibles en la tienda con filtros avanzados.
    
    Filtros disponibles:
    - Búsqueda por texto (nombre y descripción)
    - Filtro por tipo de elemento (avatar, marco, insignia, etc.)
    - Filtro por rareza (común, raro, épico, legendario)
    - Filtro por disponibilidad temporal
    - Rango de precios
    - Solo elementos en oferta o destacados
    - Solo elementos disponibles para el nivel del usuario
    - Filtro por tags personalizados
    
    Los resultados están paginados y pueden ordenarse por diferentes criterios.
    `
  })
  @ApiQuery({ name: 'search', required: false, description: 'Término de búsqueda' })
  @ApiQuery({ name: 'type', required: false, description: 'Tipo de elemento' })
  @ApiQuery({ name: 'rarity', required: false, description: 'Rareza del elemento' })
  @ApiQuery({ name: 'availability', required: false, description: 'Disponibilidad temporal' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Precio mínimo' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Precio máximo' })
  @ApiQuery({ name: 'onSaleOnly', required: false, type: Boolean, description: 'Solo elementos en oferta' })
  @ApiQuery({ name: 'featuredOnly', required: false, type: Boolean, description: 'Solo elementos destacados' })
  @ApiQuery({ name: 'availableForUserLevel', required: false, type: Boolean, description: 'Solo elementos disponibles para mi nivel' })
  @ApiQuery({ name: 'tags', required: false, description: 'Tags separados por comas' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página (default: 20)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Campo de ordenamiento' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Orden: ASC o DESC' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de elementos de tienda obtenida exitosamente'
  })
  async getStoreItems(
    @GetUser() user: any,
    @Query() filters: StoreFilterDto
  ): Promise<ApiPaginatedResponse<StoreItem[]>> {
    const result = await this.storeService.searchStoreItems(user.id, filters);

    return {
      success: true,
      message: 'Elementos de tienda obtenidos exitosamente',
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious
      },
      timestamp: new Date().toISOString(),
      path: '/store/items'
    };
  }

  /**
   * Obtiene detalles específicos de un elemento de la tienda
   * Incluye información detallada para la decisión de compra
   * 
   * @param itemId - ID del elemento
   * @param user - Usuario autenticado
   * @returns Detalles completos del elemento
   */
  @Get('items/:id')
  @ApiOperation({
    summary: 'Ver detalles de elemento',
    description: `
    Obtiene información detallada de un elemento específico de la tienda.
    
    Información incluida:
    - Detalles básicos del elemento
    - Precio actual y descuentos aplicables
    - Stock disponible y límites
    - Requisitos de nivel y logros
    - Historial de compras del usuario para este elemento
    - Elementos relacionados o sugeridos
    `
  })
  @ApiParam({
    name: 'id',
    description: 'ID del elemento de tienda',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalles del elemento obtenidos exitosamente'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Elemento no encontrado'
  })
  async getStoreItemDetails(
    @Param('id', ParseUUIDPipe) itemId: string,
    @GetUser() user: any
  ): Promise<ApiStandardResponse<StoreItem>> {
    // Esta funcionalidad se implementaría en el servicio
    // Por ahora retornamos un placeholder
    return {
      success: true,
      message: 'Detalles del elemento obtenidos exitosamente',
      data: {} as StoreItem,
      timestamp: new Date().toISOString(),
      path: `/store/items/${itemId}`
    };
  }

  // =====================================
  // CU-39: GESTIONAR INVENTARIO PERSONAL
  // =====================================

  /**
   * Obtiene el inventario personal del usuario
   * Implementa CU-39: Visualización y gestión de elementos adquiridos
   * 
   * @param user - Usuario autenticado
   * @param filters - Filtros de inventario
   * @returns Lista paginada del inventario del usuario
   */
  @Get('inventory')
  @ApiOperation({
    summary: 'Ver inventario personal',
    description: `
    Obtiene todos los elementos cosméticos adquiridos por el usuario actual.
    
    Filtros disponibles:
    - Por tipo de elemento
    - Solo elementos equipados
    - Solo elementos activos (no expirados)
    - Por rareza
    - Solo regalos recibidos
    
    La información incluye:
    - Detalles del elemento adquirido
    - Fecha de compra y precio pagado
    - Estado de equipamiento
    - Información de regalo si aplica
    - Estado de expiración
    `
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo de elemento' })
  @ApiQuery({ name: 'equippedOnly', required: false, type: Boolean, description: 'Solo elementos equipados' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Solo elementos activos (no expirados)' })
  @ApiQuery({ name: 'rarity', required: false, description: 'Filtrar por rareza' })
  @ApiQuery({ name: 'giftsOnly', required: false, type: Boolean, description: 'Solo regalos recibidos' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página (default: 20)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Campo de ordenamiento' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Orden: ASC o DESC' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventario obtenido exitosamente'
  })
  async getUserInventory(
    @GetUser() user: any,
    @Query() filters: InventoryFilterDto
  ): Promise<ApiPaginatedResponse<UserPurchase[]>> {
    const result = await this.storeService.getUserInventory(user.id, filters);

    return {
      success: true,
      message: 'Inventario obtenido exitosamente',
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious
      },
      timestamp: new Date().toISOString(),
      path: '/store/inventory'
    };
  }

  /**
   * Equipa o desequipa un elemento cosmético del inventario
   * Gestiona el estado activo de elementos en el perfil del usuario
   * 
   * @param purchaseId - ID de la compra/elemento en inventario
   * @param user - Usuario autenticado
   * @param equipDto - Datos de equipamiento
   * @returns Resultado de la operación
   */
  @Patch('inventory/:purchaseId/equip')
  @ApiOperation({
    summary: 'Equipar/desequipar elemento',
    description: `
    Permite equipar o desequipar elementos cosméticos del inventario personal.
    
    Comportamiento del sistema:
    - Al equipar un elemento, se desequipan automáticamente otros del mismo tipo
    - Solo se puede tener un elemento de cada tipo equipado simultáneamente
    - Los elementos expirados no pueden ser equipados
    - Los elementos equipados aparecen en el perfil público del usuario
    
    Tipos de elementos y su comportamiento:
    - Avatar: Solo uno activo, reemplaza el anterior
    - Marco de perfil: Solo uno activo
    - Insignia: Solo una activa por vez
    - Efecto especial: Solo uno activo
    `
  })
  @ApiParam({
    name: 'purchaseId',
    description: 'ID de la compra en el inventario',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Elemento equipado/desequipado exitosamente'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Elemento no encontrado en tu inventario'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Este elemento no puede ser equipado (expirado o bloqueado)'
  })
  async equipItem(
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @GetUser() user: any,
    @Body(ValidationPipe) equipDto: EquipItemDto
  ): Promise<ApiStandardResponse> {
    const result = await this.storeService.equipItem(user.id, {
      ...equipDto,
      purchaseId
    });

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString(),
      path: `/store/inventory/${purchaseId}/equip`
    };
  }

  /**
   * Obtiene todos los elementos actualmente equipados del usuario
   * Para mostrar el perfil cosmético actual
   * 
   * @param user - Usuario autenticado
   * @returns Lista de elementos equipados
   */
  @Get('inventory/equipped')
  @ApiOperation({
    summary: 'Ver elementos equipados',
    description: `
    Obtiene todos los elementos cosméticos actualmente equipados por el usuario.
    
    Esta información se utiliza para:
    - Mostrar el perfil cosmético actual del usuario
    - Renderizar la apariencia personalizada en la interfaz
    - Validar combinaciones de elementos
    - Mostrar el estado actual en la gestión de inventario
    
    Los elementos equipados se organizan por tipo y incluyen:
    - Información del elemento (nombre, imagen, efectos)
    - Fecha de equipamiento
    - Estado de expiración si aplica
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Elementos equipados obtenidos exitosamente'
  })
  async getEquippedItems(
    @GetUser() user: any
  ): Promise<ApiStandardResponse<UserPurchase[]>> {
    const equippedItems = await this.storeService.getEquippedItems(user.id);

    return {
      success: true,
      message: 'Elementos equipados obtenidos exitosamente',
      data: equippedItems,
      timestamp: new Date().toISOString(),
      path: '/store/inventory/equipped'
    };
  }

  // =====================================
  // ADMINISTRACIÓN DE TIENDA (SOLO ADMIN)
  // =====================================

  /**
   * Crea un nuevo elemento en la tienda
   * Solo para administradores - gestión del catálogo
   * 
   * @param createDto - Datos del elemento a crear
   * @returns Resultado de la creación
   */
  @Post('admin/items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Crear elemento de tienda [ADMIN]',
    description: `
    Permite a los administradores crear nuevos elementos en el catálogo de la tienda.
    
    Configuraciones disponibles:
    - Tipo de elemento (avatar, marco, insignia, etc.)
    - Precio en monedas y descuentos
    - Rareza y disponibilidad temporal
    - Requisitos de nivel y logros
    - Stock limitado y límites por usuario
    - Tags y metadatos
    - Orden de visualización y destacados
    
    Validaciones implementadas:
    - Coherencia de fechas de disponibilidad
    - Validación de descuentos para elementos en oferta
    - Unicidad de nombres y códigos
    - Configuración correcta de límites y stocks
    `
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Elemento creado exitosamente'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acceso denegado - Solo administradores'
  })
  async createStoreItem(
    @Body(ValidationPipe) createDto: CreateStoreItemDto
  ): Promise<ApiStandardResponse<StoreItem>> {
    const result = await this.storeService.createStoreItem(createDto);

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString(),
      path: '/store/admin/items'
    };
  }

  /**
   * Actualiza un elemento existente de la tienda
   * Solo para administradores
   * 
   * @param itemId - ID del elemento a actualizar
   * @param updateDto - Datos de actualización
   * @returns Resultado de la actualización
   */
  @Put('admin/items/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar elemento de tienda [ADMIN]',
    description: `
    Permite a los administradores actualizar elementos existentes en la tienda.
    
    Campos actualizables:
    - Información básica (nombre, descripción, imagen)
    - Precios y descuentos
    - Disponibilidad y stock
    - Requisitos y límites
    - Estado de destacado y orden de visualización
    
    Consideraciones especiales:
    - Los cambios de precio no afectan compras ya realizadas
    - Las actualizaciones de stock no pueden ser negativas
    - Los cambios de disponibilidad respetan compras en proceso
    `
  })
  @ApiParam({
    name: 'id',
    description: 'ID del elemento a actualizar',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Elemento actualizado exitosamente'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Elemento no encontrado'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acceso denegado - Solo administradores'
  })
  async updateStoreItem(
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body(ValidationPipe) updateDto: UpdateStoreItemDto
  ): Promise<ApiStandardResponse<StoreItem>> {
    const result = await this.storeService.updateStoreItem(itemId, updateDto);

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString(),
      path: `/store/admin/items/${itemId}`
    };
  }

  /**
   * Obtiene estadísticas completas de la tienda
   * Solo para administradores - métricas y análisis
   * 
   * @returns Estadísticas detalladas de la tienda
   */
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Estadísticas de tienda [ADMIN]',
    description: `
    Proporciona métricas completas del rendimiento de la tienda para administradores.
    
    Estadísticas incluidas:
    - Total de elementos y disponibilidad
    - Distribución por tipos y rareza
    - Top elementos más vendidos
    - Ingresos totales y transacciones
    - Elementos destacados y en oferta
    - Métricas de rendimiento temporal
    
    Útil para:
    - Análisis de ventas y popularidad
    - Optimización del catálogo
    - Planificación de ofertas y eventos
    - Monitoreo de economía del juego
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acceso denegado - Solo administradores'
  })
  async getStoreStats(): Promise<ApiStandardResponse<StoreStatsDto>> {
    const stats = await this.storeService.getStoreStats();

    return {
      success: true,
      message: 'Estadísticas de tienda obtenidas exitosamente',
      data: stats,
      timestamp: new Date().toISOString(),
      path: '/store/admin/stats'
    };
  }
}