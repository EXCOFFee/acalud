import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { PurchaseItemDto } from './dto/purchase-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Achievement } from './achievement.entity';
import { UserInventory } from './user-inventory.entity';
import { UserRole } from '../users/user.entity';

/**
 * Controlador para el sistema de gamificación
 * Maneja logros, inventario, compras y estadísticas de gamificación
 */
@ApiTags('gamification')
@Controller('gamification')
@UseGuards(JwtAuthGuard) // Protege todas las rutas con autenticación JWT
@ApiBearerAuth()
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * Crea un nuevo logro (solo administradores)
   */
  @Post('achievements')
  @ApiOperation({ summary: 'Crear un nuevo logro' })
  @ApiResponse({
    status: 201,
    description: 'Logro creado exitosamente',
    type: Achievement,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los administradores pueden crear logros',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un logro con este identificador',
  })
  async createAchievement(
    @Body() createAchievementDto: CreateAchievementDto,
    @Request() req,
  ): Promise<Achievement> {
    // Verificar que el usuario es administrador
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Solo los administradores pueden crear logros');
    }

    return this.gamificationService.createAchievement(createAchievementDto);
  }

  /**
   * Obtiene todos los logros disponibles
   */
  @Get('achievements')
  @ApiOperation({ summary: 'Obtener todos los logros disponibles' })
  @ApiResponse({
    status: 200,
    description: 'Lista de logros obtenida exitosamente',
    type: [Achievement],
  })
  async getAllAchievements(): Promise<Achievement[]> {
    return this.gamificationService.getAllAchievements();
  }

  /**
   * Obtiene los logros del usuario autenticado
   */
  @Get('achievements/my')
  @ApiOperation({ summary: 'Obtener mis logros' })
  @ApiResponse({
    status: 200,
    description: 'Logros del usuario obtenidos exitosamente',
    type: [Achievement],
  })
  async getMyAchievements(@Request() req): Promise<Achievement[]> {
    return this.gamificationService.getUserAchievements(req.user.id);
  }

  /**
   * Obtiene los logros de un usuario específico
   */
  @Get('achievements/user/:userId')
  @ApiOperation({ summary: 'Obtener logros de un usuario específico' })
  @ApiResponse({
    status: 200,
    description: 'Logros del usuario obtenidos exitosamente',
    type: [Achievement],
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async getUserAchievements(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<Achievement[]> {
    return this.gamificationService.getUserAchievements(userId);
  }

  /**
   * Otorga un logro a un usuario (solo administradores)
   */
  @Post('achievements/:achievementId/grant/:userId')
  @ApiOperation({ summary: 'Otorgar logro a un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Logro otorgado exitosamente',
    type: Achievement,
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los administradores pueden otorgar logros',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario o logro no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya tiene este logro',
  })
  async grantAchievement(
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req,
  ): Promise<Achievement> {
    // Verificar que el usuario es administrador
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Solo los administradores pueden otorgar logros');
    }

    return this.gamificationService.grantAchievement(userId, achievementId);
  }

  /**
   * Obtiene el inventario del usuario autenticado
   */
  @Get('inventory')
  @ApiOperation({ summary: 'Obtener mi inventario' })
  @ApiResponse({
    status: 200,
    description: 'Inventario obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/UserInventory' } },
        totalCoins: { type: 'number' },
        totalItems: { type: 'number' },
        categories: { type: 'object' },
      },
    },
  })
  async getMyInventory(@Request() req) {
    return this.gamificationService.getUserInventory(req.user.id);
  }

  /**
   * Obtiene el inventario de un usuario específico
   */
  @Get('inventory/user/:userId')
  @ApiOperation({ summary: 'Obtener inventario de un usuario específico' })
  @ApiResponse({
    status: 200,
    description: 'Inventario obtenido exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async getUserInventory(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.gamificationService.getUserInventory(userId);
  }

  /**
   * Compra un item para el inventario
   */
  @Post('store/purchase')
  @ApiOperation({ summary: 'Comprar un item de la tienda' })
  @ApiResponse({
    status: 201,
    description: 'Item comprado exitosamente',
    type: UserInventory,
  })
  @ApiResponse({
    status: 400,
    description: 'No tienes suficientes monedas o datos inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya tienes este item único',
  })
  async purchaseItem(
    @Body() purchaseItemDto: PurchaseItemDto,
    @Request() req,
  ): Promise<UserInventory> {
    return this.gamificationService.purchaseItem(req.user.id, purchaseItemDto);
  }

  /**
   * Obtiene estadísticas generales de gamificación (solo administradores)
   */
  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de gamificación' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        totalAchievements: { type: 'number' },
        totalItemsPurchased: { type: 'number' },
        averageUserLevel: { type: 'number' },
        topUsers: { type: 'array' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los administradores pueden ver estas estadísticas',
  })
  async getGamificationStats(@Request() req) {
    // Verificar que el usuario es administrador
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Solo los administradores pueden ver estas estadísticas');
    }

    return this.gamificationService.getGamificationStats();
  }

  /**
   * Verifica y otorga logros automáticamente (endpoint interno para testing)
   */
  @Post('check-achievements')
  @ApiOperation({ summary: 'Verificar y otorgar logros automáticamente' })
  @ApiResponse({
    status: 200,
    description: 'Verificación completada',
    type: [Achievement],
  })
  async checkAchievements(
    @Body() checkData: { actionType: string; metadata?: Record<string, any> },
    @Request() req,
  ): Promise<Achievement[]> {
    return this.gamificationService.checkAndGrantAchievements(
      req.user.id,
      checkData.actionType,
      checkData.metadata,
    );
  }
}
