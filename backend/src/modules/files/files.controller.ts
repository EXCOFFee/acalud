import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  BadRequestException,
  ParseIntPipe,
  Query,
  Logger,
  ValidationPipe,
  UsePipes,
  RequestTimeoutException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { FileValidationInterceptor } from './interceptors/file-validation.interceptor';
import { FileErrorInterceptor } from './interceptors/file-error.interceptor';

/**
 * 📁 CONTROLADOR DE GESTIÓN DE ARCHIVOS
 * 
 * Maneja todas las operaciones relacionadas con archivos:
 * - Subida y descarga de archivos
 * - Gestión de metadatos y permisos
 * - Búsqueda y filtrado
 * - Auditoría y logging completo
 * - Validaciones de seguridad
 * - Rate limiting y control de acceso
 */
@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard, ThrottlerGuard) // Protección global con rate limiting
@UseInterceptors(AuditInterceptor, FileValidationInterceptor, FileErrorInterceptor)
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true, 
  forbidNonWhitelisted: true,
  validateCustomDecorators: true,
}))
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {
    this.logger.log('🚀 FilesController inicializado con validaciones y auditoría completa');
  }

  /**
   * 📤 Subir un archivo individual con validaciones completas
   */
  @Post('upload')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB máximo
      files: 1,
    },
    fileFilter: (req, file, callback) => {
      // Validación adicional de tipo de archivo
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf', 'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      }
    },
  }))
  @ApiOperation({ 
    summary: 'Subir un archivo individual', 
    description: 'Sube un archivo con validaciones de seguridad, tipo y tamaño. Incluye auditoría completa.' 
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo a subir',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir (máximo 100MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo subido exitosamente con validaciones completas',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID único del archivo' },
        originalName: { type: 'string', description: 'Nombre original del archivo' },
        filename: { type: 'string', description: 'Nombre generado para el archivo' },
        url: { type: 'string', description: 'URL de acceso al archivo' },
        mimetype: { type: 'string', description: 'Tipo MIME del archivo' },
        size: { type: 'number' },
        uploadedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido, tipo no permitido, o tamaño excedido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Tipo de archivo no permitido: application/exe' },
        error: { type: 'string', example: 'Bad Request' },
        timestamp: { type: 'string' },
        path: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 413,
    description: 'Archivo demasiado grande',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones - Rate limit excedido',
  })
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    const startTime = Date.now();
    
    try {
      // Validaciones críticas de entrada
      if (!file) {
        this.logger.error('❌ Intento de subida sin archivo proporcionado');
        throw new BadRequestException('No se proporcionó ningún archivo para subir');
      }

      // Validación adicional de tamaño (doble check)
      if (file.size === 0) {
        this.logger.error(`❌ Archivo vacío recibido: ${file.originalname}`);
        throw new BadRequestException('El archivo está vacío o corrupto');
      }

      // Validación de nombre de archivo
      if (!file.originalname || file.originalname.trim().length === 0) {
        this.logger.error('❌ Archivo sin nombre recibido');
        throw new BadRequestException('El archivo debe tener un nombre válido');
      }

      // Log de inicio de subida
      this.logger.log(`📤 Iniciando subida de archivo: ${file.originalname}`);
      this.logger.log(`📏 Tamaño: ${Math.round(file.size / 1024)} KB, Tipo: ${file.mimetype}`);

      // Llamar al servicio con timeout
      const uploadPromise = this.filesService.uploadSingle(file);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new RequestTimeoutException('Tiempo de subida agotado')), 300000); // 5 minutos
      });

      const result = await Promise.race([uploadPromise, timeoutPromise]);
      
      // Log de éxito
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Archivo subido exitosamente en ${duration}ms: ${file.originalname}`);
      
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Error subiendo archivo "${file?.originalname || 'UNKNOWN'}" después de ${duration}ms: ${error.message}`);
      
      // Re-lanzar errores conocidos
      if (error instanceof BadRequestException || 
          error instanceof RequestTimeoutException) {
        throw error;
      }
      
      // Error genérico para errores no manejados
      throw new BadRequestException('Error interno procesando el archivo');
    }
  }

  /**
   * Sube múltiples archivos
   */
  @Post('upload/multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10)) // Máximo 10 archivos
  @ApiOperation({ summary: 'Subir múltiples archivos' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Archivos subidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array' },
        totalFiles: { type: 'number' },
        totalSize: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Archivos inválidos o tipos no permitidos',
  })
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron archivos');
    }

    return this.filesService.uploadMultiple(files);
  }

  /**
   * Descarga un archivo por su nombre
   */
  @Get(':filename')
  @ApiOperation({ summary: 'Descargar archivo por nombre' })
  @ApiResponse({
    status: 200,
    description: 'Archivo descargado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const file = await this.filesService.serveFile(filename);
    const fileInfo = await this.filesService.getFileInfo(filename);

    // Determinar el tipo MIME basado en la extensión
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      csv: 'text/csv',
    };

    if (ext && mimeTypes[ext]) {
      contentType = mimeTypes[ext];
    }

    res.set({
      'Content-Type': contentType,
      'Content-Length': fileInfo.size.toString(),
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    res.send(file);
  }

  /**
   * Obtiene información de un archivo sin descargarlo
   */
  @Get(':filename/info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener información de un archivo' })
  @ApiResponse({
    status: 200,
    description: 'Información del archivo obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        size: { type: 'number' },
        modifiedAt: { type: 'string', format: 'date-time' },
        url: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  async getFileInfo(@Param('filename') filename: string) {
    const info = await this.filesService.getFileInfo(filename);
    return {
      filename,
      ...info,
      url: `/files/${filename}`,
    };
  }

  /**
   * Lista todos los archivos (solo administradores)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los archivos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos obtenida exitosamente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
          size: { type: 'number' },
          modifiedAt: { type: 'string', format: 'date-time' },
          url: { type: 'string' },
        },
      },
    },
  })
  async listFiles() {
    const filenames = await this.filesService.listFiles();
    const filesInfo = [];
    
    for (const filename of filenames) {
      try {
        const info = await this.filesService.getFileInfo(filename);
        filesInfo.push({
          filename,
          ...info,
          url: `/files/${filename}`,
        });
  } catch {
        // Si no se puede obtener info de un archivo, lo omitimos
        continue;
      }
    }
    
    return filesInfo;
  }

  /**
   * Elimina un archivo (solo administradores)
   */
  @Delete(':filename')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un archivo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  async deleteFile(@Param('filename') filename: string) {
    await this.filesService.deleteFile(filename);
    return { message: 'Archivo eliminado exitosamente' };
  }

  /**
   * Limpia archivos antiguos (solo administradores)
   */
  @Post('cleanup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Limpiar archivos antiguos' })
  @ApiResponse({
    status: 200,
    description: 'Limpieza completada exitosamente',
    schema: {
      type: 'object',
      properties: {
        deletedFiles: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async cleanupOldFiles(@Query('days', new ParseIntPipe({ optional: true })) days = 30) {
    const deletedCount = await this.filesService.cleanupOldFiles(days);
    return {
      deletedFiles: deletedCount,
      message: `Se eliminaron ${deletedCount} archivos antiguos`,
    };
  }
}
