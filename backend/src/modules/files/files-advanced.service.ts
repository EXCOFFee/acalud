/**
 * 📁 SERVICIO COMPLETO DE ARCHIVOS Y REPOSITORIO
 * 
 * Gestión completa de archivos educativos con funcionalidades avanzadas.
 * Incluye subida, organización, permisos, búsqueda y administración.
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
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as mime from 'mime-types';
import * as crypto from 'crypto';

// Entidades
import { File, FileType, FileStatus, AccessLevel, FileUsage } from './entities/file.entity';
import { Folder, FolderStatus } from './entities/folder.entity';

// DTOs
import {
  UploadFileDto,
  UpdateFileDto,
  CreateFolderDto,
  FileFilterDto,
  FileResponseDto,
  FolderResponseDto,
  FilePaginatedResponseDto,
} from './dto/files.dto';

// Interfaces
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface FileProcessingResult {
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  hash: string;
  thumbnailPath?: string;
  metadata?: any;
}

interface FileSearchParams {
  userId: string;
  userRole: string;
  classroomIds?: string[];
  institutionId?: string;
}

@Injectable()
export class FilesAdvancedService {
  private readonly logger = new Logger(FilesAdvancedService.name);
  private readonly uploadPath: string;
  private readonly thumbnailPath: string;
  private readonly maxFileSize: number;
  private readonly allowedTypes: string[];

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    private readonly configService: ConfigService,
  ) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
    this.thumbnailPath = this.configService.get<string>('THUMBNAIL_PATH', './uploads/thumbnails');
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 100 * 1024 * 1024); // 100MB
    this.allowedTypes = this.configService.get<string>('ALLOWED_FILE_TYPES', '').split(',').filter(Boolean);

    this.ensureDirectoriesExist();
  }

  // =============================================================================
  // OPERACIONES PRINCIPALES DE ARCHIVOS
  // =============================================================================

  /**
   * 📤 Subir un nuevo archivo
   */
  async uploadFile(
    file: UploadedFile,
    uploadDto: UploadFileDto,
    userId: string,
  ): Promise<FileResponseDto> {
    const startTime = Date.now();
    this.logger.log(`📤 [UPLOAD_START] Iniciando subida de archivo: ${file?.originalname || 'UNKNOWN'} por usuario ${userId}`);

    try {
      // ============================= VALIDACIONES CRÍTICAS =============================
      
      // 1. Validar parámetros de entrada
      if (!file) {
        this.logger.error('❌ [VALIDATION_ERROR] Archivo no proporcionado');
        throw new BadRequestException('No se proporcionó ningún archivo para subir');
      }
      
      if (!userId) {
        this.logger.error('❌ [VALIDATION_ERROR] Usuario no identificado');
        throw new UnauthorizedException('Usuario no autenticado para subir archivos');
      }

      if (!uploadDto) {
        this.logger.error('❌ [VALIDATION_ERROR] Datos de subida faltantes');
        throw new BadRequestException('Los datos de subida son obligatorios');
      }

      // 2. Validar archivo contra políticas de seguridad
      this.logger.log(`🔍 [VALIDATION] Validando archivo: ${file.originalname}`);
      await this.validateFile(file);

      // 3. Validar cuotas de usuario y espacio disponible
      try {
        await this.validateUserQuotas(userId);
        await this.validateDiskSpace(file.size);
      } catch (error) {
        this.logger.error(`❌ [QUOTA_ERROR] Error en validación de cuotas: ${error.message}`);
        throw new BadRequestException(`Error de cuotas: ${error.message}`);
      }

      // 4. Validar permisos de carpeta padre si existe
      if (uploadDto.parentFolderId) {
        this.logger.log(`🔒 [PERMISSIONS] Validando acceso a carpeta padre: ${uploadDto.parentFolderId}`);
        await this.validateFolderAccess(uploadDto.parentFolderId, userId, 'write');
      }

      // 5. Validar duplicados (siempre activo por seguridad)
      try {
        await this.validateDuplicateFiles(file, uploadDto.parentFolderId, userId);
      } catch (error) {
        this.logger.warn(`⚠️ [DUPLICATE_WARNING] ${error.message}`);
        // Continuamos pero registramos la advertencia
      }

      // ============================= PROCESAMIENTO SEGURO =============================

      this.logger.log(`⚙️ [PROCESSING] Procesando archivo: ${file.originalname}`);
      const processingResult = await this.processFile(file);

      // Crear entidad de archivo con validación de errores
      const fileEntity = this.fileRepository.create({
        filename: processingResult.filename,
        originalFilename: file.originalname,
        displayName: uploadDto.displayName || file.originalname,
        description: uploadDto.description,
        mimeType: processingResult.mimeType,
        fileType: this.getFileType(processingResult.mimeType),
        size: processingResult.size,
        fileHash: processingResult.hash,
        filePath: processingResult.path,
        url: this.generateFileUrl(processingResult.filename),
        thumbnailUrl: processingResult.thumbnailPath ? this.generateThumbnailUrl(processingResult.filename) : null,
        accessLevel: uploadDto.accessLevel || AccessLevel.PRIVATE,
        usage: uploadDto.usage || FileUsage.RESOURCE,
        ownerId: userId,
        classroomId: uploadDto.classroomId,
        institutionId: uploadDto.institutionId,
        parentFolderId: uploadDto.parentFolderId,
        educationalMetadata: uploadDto.educationalMetadata || {},
        permissions: uploadDto.permissions || {
          canRead: [],
          canWrite: [],
          canDelete: [],
          canShare: [],
          rolePermissions: {},
        },
        technicalMetadata: {
          ...processingResult.metadata,
          ...uploadDto.technicalMetadata,
        },
        tags: uploadDto.tags || [],
        isPublic: uploadDto.accessLevel === AccessLevel.PUBLIC,
        requiresAuth: uploadDto.requiresAuth ?? true,
        expiresAt: uploadDto.expiresAt,
        status: FileStatus.ACTIVE,
        statistics: {
          viewCount: 0,
          downloadCount: 0,
          shareCount: 0,
          lastAccessed: null,
          uniqueViewers: 0,
          avgViewTime: 0,
          popularityScore: 0,
        },
        versionInfo: {
          version: '1.0.0',
          isLatest: true,
          changelog: 'Versión inicial',
        },
      });

      // ============================= GUARDADO SEGURO EN BD =============================
      this.logger.log(`💾 [DATABASE] Guardando archivo en base de datos: ${file.originalname}`);
      
      let savedFile: File;
      try {
        savedFile = await this.fileRepository.save(fileEntity);
        // Asegurar que tenemos una entidad única en lugar de array
        const fileResult = Array.isArray(savedFile) ? savedFile[0] : savedFile;
        savedFile = fileResult;
        
        if (!savedFile || !savedFile.id) {
          throw new Error('Error guardando archivo en base de datos');
        }
        
        this.logger.log(`✅ [DATABASE_SUCCESS] Archivo guardado con ID: ${savedFile.id}`);
      } catch (dbError) {
        this.logger.error(`❌ [DATABASE_ERROR] Error guardando en BD: ${dbError.message}`);
        
        // Limpiar archivo físico si falló la BD
        try {
          if (processingResult.path) {
            await fs.remove(processingResult.path);
          }
          if (processingResult.thumbnailPath) {
            await fs.remove(processingResult.thumbnailPath);
          }
        } catch (cleanupError) {
          this.logger.error(`❌ [CLEANUP_ERROR] Error limpiando archivos: ${cleanupError.message}`);
        }
        
        throw new BadRequestException(`Error guardando archivo: ${dbError.message}`);
      }

      // ============================= POST-PROCESAMIENTO =============================
      
      // Actualizar estadísticas de la carpeta padre
      if (uploadDto.parentFolderId) {
        try {
          this.logger.log(`📊 [STATS_UPDATE] Actualizando estadísticas de carpeta padre`);
          await this.updateFolderStatistics(uploadDto.parentFolderId);
        } catch (statsError) {
          this.logger.warn(`⚠️ [STATS_WARNING] Error actualizando estadísticas: ${statsError.message}`);
          // No es crítico, continuamos
        }
      }

      // Registrar auditoría
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.logger.log(`✅ [UPLOAD_SUCCESS] Archivo subido exitosamente en ${processingTime}ms`);
      this.logger.log(`📄 [UPLOAD_DETAILS] ID: ${savedFile.id}, Tamaño: ${this.formatBytes(savedFile.size)}, Tipo: ${savedFile.mimeType}`);
      
      return this.mapFileToResponseDto(savedFile);

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Clasificar y registrar el error
      let errorType = 'UNKNOWN_ERROR';
      let userMessage = 'Error interno del servidor';
      
      if (error instanceof BadRequestException) {
        errorType = 'VALIDATION_ERROR';
        userMessage = error.message;
      } else if (error instanceof UnauthorizedException) {
        errorType = 'PERMISSION_ERROR';
        userMessage = 'Sin permisos para realizar esta operación';
      } else if (error instanceof ConflictException) {
        errorType = 'CONFLICT_ERROR';
        userMessage = error.message;
      } else if (error instanceof ForbiddenException) {
        errorType = 'FORBIDDEN_ERROR';
        userMessage = 'Operación no permitida';
      }
      
      this.logger.error(`❌ [${errorType}] Error subiendo archivo "${file?.originalname || 'UNKNOWN'}" después de ${processingTime}ms`);
      this.logger.error(`❌ [ERROR_DETAILS] ${error.message}`, error.stack);
      
      // Limpiar archivos temporales y físicos en caso de error
      try {
        if (file) {
          await this.cleanupTempFiles(file.originalname);
        }
        
        // Si ya se procesó el archivo pero falló después, limpiar archivos físicos
        if (error.name === 'DATABASE_ERROR' && error.processingResult) {
          this.logger.log(`🧹 [CLEANUP] Limpiando archivos físicos debido a error de BD`);
          if (
            error.processingResult.path &&
            (await fs.pathExists(error.processingResult.path))
          ) {
            await fs.remove(error.processingResult.path);
          }
          if (
            error.processingResult.thumbnailPath &&
            (await fs.pathExists(error.processingResult.thumbnailPath))
          ) {
            await fs.remove(error.processingResult.thumbnailPath);
          }
        }
      } catch (cleanupError) {
        this.logger.error(`❌ [CLEANUP_ERROR] Error en limpieza: ${cleanupError.message}`);
      }

      // Re-lanzar error apropiado para el cliente
      if (error instanceof BadRequestException || 
          error instanceof UnauthorizedException || 
          error instanceof ConflictException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      // Para errores no manejados, devolver error genérico
      throw new BadRequestException(userMessage);
    }
  }

  /**
   * 📄 Obtener archivo por ID
   */
  async getFileById(
    fileId: string,
    searchParams: FileSearchParams,
  ): Promise<FileResponseDto> {
    this.logger.log(`📄 Obteniendo archivo: ${fileId}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['owner', 'classroom', 'parentFolder'],
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${fileId} no encontrado`);
    }

    // Validar permisos de acceso
    await this.validateFileAccess(file, searchParams.userId, 'read');

    // Incrementar contador de vistas
    await this.incrementFileViews(fileId);

    return this.mapFileToResponseDto(file);
  }

  /**
   * ✏️ Actualizar archivo existente
   */
  async updateFile(
    fileId: string,
    updateDto: UpdateFileDto,
    userId: string,
  ): Promise<FileResponseDto> {
    this.logger.log(`✏️ Actualizando archivo: ${fileId}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['owner'],
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${fileId} no encontrado`);
    }

    // Validar permisos de escritura
    await this.validateFileAccess(file, userId, 'write');

    // Validar nueva carpeta padre si se especifica
    if (updateDto.parentFolderId && updateDto.parentFolderId !== file.parentFolderId) {
      await this.validateFolderAccess(updateDto.parentFolderId, userId, 'write');
    }

    // Preparar datos de actualización
    const updateData = {
      ...updateDto,
      lastModified: new Date(),
    };

    // Si se cambia el nivel de acceso
    if (updateDto.accessLevel && updateDto.accessLevel !== file.accessLevel) {
      updateData.isPublic = updateDto.accessLevel === AccessLevel.PUBLIC;
    }

    // Actualizar archivo
    await this.fileRepository.update(fileId, updateData);

    // Actualizar estadísticas de carpetas si cambió la ubicación
    if (updateDto.parentFolderId && updateDto.parentFolderId !== file.parentFolderId) {
      if (file.parentFolderId) {
        await this.updateFolderStatistics(file.parentFolderId);
      }
      await this.updateFolderStatistics(updateDto.parentFolderId);
    }

    const updatedFile = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['owner', 'classroom', 'parentFolder'],
    });

    this.logger.log(`✅ Archivo actualizado exitosamente: ${fileId}`);
    return this.mapFileToResponseDto(updatedFile);
  }

  /**
   * 🗑️ Eliminar archivo
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    this.logger.log(`🗑️ Eliminando archivo: ${fileId}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['owner'],
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${fileId} no encontrado`);
    }

    // Validar permisos de eliminación
    await this.validateFileAccess(file, userId, 'delete');

    // Eliminar archivos físicos
    await this.deletePhysicalFiles(file);

    // Eliminar de la base de datos
    await this.fileRepository.remove(file);

    // Actualizar estadísticas de la carpeta padre
    if (file.parentFolderId) {
      await this.updateFolderStatistics(file.parentFolderId);
    }

    this.logger.log(`✅ Archivo eliminado exitosamente: ${fileId}`);
  }

  /**
   * 📋 Listar archivos con filtros
   */
  async listFiles(
    filterDto: FileFilterDto,
    searchParams: FileSearchParams,
  ): Promise<FilePaginatedResponseDto> {
    this.logger.log(`📋 Listando archivos con filtros`);

    const queryBuilder = this.createFileQueryBuilder(filterDto, searchParams);

    // Aplicar paginación
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    // Ejecutar consulta
    const [files, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: files.map(file => this.mapFileToResponseDto(file)),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  // =============================================================================
  // OPERACIONES DE CARPETAS
  // =============================================================================

  /**
   * 📁 Crear nueva carpeta
   */
  async createFolder(
    createDto: CreateFolderDto,
    userId: string,
  ): Promise<FolderResponseDto> {
    this.logger.log(`📁 Creando carpeta: ${createDto.name}`);

    // Validar carpeta padre si existe
    if (createDto.parentId) {
      await this.validateFolderAccess(createDto.parentId, userId, 'write');
    }

    // Verificar que no exista una carpeta con el mismo nombre en la misma ubicación
    const existingFolder = await this.folderRepository.findOne({
      where: {
        name: createDto.name,
        parentId: createDto.parentId || null,
        ownerId: userId,
        status: FolderStatus.ACTIVE,
      },
    });

    if (existingFolder) {
      throw new ConflictException('Ya existe una carpeta con ese nombre en esta ubicación');
    }

    const folder = this.folderRepository.create({
      ...createDto,
      ownerId: userId,
      status: FolderStatus.ACTIVE,
      statistics: {
        totalFiles: 0,
        totalSubfolders: 0,
        totalSize: 0,
        fileTypes: {},
        lastActivity: new Date(),
        popularityScore: 0,
      },
      metadata: createDto.metadata || {},
    });

    const savedFolder = await this.folderRepository.save(folder);
    // Asegurar que tenemos una entidad única en lugar de array
    const folderResult = Array.isArray(savedFolder) ? savedFolder[0] : savedFolder;

    // Actualizar estadísticas de la carpeta padre
    if (createDto.parentId) {
      await this.updateFolderStatistics(createDto.parentId);
    }

    this.logger.log(`✅ Carpeta creada exitosamente: ${folderResult.id}`);
    return this.mapFolderToResponseDto(folderResult);
  }

  /**
   * 📁 Obtener carpeta por ID
   */
  async getFolderById(
    folderId: string,
    searchParams: FileSearchParams,
  ): Promise<FolderResponseDto> {
    this.logger.log(`📁 Obteniendo carpeta: ${folderId}`);

    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
      relations: ['owner', 'classroom', 'parent'],
    });

    if (!folder) {
      throw new NotFoundException(`Carpeta con ID ${folderId} no encontrada`);
    }

    // Validar permisos de acceso
    await this.validateFolderAccess(folderId, searchParams.userId, 'read');

    return this.mapFolderToResponseDto(folder);
  }

  // =============================================================================
  // UTILIDADES Y VALIDACIONES PRIVADAS
  // =============================================================================

  private async ensureDirectoriesExist(): Promise<void> {
    await fs.ensureDir(this.uploadPath);
    await fs.ensureDir(this.thumbnailPath);
  }

  private async validateFile(file: UploadedFile): Promise<void> {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`Archivo demasiado grande. Máximo: ${this.maxFileSize} bytes`);
    }

    if (this.allowedTypes.length > 0 && !this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`);
    }
  }

  private generateUniqueFilename(originalName: string): string {
    const extension = path.extname(originalName);
    const name = path.basename(originalName, extension);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${name}_${timestamp}_${random}${extension}`;
  }

  private generateFileUrl(filename: string): string {
    return `/api/files/download/${filename}`;
  }

  private generateThumbnailUrl(filename: string): string {
    return `/api/files/thumbnail/${filename}`;
  }

  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (mimeType === 'application/pdf') return FileType.DOCUMENT;
    if (mimeType.includes('word') || mimeType.includes('document')) return FileType.DOCUMENT;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileType.SPREADSHEET;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileType.PRESENTATION;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return FileType.ARCHIVE;
    return FileType.OTHER;
  }

  private async extractMetadata(filePath: string, mimeType: string): Promise<any> {
    const stats = await fs.stat(filePath);
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      mimeType,
    };
  }

  private async validateFileAccess(file: File, userId: string, action: string): Promise<void> {
    if (file.ownerId === userId) return;
    if (action === 'read' && file.isPublic) return;
    throw new ForbiddenException(`No tienes permisos para ${action} este archivo`);
  }

  private async validateFolderAccess(folderId: string, userId: string, action: string): Promise<void> {
    const folder = await this.folderRepository.findOne({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Carpeta no encontrada');
    if (folder.ownerId === userId) return;
    throw new ForbiddenException(`No tienes permisos para ${action} esta carpeta`);
  }

  private createFileQueryBuilder(filterDto: FileFilterDto, searchParams: FileSearchParams): SelectQueryBuilder<File> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.owner', 'owner')
      .leftJoinAndSelect('file.classroom', 'classroom')
      .leftJoinAndSelect('file.parentFolder', 'parentFolder');

    queryBuilder.where('file.status = :status', { status: FileStatus.ACTIVE });

    if (searchParams.userRole !== 'admin') {
      queryBuilder.andWhere(
        '(file.ownerId = :userId OR file.isPublic = true OR file.classroomId IN (:...classroomIds))',
        {
          userId: searchParams.userId,
          classroomIds: searchParams.classroomIds || [],
        },
      );
    }

    if (filterDto.fileType) {
      queryBuilder.andWhere('file.fileType = :fileType', { fileType: filterDto.fileType });
    }

    if (filterDto.search) {
      queryBuilder.andWhere(
        '(file.displayName ILIKE :search OR file.description ILIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    const sortBy = filterDto.sortBy || 'createdAt';
    const sortOrder = filterDto.sortOrder || 'DESC';
    queryBuilder.orderBy(`file.${sortBy}`, sortOrder);

    return queryBuilder;
  }

  private async processFile(file: UploadedFile): Promise<FileProcessingResult> {
    const filename = this.generateUniqueFilename(file.originalname);
    const filePath = path.join(this.uploadPath, filename);
    
    await fs.writeFile(filePath, file.buffer);
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const mimeType = mime.lookup(file.originalname) || file.mimetype;
    
    return {
      filename,
      path: filePath,
      size: file.size,
      mimeType,
      hash,
    };
  }

  private mapFileToResponseDto(file: File): FileResponseDto {
    return {
      id: file.id,
      filename: file.filename,
      displayName: file.displayName,
      description: file.description,
      fileType: file.fileType,
      status: file.status,
      accessLevel: file.accessLevel,
      usage: file.usage,
      ownerId: file.ownerId,
      classroomId: file.classroomId,
      parentFolderId: file.parentFolderId,
      mimeType: file.mimeType,
      size: file.size,
      formattedSize: file.getFormattedSize(),
      url: file.url,
      thumbnailUrl: file.thumbnailUrl,
      fileHash: file.fileHash,
      educationalMetadata: file.educationalMetadata,
      statistics: file.statistics,
      versionInfo: file.versionInfo,
      tags: file.tags,
      extension: file.getFileExtension(),
      typeIcon: file.getTypeIcon(),
      isMultimedia: file.isMultimedia(),
      isPreviewable: file.isPreviewable(),
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  private mapFolderToResponseDto(folder: Folder): FolderResponseDto {
    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      folderType: folder.folderType,
      typeLabel: folder.getTypeLabel(),
      status: folder.status,
      accessLevel: folder.accessLevel,
      ownerId: folder.ownerId,
      parentId: folder.parentId,
      fullPath: folder.getFullPath(),
      depth: folder.getDepth(),
      statistics: folder.statistics,
      color: folder.color,
      icon: folder.icon,
      isFavorite: folder.isFavorite,
      isPublic: folder.isPublic,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  private async updateFolderStatistics(folderId: string): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
      relations: ['files', 'children'],
    });

    if (folder) {
      await folder.calculateStatistics();
      await this.folderRepository.save(folder);
    }
  }

  private async incrementFileViews(fileId: string): Promise<void> {
    await this.fileRepository.increment({ id: fileId }, 'statistics.views', 1);
  }

  private async deletePhysicalFiles(file: File): Promise<void> {
    try {
      if (file.filePath && await fs.pathExists(file.filePath)) {
        await fs.remove(file.filePath);
      }
      
      if (file.thumbnailPath && await fs.pathExists(file.thumbnailPath)) {
        await fs.remove(file.thumbnailPath);
      }
    } catch (error) {
      this.logger.warn(`No se pudieron eliminar los archivos físicos para ${file.id}: ${error.message}`);
    }
  }

  private async cleanupTempFiles(originalName: string): Promise<void> {
    this.logger.log(`Limpiando archivos temporales para: ${originalName}`);
  }

  // =============================================================================
  // MÉTODOS DE VALIDACIÓN AVANZADA
  // =============================================================================

  /**
   * 📊 Validar cuotas de usuario
   */
  private async validateUserQuotas(userId: string): Promise<void> {
    try {
      this.logger.log(`📊 [QUOTA_CHECK] Validando cuotas para usuario: ${userId}`);
      
      // Obtener estadísticas actuales del usuario
      const userFiles = await this.fileRepository.find({
        where: { ownerId: userId, status: FileStatus.ACTIVE },
        select: ['size'],
      });

      const totalUserSize = userFiles.reduce((total, file) => total + Number(file.size), 0);
      const userFileCount = userFiles.length;

      // Límites configurables (deberían venir de configuración)
      const maxUserSize = 10 * 1024 * 1024 * 1024; // 10GB
      const maxUserFiles = 1000;

      if (totalUserSize >= maxUserSize) {
        throw new Error(`Cuota de almacenamiento excedida. Límite: ${this.formatBytes(maxUserSize)}`);
      }

      if (userFileCount >= maxUserFiles) {
        throw new Error(`Límite de archivos excedido. Máximo: ${maxUserFiles} archivos`);
      }

      this.logger.log(`✅ [QUOTA_OK] Usuario dentro de límites: ${this.formatBytes(totalUserSize)}/${this.formatBytes(maxUserSize)}, ${userFileCount}/${maxUserFiles} archivos`);
    } catch (error) {
      this.logger.error(`❌ [QUOTA_ERROR] Error validando cuotas: ${error.message}`);
      throw error;
    }
  }

  /**
   * 💾 Validar espacio disponible en disco
   */
  private async validateDiskSpace(fileSize: number): Promise<void> {
    try {
      this.logger.log(`💾 [DISK_CHECK] Validando espacio en disco para archivo de ${this.formatBytes(fileSize)}`);
      
      // En un entorno real, verificarías el espacio libre del disco
      // Por ahora, solo verificamos que el archivo no sea extremadamente grande
      if (fileSize > 5 * 1024 * 1024 * 1024) { // 5GB
        throw new Error(`Archivo demasiado grande: ${this.formatBytes(fileSize)}. Máximo permitido: 5GB`);
      }

      this.logger.log(`✅ [DISK_OK] Espacio suficiente para archivo de ${this.formatBytes(fileSize)}`);
    } catch (error) {
      this.logger.error(`❌ [DISK_ERROR] Error validando espacio: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔍 Validar archivos duplicados
   */
  private async validateDuplicateFiles(
    file: UploadedFile,
    parentFolderId: string | null,
    userId: string
  ): Promise<void> {
    try {
      this.logger.log(`🔍 [DUPLICATE_CHECK] Verificando duplicados para: ${file.originalname}`);
      
      // Buscar archivos con el mismo nombre en la misma carpeta
      const existingFile = await this.fileRepository.findOne({
        where: {
          originalFilename: file.originalname,
          parentFolderId: parentFolderId,
          ownerId: userId,
          status: FileStatus.ACTIVE,
        },
      });

      if (existingFile) {
        this.logger.warn(`⚠️ [DUPLICATE_FOUND] Archivo duplicado encontrado: ${file.originalname}`);
        throw new ConflictException(
          `Ya existe un archivo con el nombre "${file.originalname}" en esta ubicación`
        );
      }

      this.logger.log(`✅ [DUPLICATE_OK] No se encontraron duplicados para: ${file.originalname}`);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`❌ [DUPLICATE_ERROR] Error verificando duplicados: ${error.message}`);
      throw new BadRequestException(`Error verificando duplicados: ${error.message}`);
    }
  }

  /**
   * 📏 Formatear bytes en formato legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}