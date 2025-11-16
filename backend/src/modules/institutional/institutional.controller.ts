/**
 * 🏛️ CONTROLADOR INSTITUCIONAL - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Maneja todas las peticiones HTTP relacionadas con la página institucional:
 * - Información general de la institución
 * - Sistema de contacto y reclamos
 * - Estadísticas para administradores
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de manejar requests HTTP institucionales
 * - OCP: Extensible para nuevos endpoints sin modificar existentes
 * - LSP: Implementa correctamente los contratos de NestJS
 * - ISP: Interfaces específicas para cada operación
 * - DIP: Depende de abstracciones (servicios) no de implementaciones
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InstitutionalService } from './institutional.service';
import { Contact } from './entities/contact.entity';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactFilterDto,
  ContactStatsDto,
  InstitutionalInfoDto,
} from './dto';
import { PaginationDto, PaginatedResponse, ApiResponse as StandardApiResponse } from '../../common/dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * Controlador para endpoints institucionales públicos y administrativos
 * 
 * @description Este controlador maneja todas las operaciones relacionadas con:
 * - Información institucional pública
 * - Sistema de contacto (creación pública, gestión administrativa)
 * - Estadísticas y reportes para administradores
 * 
 * @routes
 * - GET /institutional/info - Información institucional (público)
 * - POST /institutional/contact - Crear contacto (público, limitado por rate)
 * - GET /institutional/contacts - Listar contactos (admin)
 * - GET /institutional/contacts/:id - Ver contacto específico (admin)
 * - PUT /institutional/contacts/:id - Actualizar contacto (admin)
 * - DELETE /institutional/contacts/:id - Eliminar contacto (admin)
 * - GET /institutional/statistics - Estadísticas (admin)
 * 
 * @example
 * ```typescript
 * // Crear contacto (público)
 * POST /api/v1/institutional/contact
 * {
 *   "name": "Juan Pérez",
 *   "email": "juan@email.com",
 *   "type": "complaint",
 *   "subject": "Problema con acceso",
 *   "message": "No puedo acceder a mi cuenta..."
 * }
 * 
 * // Listar contactos (admin)
 * GET /api/v1/institutional/contacts?page=1&limit=10&type=complaint&status=pending
 * ```
 */
@ApiTags('Institutional')
@ApiExtraModels(Contact)
@Controller('institutional')
export class InstitutionalController {
  /**
   * Logger para registrar operaciones del controlador
   */
  private readonly logger = new Logger(InstitutionalController.name);

  constructor(
    private readonly institutionalService: InstitutionalService,
  ) {
    this.logger.log('🏛️ InstitutionalController inicializado correctamente');
  }

  // =============================================================================
  // ENDPOINTS PÚBLICOS
  // =============================================================================

