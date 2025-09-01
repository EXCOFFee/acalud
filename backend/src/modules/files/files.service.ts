import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface para información de archivo subido
 */
export interface UploadedFileInfo {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

/**
 * Interface para respuesta de subida múltiple
 */
export interface MultipleUploadResponse {
  files: UploadedFileInfo[];
  totalFiles: number;
  totalSize: number;
  errors?: Array<{
    filename: string;
    error: string;
  }>;
}

/**
 * Servicio para la gestión de archivos
 * Maneja la subida, almacenamiento, validación y servido de archivos
 */
@Injectable()
export class FilesService {
  private readonly uploadsDir = join(process.cwd(), 'uploads');
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
  ];

  constructor() {
    this.ensureUploadsDirectoryExists();
  }

  /**
   * Sube un archivo único al servidor
   * Valida el tipo MIME, tamaño y genera un nombre único
   */
  async uploadSingle(file: Express.Multer.File): Promise<UploadedFileInfo> {
    // Validar archivo
    this.validateFile(file);

    // Generar nombre único para el archivo
    const fileId = uuidv4();
    const fileExtension = this.getFileExtension(file.originalname);
    const filename = `${fileId}${fileExtension}`;
    const filePath = join(this.uploadsDir, filename);

    try {
      // Guardar archivo en disco
      await fs.writeFile(filePath, file.buffer);

      // Generar URL pública
      const url = `/api/files/${filename}`;

      return {
        id: fileId,
        originalName: file.originalname,
        filename,
        path: filePath,
        mimetype: file.mimetype,
        size: file.size,
        url,
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al guardar el archivo');
    }
  }

  /**
   * Sube múltiples archivos al servidor
   * Procesa cada archivo individualmente y maneja errores por archivo
   */
  async uploadMultiple(files: Express.Multer.File[]): Promise<MultipleUploadResponse> {
    const results: UploadedFileInfo[] = [];
    const errors: Array<{ filename: string; error: string }> = [];
    let totalSize = 0;

    for (const file of files) {
      try {
        const uploadedFile = await this.uploadSingle(file);
        results.push(uploadedFile);
        totalSize += file.size;
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    return {
      files: results,
      totalFiles: results.length,
      totalSize,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Sirve un archivo por su nombre de archivo
   */
  async serveFile(filename: string): Promise<Buffer> {
    const filePath = join(this.uploadsDir, filename);

    try {
      await fs.access(filePath);
      return await fs.readFile(filePath);
    } catch (error) {
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  /**
   * Obtiene información de un archivo sin devolverlo
   */
  async getFileInfo(filename: string): Promise<Partial<UploadedFileInfo>> {
    const filePath = join(this.uploadsDir, filename);

    try {
      const stats = await fs.stat(filePath);
      return {
        filename,
        path: filePath,
        size: stats.size,
        uploadedAt: stats.birthtime,
      };
    } catch (error) {
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  /**
   * Elimina un archivo del servidor
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = join(this.uploadsDir, filename);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  /**
   * Lista todos los archivos en el directorio de uploads
   */
  async listFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.uploadsDir);
      return files.filter(file => !file.startsWith('.'));
    } catch (error) {
      throw new InternalServerErrorException('Error al listar archivos');
    }
  }

  /**
   * Limpia archivos temporales o antiguos
   * Elimina archivos más antiguos que el número de días especificado
   */
  async cleanupOldFiles(daysOld: number = 30): Promise<number> {
    const files = await this.listFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    for (const filename of files) {
      try {
        const filePath = join(this.uploadsDir, filename);
        const stats = await fs.stat(filePath);

        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch (error) {
        // Continuar con el siguiente archivo si hay error
        continue;
      }
    }

    return deletedCount;
  }

  /**
   * Obtiene el tamaño total de todos los archivos
   */
  async getTotalStorageUsed(): Promise<number> {
    const files = await this.listFiles();
    let totalSize = 0;

    for (const filename of files) {
      try {
        const info = await this.getFileInfo(filename);
        totalSize += info.size || 0;
      } catch (error) {
        // Continuar con el siguiente archivo
        continue;
      }
    }

    return totalSize;
  }

  /**
   * Valida un archivo antes de subirlo
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    // Validar tamaño
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `El archivo es demasiado grande. Tamaño máximo: ${this.maxFileSize / 1024 / 1024}MB`
      );
    }

    // Validar tipo MIME
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}`
      );
    }

    // Validar nombre de archivo
    if (!file.originalname || file.originalname.trim().length === 0) {
      throw new BadRequestException('El archivo debe tener un nombre válido');
    }

    // Validar extensión
    const extension = this.getFileExtension(file.originalname);
    if (!extension) {
      throw new BadRequestException('El archivo debe tener una extensión válida');
    }
  }

  /**
   * Extrae la extensión de un nombre de archivo
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  }

  /**
   * Asegura que el directorio de uploads existe
   */
  private async ensureUploadsDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch (error) {
      // El directorio no existe, crearlo
      try {
        await fs.mkdir(this.uploadsDir, { recursive: true });
      } catch (createError) {
        console.error('Error al crear directorio de uploads:', createError);
      }
    }
  }

  /**
   * Obtiene el tipo MIME de un archivo basado en su extensión
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Genera un nombre de archivo seguro
   */
  private sanitizeFilename(filename: string): string {
    // Remover caracteres especiales y espacios
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Verifica si un archivo es una imagen
   */
  isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  /**
   * Verifica si un archivo es un documento
   */
  isDocumentFile(mimetype: string): boolean {
    const documentTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    return documentTypes.includes(mimetype);
  }

  /**
   * Verifica si un archivo es un video
   */
  isVideoFile(mimetype: string): boolean {
    return mimetype.startsWith('video/');
  }

  /**
   * Verifica si un archivo es audio
   */
  isAudioFile(mimetype: string): boolean {
    return mimetype.startsWith('audio/');
  }
}
