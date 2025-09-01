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
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controlador para la gestión de archivos
 * Maneja subida, descarga y administración de archivos del sistema
 */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Sube un archivo individual
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir un archivo individual' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Archivo subido exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        originalName: { type: 'string' },
        filename: { type: 'string' },
        url: { type: 'string' },
        mimetype: { type: 'string' },
        size: { type: 'number' },
        uploadedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido o tipo no permitido',
  })
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    return this.filesService.uploadSingle(file);
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
    try {
      const file = await this.filesService.serveFile(filename);
      const fileInfo = await this.filesService.getFileInfo(filename);

      // Determinar el tipo MIME basado en la extensión
      const ext = filename.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';

      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain',
        'csv': 'text/csv',
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
    } catch (error) {
      throw error;
    }
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
      } catch (error) {
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