  /**
   * Obtiene información general de la institución
   * 
   * @description Endpoint público que retorna información básica de la institución
   * como nombre, descripción, contacto, misión, visión, valores, etc.
   * 
   * @returns Información institucional completa
   * 
   * @example
   * ```bash
   * GET /api/v1/institutional/info
   * ```
   */
  @Get('info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener información institucional',
    description: 'Retorna información general pública de la institución',
    operationId: 'getInstitutionalInfo',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Información institucional obtenida exitosamente',
    type: InstitutionalInfoDto,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error interno del servidor',
  })
  async getInstitutionalInfo(): Promise<StandardApiResponse<InstitutionalInfoDto>> {
    this.logger.log('📄 Obteniendo información institucional');

    try {
      const info = await this.institutionalService.getInstitutionalInfo();

      return {
        success: true,
        message: 'Información institucional obtenida exitosamente',
        data: info,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error obteniendo información institucional: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Crea un nuevo mensaje de contacto
   * 
   * @description Endpoint público para que visitantes envíen mensajes de contacto.
   * Incluye rate limiting para prevenir spam.
   * 
   * @param createContactDto Datos del contacto
   * @param req Request object para obtener IP y User-Agent
   * @returns Contacto creado
   * 
   * @throws BadRequestException Si los datos son inválidos
   * @throws ConflictException Si es detectado como spam
   * @throws TooManyRequestsException Si excede el rate limit
   * 
   * @example
   * ```bash
   * POST /api/v1/institutional/contact
   * Content-Type: application/json
   * 
   * {
   *   "name": "María García",
   *   "email": "maria@email.com",
   *   "type": "support",
   *   "subject": "Error en la plataforma",
   *   "message": "Descripción detallada del problema..."
   * }
   * ```
   */
  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard) // Rate limiting: máximo X requests por minuto
  @ApiOperation({
    summary: 'Crear mensaje de contacto',
    description: 'Permite a visitantes enviar mensajes de contacto, consultas o reclamos',
    operationId: 'createContact',
  })
  @ApiBody({
    type: CreateContactDto,
    description: 'Datos del mensaje de contacto',
    examples: {
      complaint: {
        summary: 'Reclamo',
        description: 'Ejemplo de reclamo sobre la plataforma',
        value: {
          name: 'Juan Pérez',
          email: 'juan@email.com',
          phone: '+54 11 1234-5678',
          type: 'complaint',
          subject: 'Problema con el acceso',
          message: 'No puedo acceder a mi cuenta desde ayer. He intentado restablecer la contraseña pero no recibo el email.'
        }
      },
      support: {
        summary: 'Soporte técnico',
        description: 'Ejemplo de solicitud de soporte',
        value: {
          name: 'María García',
          email: 'maria@email.com',
          type: 'support',
          subject: 'Error al subir archivos',
          message: 'Cuando intento subir archivos PDF al sistema, me aparece un error 500.'
        }
      },
      general: {
        summary: 'Consulta general',
        description: 'Ejemplo de consulta general',
        value: {
          name: 'Carlos López',
          email: 'carlos@email.com',
          type: 'general',
          subject: 'Información sobre planes',
          message: '¿Tienen planes especiales para instituciones educativas grandes?'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Mensaje de contacto creado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Mensaje de contacto enviado exitosamente. Te responderemos pronto.',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Juan Pérez',
          email: 'juan@email.com',
          type: 'complaint',
          subject: 'Problema con el acceso',
          status: 'pending',
          createdAt: '2023-12-01T10:30:00Z'
        },
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
    schema: {
      example: {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Los datos proporcionados son inválidos',
        details: ['Email es requerido', 'Mensaje debe tener al menos 10 caracteres'],
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Mensaje duplicado (spam detection)',
    schema: {
      example: {
        success: false,
        error: 'DUPLICATE_MESSAGE',
        message: 'Ya has enviado un mensaje recientemente. Por favor espera 5 minutos.',
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiadas peticiones (rate limit)',
    schema: {
      example: {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas peticiones. Intenta nuevamente en unos minutos.',
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  async createContact(
    @Body(ValidationPipe) createContactDto: CreateContactDto,
    @Req() req: Request,
  ): Promise<StandardApiResponse<Contact>> {
    this.logger.log(`📝 Creando contacto de tipo: ${createContactDto.type} desde ${req.ip}`);

    try {
      // Extraer información de la request
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Crear el contacto
      const contact = await this.institutionalService.createContact(
        createContactDto,
        ipAddress,
        userAgent
      );

      this.logger.log(`✅ Contacto creado exitosamente: ${contact.id}`);

      return {
        success: true,
        message: 'Mensaje de contacto enviado exitosamente. Te responderemos pronto.',
        data: contact,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error creando contacto: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // ENDPOINTS ADMINISTRATIVOS (REQUIEREN AUTENTICACIÓN)
  // =============================================================================

  /**
   * Lista contactos con filtros y paginación (solo administradores)
   * 
   * @description Permite a administradores ver todos los mensajes de contacto
   * con opciones de filtrado por tipo, estado, fecha, etc.
   * 
   * @param filters Filtros de búsqueda
   * @param pagination Parámetros de paginación
   * @returns Lista paginada de contactos
   * 
   * @example
   * ```bash
   * GET /api/v1/institutional/contacts?page=1&limit=10&type=complaint&status=pending
   * Authorization: Bearer <jwt-token>
   * ```
   */
  @Get('contacts')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar contactos (Admin)',
    description: 'Obtiene lista paginada de contactos con filtros opcionales',
    operationId: 'listContacts',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Número de página (base 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Elementos por página (máximo 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'type',
    enum: ['general', 'support', 'complaint', 'suggestion', 'bug_report', 'feature_request'],
    required: false,
    description: 'Filtrar por tipo de contacto',
    example: 'complaint',
  })
  @ApiQuery({
    name: 'status',
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    required: false,
    description: 'Filtrar por estado',
    example: 'pending',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Fecha de inicio (ISO 8601)',
    example: '2023-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Fecha de fin (ISO 8601)',
    example: '2023-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Búsqueda en el asunto',
    example: 'acceso',
  })
  @ApiQuery({
    name: 'email',
    type: String,
    required: false,
    description: 'Filtrar por email específico',
    example: 'usuario@email.com',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de contactos obtenida exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Contactos obtenidos exitosamente',
        data: {
          data: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Juan Pérez',
              email: 'juan@email.com',
              type: 'complaint',
              subject: 'Problema con acceso',
              status: 'pending',
              createdAt: '2023-12-01T10:30:00Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false
          }
        },
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token de acceso inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Permisos insuficientes (se requiere rol ADMIN o MODERATOR)',
  })
  async findContacts(
    @Query(ValidationPipe) filters: ContactFilterDto,
    @Query(ValidationPipe) pagination: PaginationDto,
  ): Promise<StandardApiResponse<PaginatedResponse<Contact>>> {
    this.logger.log(`🔍 Listando contactos con filtros: ${JSON.stringify(filters)}`);

    try {
      const result = await this.institutionalService.findContacts(filters, pagination);

      this.logger.log(`📊 Obtenidos ${result.data.length} contactos de ${result.pagination.total} totales`);

      return {
        success: true,
        message: 'Contactos obtenidos exitosamente',
        data: result,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error listando contactos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene un contacto específico por ID (solo administradores)
   * 
   * @param id ID del contacto
   * @returns Contacto encontrado
   * 
   * @example
   * ```bash
   * GET /api/v1/institutional/contacts/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <jwt-token>
   * ```
   */
  @Get('contacts/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener contacto por ID (Admin)',
    description: 'Obtiene un contacto específico con todos sus detalles',
    operationId: 'getContactById',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID único del contacto (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contacto obtenido exitosamente',
    type: Contact,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contacto no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID de contacto inválido',
  })
  async findContactById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardApiResponse<Contact>> {
    this.logger.log(`🔍 Obteniendo contacto: ${id}`);

    try {
      const contact = await this.institutionalService.findContactById(id);

      return {
        success: true,
        message: 'Contacto obtenido exitosamente',
        data: contact,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error obteniendo contacto: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Actualiza un contacto existente (solo administradores)
   * 
   * @param id ID del contacto
   * @param updateContactDto Datos a actualizar
   * @param req Request para obtener ID del admin
   * @returns Contacto actualizado
   * 
   * @example
   * ```bash
   * PUT /api/v1/institutional/contacts/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   * 
   * {
   *   "status": "resolved",
   *   "adminResponse": "Problema resuelto mediante reinicio de contraseña"
   * }
   * ```
   */
  @Put('contacts/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar contacto (Admin)',
    description: 'Permite a administradores actualizar el estado y respuesta de un contacto',
    operationId: 'updateContact',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID único del contacto (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateContactDto,
    description: 'Datos del contacto a actualizar',
    examples: {
      resolve: {
        summary: 'Resolver contacto',
        description: 'Marcar contacto como resuelto con respuesta',
        value: {
          status: 'resolved',
          adminResponse: 'Problema resuelto mediante reinicio de contraseña. Se envió email con instrucciones.'
        }
      },
      inProgress: {
        summary: 'Marcar en progreso',
        description: 'Cambiar estado a en progreso',
        value: {
          status: 'in_progress'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contacto actualizado exitosamente',
    type: Contact,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contacto no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de actualización inválidos',
  })
  async updateContact(
    @Param('id', ParseUUIDPipe) id: string,
  @Body(ValidationPipe) updateContactDto: UpdateContactDto,
  @Req() req: AuthenticatedRequest,
  ): Promise<StandardApiResponse<Contact>> {
    this.logger.log(`📝 Actualizando contacto: ${id} por admin: ${req.user.id}`);

    try {
      const adminId = req.user.id; // ID del admin desde el JWT
      const updatedContact = await this.institutionalService.updateContact(
        id,
        updateContactDto,
        adminId
      );

      this.logger.log(`✅ Contacto actualizado exitosamente: ${updatedContact.id}`);

      return {
        success: true,
        message: 'Contacto actualizado exitosamente',
        data: updatedContact,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error actualizando contacto: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Elimina un contacto (solo administradores)
   * 
   * @param id ID del contacto
   * @param req Request para obtener ID del admin
   * 
   * @example
   * ```bash
   * DELETE /api/v1/institutional/contacts/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <jwt-token>
   * ```
   */
  @Delete('contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar contacto (Admin)',
    description: 'Elimina permanentemente un contacto (solo administradores principales)',
    operationId: 'deleteContact',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID único del contacto (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Contacto eliminado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contacto no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Permisos insuficientes (se requiere rol ADMIN)',
  })
  async deleteContact(
  @Param('id', ParseUUIDPipe) id: string,
  @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    this.logger.log(`🗑️ Eliminando contacto: ${id} por admin: ${req.user.id}`);

    try {
      const adminId = req.user.id;
      await this.institutionalService.deleteContact(id, adminId);

      this.logger.log(`✅ Contacto eliminado exitosamente: ${id}`);

    } catch (error) {
      this.logger.error(`❌ Error eliminando contacto: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de contactos (solo administradores)
   * 
   * @param startDate Fecha de inicio opcional
   * @param endDate Fecha de fin opcional
   * @returns Estadísticas de contactos
   * 
   * @example
   * ```bash
   * GET /api/v1/institutional/statistics?startDate=2023-01-01&endDate=2023-12-31
   * Authorization: Bearer <jwt-token>
   * ```
   */
  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener estadísticas de contactos (Admin)',
    description: 'Genera estadísticas detalladas de contactos para análisis administrativo',
    operationId: 'getContactStatistics',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Fecha de inicio para el análisis (ISO 8601)',
    example: '2023-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Fecha de fin para el análisis (ISO 8601)',
    example: '2023-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
    type: ContactStatsDto,
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<StandardApiResponse<ContactStatsDto>> {
    this.logger.log('📊 Generando estadísticas de contactos');

    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const statistics = await this.institutionalService.getContactStatistics(start, end);

      this.logger.log(`📈 Estadísticas generadas: ${statistics.total} contactos analizados`);

      return {
        success: true,
        message: 'Estadísticas generadas exitosamente',
        data: statistics,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error generando estadísticas: ${error.message}`, error.stack);
      throw error;
    }
  }
}