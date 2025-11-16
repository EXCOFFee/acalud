/**
 * 📋 INTERCEPTOR DE VALIDACIÓN DE ARCHIVOS
 * 
 * Intercepta peticiones para validar archivos antes del procesamiento,
 * incluyendo validaciones de seguridad, tipo de archivo, tamaño, etc.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';

/**
 * Configuración de validación de archivos
 */
interface FileValidationConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  dangerousExtensions: string[];
  maxFilenameLength: number;
}

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FileValidationInterceptor.name);
  private readonly config: FileValidationConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      maxFileSize: this.configService.get<number>('MAX_FILE_SIZE', 100 * 1024 * 1024), // 100MB
      maxFiles: this.configService.get<number>('MAX_FILES_PER_UPLOAD', 10),
      allowedMimeTypes: this.configService.get<string>('ALLOWED_MIME_TYPES', 
        'image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ).split(','),
      allowedExtensions: this.configService.get<string>('ALLOWED_EXTENSIONS',
        'jpg,jpeg,png,gif,pdf,txt,doc,docx,xls,xlsx,ppt,pptx'
      ).split(','),
      dangerousExtensions: [
        'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
        'app', 'deb', 'pkg', 'rpm', 'dmg', 'iso', 'sh', 'ps1', 'php'
      ],
      maxFilenameLength: 255,
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.requestId || this.generateRequestId();

    try {
      // Validar archivos en la petición
      this.validateFilesInRequest(request, requestId);
      
      this.logger.log(`✅ [${requestId}] Validación de archivos completada exitosamente`);
    } catch (error) {
      this.logger.error(`❌ [${requestId}] Error en validación: ${error.message}`);
      throw error;
    }

    return next.handle();
  }

  /**
   * 🔍 Validar archivos en la petición
   */
  private validateFilesInRequest(request: any, requestId: string): void {
    const files = this.extractFiles(request);
    
    if (!files || files.length === 0) {
      // No hay archivos para validar
      return;
    }

    this.logger.log(`🔍 [${requestId}] Validando ${files.length} archivo(s)`);

    // Validar cantidad de archivos
    this.validateFileCount(files, requestId);

    // Validar cada archivo individualmente
    files.forEach((file, index) => {
      this.validateSingleFile(file, index, requestId);
    });
  }

  /**
   * 📁 Extraer archivos de la petición
   */
  private extractFiles(request: any): any[] {
    const files: any[] = [];

    // Archivo único
    if (request.file) {
      files.push(request.file);
    }

    // Múltiples archivos
    if (request.files) {
      if (Array.isArray(request.files)) {
        files.push(...request.files);
      } else if (typeof request.files === 'object') {
        // Archivos organizados por campo
        Object.values(request.files).forEach((fileArray: any) => {
          if (Array.isArray(fileArray)) {
            files.push(...fileArray);
          } else {
            files.push(fileArray);
          }
        });
      }
    }

    return files;
  }

  /**
   * 🔢 Validar cantidad de archivos
   */
  private validateFileCount(files: any[], requestId: string): void {
    if (files.length > this.config.maxFiles) {
      this.logger.error(`❌ [${requestId}] Demasiados archivos: ${files.length}/${this.config.maxFiles}`);
      throw new BadRequestException(
        `Demasiados archivos. Máximo permitido: ${this.config.maxFiles}, recibidos: ${files.length}`
      );
    }

    this.logger.log(`✅ [${requestId}] Cantidad de archivos válida: ${files.length}/${this.config.maxFiles}`);
  }

  /**
   * 📄 Validar un archivo individual
   */
  private validateSingleFile(file: any, index: number, requestId: string): void {
    const fileInfo = `Archivo ${index + 1}: "${file.originalname}"`;
    this.logger.log(`🔍 [${requestId}] Validando ${fileInfo}`);

    try {
      // Validaciones básicas
      this.validateFileExists(file, fileInfo, requestId);
      this.validateFileName(file, fileInfo, requestId);
      this.validateFileSize(file, fileInfo, requestId);
      this.validateFileExtension(file, fileInfo, requestId);
      this.validateMimeType(file, fileInfo, requestId);
      this.validateFileSecurity(file, fileInfo, requestId);

      this.logger.log(`✅ [${requestId}] ${fileInfo} validado exitosamente`);
    } catch (error) {
      this.logger.error(`❌ [${requestId}] Error validando ${fileInfo}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📋 Validar que el archivo existe y tiene contenido
   */
  private validateFileExists(file: any, fileInfo: string, _requestId: string): void {
    if (!file) {
      throw new BadRequestException(`${fileInfo}: Archivo no proporcionado`);
    }

    if (!file.originalname) {
      throw new BadRequestException(`${fileInfo}: Nombre de archivo faltante`);
    }

    if (!file.size || file.size === 0) {
      throw new BadRequestException(`${fileInfo}: El archivo está vacío`);
    }

    if (!file.buffer && !file.path) {
      throw new BadRequestException(`${fileInfo}: Contenido del archivo no disponible`);
    }
  }

  /**
   * 📝 Validar nombre del archivo
   */
  private validateFileName(file: any, fileInfo: string, requestId: string): void {
    const filename = file.originalname;

    // Validar longitud
    if (filename.length > this.config.maxFilenameLength) {
      throw new BadRequestException(
        `${fileInfo}: Nombre demasiado largo (${filename.length}/${this.config.maxFilenameLength} caracteres)`
      );
    }

    // Validar caracteres peligrosos
    const invalidCharacters = /[<>:"/\\|?*]/;
    if (invalidCharacters.test(filename) || this.containsControlCharacters(filename)) {
      throw new BadRequestException(
        `${fileInfo}: El nombre contiene caracteres no permitidos`
      );
    }

    // Validar nombres reservados del sistema
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    const nameWithoutExt = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      throw new BadRequestException(
        `${fileInfo}: "${nameWithoutExt}" es un nombre reservado del sistema`
      );
    }

    this.logger.log(`✅ [${requestId}] ${fileInfo}: Nombre válido`);
  }

  /**
   * 📏 Validar tamaño del archivo
   */
  private validateFileSize(file: any, fileInfo: string, requestId: string): void {
    if (file.size > this.config.maxFileSize) {
      const maxSizeMB = Math.round(this.config.maxFileSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      
      throw new BadRequestException(
        `${fileInfo}: Archivo demasiado grande (${fileSizeMB}MB/${maxSizeMB}MB)`
      );
    }

    this.logger.log(`✅ [${requestId}] ${fileInfo}: Tamaño válido (${this.formatBytes(file.size)})`);
  }

  /**
   * 🎯 Validar extensión del archivo
   */
  private validateFileExtension(file: any, fileInfo: string, requestId: string): void {
    const extension = this.getFileExtension(file.originalname).toLowerCase();

    if (!extension) {
      throw new BadRequestException(`${fileInfo}: El archivo debe tener una extensión`);
    }

    // Verificar extensiones peligrosas
    if (this.config.dangerousExtensions.includes(extension)) {
      throw new BadRequestException(
        `${fileInfo}: Extensión ".${extension}" no permitida por seguridad`
      );
    }

    // Verificar extensiones permitidas (si está configurado)
    if (this.config.allowedExtensions.length > 0 && 
        !this.config.allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `${fileInfo}: Extensión ".${extension}" no permitida. Permitidas: ${this.config.allowedExtensions.join(', ')}`
      );
    }

    this.logger.log(`✅ [${requestId}] ${fileInfo}: Extensión ".${extension}" válida`);
  }

  /**
   * 🎭 Validar tipo MIME
   */
  private validateMimeType(file: any, fileInfo: string, requestId: string): void {
    if (!file.mimetype) {
      throw new BadRequestException(`${fileInfo}: Tipo MIME no detectado`);
    }

    // Verificar tipos MIME permitidos (si está configurado)
    if (this.config.allowedMimeTypes.length > 0 && 
        !this.config.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `${fileInfo}: Tipo MIME "${file.mimetype}" no permitido`
      );
    }

    // Validar consistencia extensión-MIME
    const extension = this.getFileExtension(file.originalname).toLowerCase();
    if (!this.validateMimeTypeConsistency(extension, file.mimetype)) {
      this.logger.warn(`⚠️ [${requestId}] ${fileInfo}: Inconsistencia MIME/extensión detectada`);
      // No bloqueamos, solo advertimos
    }

    this.logger.log(`✅ [${requestId}] ${fileInfo}: Tipo MIME "${file.mimetype}" válido`);
  }

  /**
   * 🛡️ Validaciones de seguridad
   */
  private validateFileSecurity(file: any, fileInfo: string, requestId: string): void {
    // Detectar posibles ataques por double extension
    const filename = file.originalname.toLowerCase();
    if (filename.includes('.php.') || filename.includes('.asp.') || filename.includes('.jsp.')) {
      throw new BadRequestException(`${fileInfo}: Doble extensión detectada (posible ataque)`);
    }

    // Detectar archivos con nullbytes
    if (filename.includes('\x00')) {
      throw new BadRequestException(`${fileInfo}: Caracteres nulos detectados (posible ataque)`);
    }

    // Validar que no termine con espacios o puntos (problema en Windows)
    if (filename.endsWith(' ') || filename.endsWith('.')) {
      throw new BadRequestException(`${fileInfo}: El nombre no puede terminar con espacios o puntos`);
    }

    this.logger.log(`✅ [${requestId}] ${fileInfo}: Validaciones de seguridad aprobadas`);
  }

  /**
   * 🔗 Validar consistencia entre MIME type y extensión
   */
  private validateMimeTypeConsistency(extension: string, mimeType: string): boolean {
    const mimeMap: { [key: string]: string[] } = {
      'jpg': ['image/jpeg', 'image/jpg'],
      'jpeg': ['image/jpeg', 'image/jpg'],
      'png': ['image/png'],
      'gif': ['image/gif'],
      'pdf': ['application/pdf'],
      'txt': ['text/plain'],
      'doc': ['application/msword'],
      'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'xls': ['application/vnd.ms-excel'],
      'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      'ppt': ['application/vnd.ms-powerpoint'],
      'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    };

    const expectedMimes = mimeMap[extension];
    return !expectedMimes || expectedMimes.includes(mimeType);
  }

  /**
   * 📎 Obtener extensión del archivo
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  /**
   * 🔐 Determina si la cadena contiene caracteres de control
   */
  private containsControlCharacters(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 0 && code < 32) {
        return true;
      }
    }
    return false;
  }

  /**
   * 📏 Formatear bytes en formato legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 🆔 Generar ID único para la petición
   */
  private generateRequestId(): string {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}