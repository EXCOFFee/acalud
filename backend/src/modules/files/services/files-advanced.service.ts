/**
 * 📁 SERVICIO AVANZADO DE GESTIÓN DE ARCHIVOS Y REPOSITORIO EDUCATIVO
 * 
 * Sistema completo de gestión de archivos educativos con soporte para:
 * - Organización jerárquica de carpetas y archivos
 * - Control de permisos granular y herencia de permisos
 * - Versionado automático de archivos
 * - Metadatos educativos específicos
 * - Gestión de espacio y cuotas
 * - Funciones colaborativas avanzadas
 * 
 * ARQUITECTURA:
 * - Tree Structure: Sistema de carpetas con estructura de árbol materializada
 * - Permission System: Control granular de permisos con herencia
 * - Version Control: Versionado automático con historial completo
 * - Educational Metadata: Metadatos específicos para contenido educativo
 * - Space Management: Control de cuotas y gestión de espacio
 * - Collaborative Features: Funciones para trabajo en equipo
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
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

// Entidades
import { 
  File, 
  FileType, 
  FileStatus, 
  FileVisibility, 
  FilePurpose,
  FileMetadata,
  AccessLevel,
  FileUsage,
  EducationalMetadata,
  FilePermissions,
  FileStatistics,
  VersionInfo
} from '../entities/file.entity';
import { 
  Folder, 
  FolderType,
  FolderStatus, 
  FolderVisibility, 
  FolderPurpose,
  FolderPermissions,
  FolderStatistics
} from '../entities/folder.entity';

// DTOs (necesitamos crearlos)
interface CreateFileDto {
  filename: string;
  originalFilename: string;
  displayName: string;
  parentFolderId?: string;
  classroomId?: string;
  institutionId?: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  purpose?: FilePurpose;
  visibility?: FileVisibility;
  accessLevel?: AccessLevel;
  usage?: FileUsage;
  tags?: string[];
  description?: string;
  educationalMetadata?: EducationalMetadata;
  filePath?: string;
  url?: string;
  fileHash?: string;
}

interface CreateFolderDto {
  name: string;
  parentId?: string;
  classroomId?: string;
  purpose: FolderPurpose;
  visibility: FolderVisibility;
  description?: string;
  tags?: string[];
}

interface FileFilterDto {
  page: number;
  limit: number;
  folderId?: string;
  classroomId?: string;
  fileType?: FileType;
  purpose?: FilePurpose;
  visibility?: FileVisibility;
  tags?: string[];
  search?: string;
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: Date;
  dateTo?: Date;
  showHidden?: boolean;
}

interface FolderFilterDto {
  page: number;
  limit: number;
  parentId?: string;
  classroomId?: string;
  purpose?: FolderPurpose;
  visibility?: FolderVisibility;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  includeStats?: boolean;
}

interface MoveFileDto {
  targetFolderId?: string;
  newName?: string;
}

interface ShareFileDto {
  shareWithUserIds?: string[];
  shareWithClassroomIds?: string[];
  permissions: string[];
  expiresAt?: Date;
  requiresAuth?: boolean;
  allowDownload?: boolean;
  allowView?: boolean;
  allowEdit?: boolean;
}

interface FileVersionDto {
  versionNumber: number;
  comment?: string;
}

@Injectable()
export class FilesAdvancedService {
  private readonly logger = new Logger(FilesAdvancedService.name);
  private readonly uploadPath: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepository: TreeRepository<Folder>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 50 * 1024 * 1024); // 50MB
    this.allowedMimeTypes = this.configService.get<string>('ALLOWED_MIME_TYPES', '').split(',');
  }

  // =============================================================================
  // GESTIÓN DE ARCHIVOS
  // =============================================================================

  /**
   * 📁 Obtener archivos con filtros avanzados
   */
  async getFiles(filters: FileFilterDto, userId: string): Promise<any> {
    this.logger.log(`📁 Obteniendo archivos con filtros para usuario: ${userId}`);

    const queryBuilder = this.createFileQuery(filters, userId);

    // Aplicar paginación
    const offset = (filters.page - 1) * filters.limit;
    queryBuilder.skip(offset).take(filters.limit);

    // Ejecutar consulta
    const [files, total] = await queryBuilder.getManyAndCount();

    // Enriquecer datos de archivos
    const enrichedFiles = await Promise.all(
      files.map(file => this.enrichFileData(file, userId))
    );

    return {
      data: enrichedFiles,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      hasNextPage: filters.page < Math.ceil(total / filters.limit),
      hasPrevPage: filters.page > 1,
      appliedFilters: this.getAppliedFilters(filters),
      summary: await this.getFilesSummary(filters, userId),
    };
  }

  /**
   * 📄 Obtener archivo específico
   */
  async getFile(fileId: string, userId: string): Promise<any> {
    this.logger.log(`📄 Obteniendo archivo: ${fileId} para usuario: ${userId}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['folder', 'versions', 'sharedWith'],
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${fileId} no encontrado`);
    }

    // Verificar permisos
    if (!await this.hasFilePermission(file, userId, 'read')) {
      throw new ForbiddenException('No tienes permisos para acceder a este archivo');
    }

    // Incrementar contador de vistas
    await file.incrementViewCount();
    await this.fileRepository.save(file);

    return await this.enrichFileData(file, userId);
  }

  /**
   * ⬆️ Subir nuevo archivo
   */
  async uploadFile(createDto: CreateFileDto, userId: string): Promise<any> {
    this.logger.log(`⬆️ Subiendo archivo: ${createDto.originalFilename} por usuario: ${userId}`);

    // Validaciones previas
    await this.validateFileUpload(createDto, userId);

    // Verificar espacio disponible
    await this.checkUserQuota(userId, createDto.size);

    // Generar información del archivo
    const fileInfo = await this.generateFileInfo(createDto);

    // Crear entidad de archivo
    const file = this.fileRepository.create({
      filename: fileInfo.filename,
      originalFilename: createDto.originalFilename,
      displayName: createDto.displayName,
      mimeType: createDto.mimeType,
      size: createDto.size,
      fileType: this.determineFileType(createDto.mimeType),
      status: FileStatus.ACTIVE,
      visibility: createDto.visibility || FileVisibility.PRIVATE,
      purpose: createDto.purpose || FilePurpose.GENERAL,
      accessLevel: createDto.accessLevel || AccessLevel.PRIVATE,
      usage: createDto.usage || FileUsage.RESOURCE,
      parentFolderId: createDto.parentFolderId,
      classroomId: createDto.classroomId,
      institutionId: createDto.institutionId,
      ownerId: userId,
      filePath: fileInfo.filePath,
      url: fileInfo.url,
      fileHash: fileInfo.hash,
      tags: createDto.tags || [],
      description: createDto.description,
      educationalMetadata: createDto.educationalMetadata || {},
      technicalMetadata: {
        uploadedFromIP: 'unknown', // Se obtendría del request
        userAgent: 'unknown',
        originalPath: createDto.originalFilename,
      },
      permissions: this.getDefaultPermissions(createDto.visibility || FileVisibility.PRIVATE, userId),
    });

    // Guardar archivo físico
    await this.savePhysicalFile(fileInfo.filePath, createDto.buffer);

    // Guardar en base de datos
    const savedFile = await this.fileRepository.save(file);

    // Crear versión inicial (simulado con propiedades de la entidad)
    try {
      if (savedFile && typeof savedFile === 'object' && 'id' in savedFile) {
        await savedFile.createVersion(1, 'Versión inicial', {
          uploadedBy: userId,
          uploadedAt: new Date(),
          size: createDto.size,
          hash: fileInfo.hash,
        });

        await this.fileRepository.save(savedFile);
      }
    } catch (error) {
      this.logger.warn('Error al crear versión inicial:', error.message);
    }

    this.logger.log(`✅ Archivo subido exitosamente: ${savedFile.id}`);

    // Emitir eventos
    this.eventEmitter.emit('file.uploaded', {
      fileId: savedFile.id,
      userId,
      filename: savedFile.originalFilename,
      size: savedFile.size,
      classroomId: savedFile.classroomId,
    });

    return await this.enrichFileData(savedFile, userId);
  }

  /**
   * ✏️ Actualizar archivo existente
   */
  async updateFile(fileId: string, updateData: any, userId: string): Promise<any> {
    this.logger.log(`✏️ Actualizando archivo: ${fileId} por usuario: ${userId}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['versions'],
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${fileId} no encontrado`);
    }

    // Verificar permisos de escritura
    if (!await this.hasFilePermission(file, userId, 'write')) {
      throw new ForbiddenException('No tienes permisos para editar este archivo');
    }

    // Actualizar campos permitidos
    if (updateData.name) file.name = updateData.name;
    if (updateData.description !== undefined) file.description = updateData.description;
    if (updateData.tags) file.tags = updateData.tags;
    if (updateData.visibility) file.visibility = updateData.visibility;
    if (updateData.educationalMetadata) {
      file.educationalMetadata = { ...file.educationalMetadata, ...updateData.educationalMetadata };
    }

    file.lastModifiedById = userId;
    file.updatedAt = new Date();

    const updatedFile = await this.fileRepository.save(file);

    this.logger.log(`✅ Archivo actualizado exitosamente: ${fileId}`);

    // Emitir evento
    this.eventEmitter.emit('file.updated', {
      fileId: updatedFile.id,
      userId,
      changes: updateData,
    });

    return await this.enrichFileData(updatedFile, userId);
  }

  /**
   * 🔄 Subir nueva versión de archivo
   */
  async uploadNewVersion(
    fileId: string, 
    newFileData: Buffer, 
    versionDto: FileVersionDto, 
    userId: string
  ): Promise<any> {
    this.logger.log(`🔄 Subiendo nueva versión para archivo: ${fileId}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['versions'],
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${fileId} no encontrado`);
    }

    // Verificar permisos
    if (!await this.hasFilePermission(file, userId, 'write')) {
      throw new ForbiddenException('No tienes permisos para crear nuevas versiones');
    }

    // Generar nueva información de archivo
    const newHash = crypto.createHash('sha256').update(newFileData).digest('hex');
    const newSize = newFileData.length;
    const nextVersion = file.getNextVersionNumber();

    // Crear nueva ruta de archivo
    const versionPath = this.generateVersionPath(file.filePath, nextVersion);

    // Guardar archivo físico de la nueva versión
    await this.savePhysicalFile(versionPath, newFileData);

    // Crear nueva versión
    await file.createVersion(nextVersion, versionDto.comment || `Versión ${nextVersion}`, {
      uploadedBy: userId,
      uploadedAt: new Date(),
      size: newSize,
      hash: newHash,
      filePath: versionPath,
    });

    // Actualizar archivo principal
    file.size = newSize;
    file.fileHash = newHash;
    file.filePath = versionPath;
    file.lastModifiedById = userId;
    file.updatedAt = new Date();

    const updatedFile = await this.fileRepository.save(file);

    this.logger.log(`✅ Nueva versión creada: v${nextVersion} para archivo ${fileId}`);

    // Emitir evento
    this.eventEmitter.emit('file.version.created', {
      fileId: updatedFile.id,
      version: nextVersion,
      userId,
      size: newSize,
    });

    return await this.enrichFileData(updatedFile, userId);
  }

  /**
   * 🗑️ Eliminar archivo (soft delete)
   */
  async deleteFile(fileId: string, userId: string, permanent: boolean = false): Promise<any> {
    this.logger.log(`🗑️ ${permanent ? 'Eliminando permanentemente' : 'Marcando como eliminado'} archivo: ${fileId}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${fileId} no encontrado`);
    }

    // Verificar permisos de eliminación
    if (!await this.hasFilePermission(file, userId, 'delete')) {
      throw new ForbiddenException('No tienes permisos para eliminar este archivo');
    }

    if (permanent) {
      // Eliminación permanente
      await this.deletePhysicalFile(file.filePath);
      await this.fileRepository.remove(file);
    } else {
      // Soft delete
      file.status = FileStatus.DELETED;
      file.deletedAt = new Date();
      file.deletedById = userId;
      await this.fileRepository.save(file);
    }

    this.logger.log(`✅ Archivo ${permanent ? 'eliminado permanentemente' : 'marcado como eliminado'}: ${fileId}`);

    // Emitir evento
    this.eventEmitter.emit('file.deleted', {
      fileId,
      userId,
      permanent,
      filename: file.originalFilename,
    });

    return {
      success: true,
      message: `Archivo ${permanent ? 'eliminado permanentemente' : 'enviado a papelera'}`,
      data: { fileId, permanent },
    };
  }

  // =============================================================================
  // GESTIÓN DE CARPETAS
  // =============================================================================

  /**
   * 📁 Obtener carpetas con estructura jerárquica
   */
  async getFolders(filters: FolderFilterDto, userId: string): Promise<any> {
    this.logger.log(`📁 Obteniendo carpetas para usuario: ${userId}`);

    const queryBuilder = this.folderRepository
      .createQueryBuilder('folder')
      .where('folder.isActive = :isActive', { isActive: true });

    // Aplicar filtros
    if (filters.parentId) {
      queryBuilder.andWhere('folder.parentId = :parentId', { parentId: filters.parentId });
    } else if (filters.parentId === null) {
      queryBuilder.andWhere('folder.parentId IS NULL');
    }

    if (filters.classroomId) {
      queryBuilder.andWhere('folder.classroomId = :classroomId', { classroomId: filters.classroomId });
    }

    if (filters.purpose) {
      queryBuilder.andWhere('folder.purpose = :purpose', { purpose: filters.purpose });
    }

    if (filters.visibility) {
      queryBuilder.andWhere('folder.visibility = :visibility', { visibility: filters.visibility });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(folder.name) LIKE LOWER(:search) OR LOWER(folder.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    // Verificar permisos de acceso
    queryBuilder.andWhere(
      `(folder.visibility = :public OR folder.createdById = :userId OR 
        EXISTS (SELECT 1 FROM folder_permissions fp WHERE fp.folderId = folder.id AND fp.userId = :userId))`,
      { public: FolderVisibility.PUBLIC, userId }
    );

    // Ordenamiento
    const sortField = filters.sortBy === 'name' ? 'folder.name' :
                     filters.sortBy === 'createdAt' ? 'folder.createdAt' :
                     filters.sortBy === 'updatedAt' ? 'folder.updatedAt' :
                     'folder.name';

    queryBuilder.orderBy(sortField, filters.sortOrder || 'ASC');

    // Paginación
    const offset = (filters.page - 1) * filters.limit;
    queryBuilder.skip(offset).take(filters.limit);

    const [folders, total] = await queryBuilder.getManyAndCount();

    // Enriquecer datos de carpetas
    const enrichedFolders = await Promise.all(
      folders.map(folder => this.enrichFolderData(folder, userId, filters.includeStats))
    );

    return {
      data: enrichedFolders,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      hasNextPage: filters.page < Math.ceil(total / filters.limit),
      hasPrevPage: filters.page > 1,
    };
  }

  /**
   * ➕ Crear nueva carpeta
   */
  async createFolder(createDto: CreateFolderDto, userId: string): Promise<any> {
    this.logger.log(`➕ Creando carpeta: ${createDto.name} por usuario: ${userId}`);

    // Validar datos
    await this.validateFolderCreation(createDto, userId);

    // Obtener carpeta padre si existe
    let parentFolder = null;
    if (createDto.parentId) {
      parentFolder = await this.folderRepository.findOne({
        where: { id: createDto.parentId },
      });

      if (!parentFolder) {
        throw new NotFoundException('Carpeta padre no encontrada');
      }

      // Verificar permisos en carpeta padre
      if (!await this.hasFolderPermission(parentFolder, userId, 'write')) {
        throw new ForbiddenException('No tienes permisos para crear carpetas aquí');
      }
    }

    // Crear carpeta
    const folder = this.folderRepository.create({
      name: createDto.name,
      purpose: createDto.purpose,
      visibility: createDto.visibility,
      description: createDto.description,
      tags: createDto.tags || [],
      classroomId: createDto.classroomId,
      createdById: userId,
      parent: parentFolder,
      permissions: this.getDefaultFolderPermissions(createDto.visibility, userId),
    });

    const savedFolder = await this.folderRepository.save(folder);

    this.logger.log(`✅ Carpeta creada exitosamente: ${savedFolder.id}`);

    // Emitir evento
    this.eventEmitter.emit('folder.created', {
      folderId: savedFolder.id,
      userId,
      name: savedFolder.name,
      parentId: createDto.parentId,
      classroomId: savedFolder.classroomId,
    });

    return await this.enrichFolderData(savedFolder, userId, true);
  }

  // =============================================================================
  // SISTEMA DE PERMISOS
  // =============================================================================

  /**
   * 🔐 Verificar permisos de archivo
   */
  private async hasFilePermission(file: File, userId: string, permission: string): Promise<boolean> {
    // El propietario tiene todos los permisos
    if (file.uploadedById === userId) {
      return true;
    }

    // Verificar permisos específicos del archivo
    const userPermissions = file.permissions.users?.[userId] || [];
    if (userPermissions.includes(permission) || userPermissions.includes('all')) {
      return true;
    }

    // Verificar permisos por visibilidad
    if (file.visibility === FileVisibility.PUBLIC && permission === 'read') {
      return true;
    }

    // Verificar permisos de carpeta padre
    if (file.folderId) {
      const folder = await this.folderRepository.findOne({
        where: { id: file.folderId },
      });
      if (folder) {
        return await this.hasFolderPermission(folder, userId, permission);
      }
    }

    return false;
  }

  /**
   * 🔐 Verificar permisos de carpeta
   */
  private async hasFolderPermission(folder: Folder, userId: string, permission: string): Promise<boolean> {
    // El creador tiene todos los permisos
    if (folder.createdById === userId) {
      return true;
    }

    // Verificar permisos específicos de la carpeta
    const userPermissions = folder.permissions.users?.[userId] || [];
    if (userPermissions.includes(permission) || userPermissions.includes('all')) {
      return true;
    }

    // Verificar permisos por visibilidad
    if (folder.visibility === FolderVisibility.PUBLIC && permission === 'read') {
      return true;
    }

    // Verificar permisos heredados de carpeta padre
    if (folder.parent) {
      return await this.hasFolderPermission(folder.parent, userId, permission);
    }

    return false;
  }

  // =============================================================================
  // UTILIDADES PRIVADAS
  // =============================================================================

  private createFileQuery(filters: FileFilterDto, userId: string): SelectQueryBuilder<File> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.folder', 'folder')
      .where('file.status IN (:...statuses)', { 
        statuses: filters.showHidden ? 
          [FileStatus.ACTIVE, FileStatus.ARCHIVED] : 
          [FileStatus.ACTIVE] 
      });

    // Aplicar filtros
    if (filters.folderId) {
      queryBuilder.andWhere('file.folderId = :folderId', { folderId: filters.folderId });
    }

    if (filters.classroomId) {
      queryBuilder.andWhere('file.classroomId = :classroomId', { classroomId: filters.classroomId });
    }

    if (filters.fileType) {
      queryBuilder.andWhere('file.fileType = :fileType', { fileType: filters.fileType });
    }

    if (filters.purpose) {
      queryBuilder.andWhere('file.purpose = :purpose', { purpose: filters.purpose });
    }

    if (filters.visibility) {
      queryBuilder.andWhere('file.visibility = :visibility', { visibility: filters.visibility });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(file.name) LIKE LOWER(:search) OR LOWER(file.originalFilename) LIKE LOWER(:search) OR LOWER(file.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('file.tags && :tags', { tags: filters.tags });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('file.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('file.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    // Filtro de permisos
    queryBuilder.andWhere(
      `(file.visibility = :public OR file.uploadedById = :userId OR 
        JSON_EXTRACT(file.permissions, '$.users."${userId}"') IS NOT NULL)`,
      { public: FileVisibility.PUBLIC, userId }
    );

    // Ordenamiento
    const sortField = filters.sortBy === 'name' ? 'file.name' :
                     filters.sortBy === 'size' ? 'file.size' :
                     filters.sortBy === 'createdAt' ? 'file.createdAt' :
                     filters.sortBy === 'updatedAt' ? 'file.updatedAt' :
                     'file.createdAt';

    queryBuilder.orderBy(sortField, filters.sortOrder || 'DESC');

    return queryBuilder;
  }

  private async enrichFileData(file: File, userId: string): Promise<any> {
    const baseData = {
      ...file,
      downloadUrl: this.generateDownloadUrl(file.id),
      previewUrl: file.supportsPreview() ? this.generatePreviewUrl(file.id) : null,
      thumbnailUrl: file.supportsThumbnail() ? this.generateThumbnailUrl(file.id) : null,
      userPermissions: await this.getUserFilePermissions(file, userId),
      formatInfo: file.getFormatInfo(),
      sizeFormatted: file.getFormattedSize(),
      isOwner: file.uploadedById === userId,
      canEdit: await this.hasFilePermission(file, userId, 'write'),
      canDelete: await this.hasFilePermission(file, userId, 'delete'),
      canShare: await this.hasFilePermission(file, userId, 'share'),
    };

    // Agregar información de versiones si el usuario tiene permisos
    if (await this.hasFilePermission(file, userId, 'read')) {
      const versionsCount = Array.isArray((file as any).versions)
        ? (file as any).versions.length
        : file.currentVersion ? 1 : 0;

      const enrichedData = {
        ...baseData,
        versionsCount,
        currentVersion: file.currentVersion,
      };
      return enrichedData;
    }

    return baseData;
  }

  private async enrichFolderData(folder: Folder, userId: string, includeStats: boolean = false): Promise<any> {
    const baseData = {
      ...folder,
      userPermissions: await this.getUserFolderPermissions(folder, userId),
      isOwner: folder.createdById === userId,
      canEdit: await this.hasFolderPermission(folder, userId, 'write'),
      canDelete: await this.hasFolderPermission(folder, userId, 'delete'),
      path: await this.getFolderPath(folder),
    };

    if (includeStats) {
      const enrichedData = {
        ...baseData,
        stats: await this.getFolderStats(folder.id),
      };
      return enrichedData;
    }

    return baseData;
  }

  private async validateFileUpload(createDto: CreateFileDto, userId: string): Promise<void> {
    // Validar tamaño
    if (createDto.size > this.maxFileSize) {
      throw new BadRequestException(`El archivo excede el tamaño máximo permitido (${this.maxFileSize} bytes)`);
    }

    // Validar tipo MIME
    if (this.allowedMimeTypes.length > 0 && !this.allowedMimeTypes.includes(createDto.mimeType)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${createDto.mimeType}`);
    }

    // Validar carpeta de destino
    if (createDto.parentFolderId) {
      const folder = await this.folderRepository.findOne({
        where: { id: createDto.parentFolderId },
      });

      if (!folder) {
        throw new NotFoundException('Carpeta de destino no encontrada');
      }

      if (!await this.hasFolderPermission(folder, userId, 'write')) {
        throw new ForbiddenException('No tienes permisos para subir archivos a esta carpeta');
      }
    }

    // Verificar duplicados en la misma carpeta
    const existingFile = await this.fileRepository.findOne({
      where: {
        filename: createDto.filename,
        parentFolderId: createDto.parentFolderId || null,
        status: FileStatus.ACTIVE,
      },
    });

    if (existingFile) {
      throw new ConflictException(`Ya existe un archivo con el nombre "${createDto.filename}" en esta ubicación`);
    }
  }

  private async validateFolderCreation(createDto: CreateFolderDto, userId: string): Promise<void> {
    // Verificar duplicados en la misma ubicación
    const existingFolder = await this.folderRepository.findOne({
      where: {
        name: createDto.name,
        parentId: createDto.parentId,
        isActive: true,
      },
    });

    if (existingFolder) {
      throw new ConflictException(`Ya existe una carpeta con el nombre "${createDto.name}" en esta ubicación`);
    }
  }

  private async generateFileInfo(createDto: CreateFileDto): Promise<any> {
    const hash = crypto.createHash('sha256').update(createDto.buffer).digest('hex');
    const ext = path.extname(createDto.originalFilename);
    const filename = `${hash}${ext}`;
    const filePath = path.join(this.uploadPath, filename);

    return {
      hash,
      filename,
      filePath,
    };
  }

  private async savePhysicalFile(filePath: string, buffer: Buffer): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  private async deletePhysicalFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.error(`Error eliminando archivo físico: ${filePath}`, error);
    }
  }

  private determineFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (mimeType.includes('pdf')) return FileType.DOCUMENT;
    if (mimeType.includes('word') || mimeType.includes('document')) return FileType.DOCUMENT;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return FileType.DOCUMENT;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileType.DOCUMENT;
    if (mimeType.startsWith('text/')) return FileType.TEXT;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return FileType.ARCHIVE;
    return FileType.OTHER;
  }

  private getDefaultPermissions(visibility: FileVisibility, ownerId: string): any {
    const permissions = {
      users: {
        [ownerId]: ['all'],
      },
      groups: {},
      roles: {},
    };

    if (visibility === FileVisibility.PUBLIC) {
      permissions.roles['authenticated'] = ['read'];
    }

    return permissions;
  }

  private getDefaultFolderPermissions(visibility: FolderVisibility, ownerId: string): any {
    const permissions = {
      users: {
        [ownerId]: ['all'],
      },
      groups: {},
      roles: {},
    };

    if (visibility === FolderVisibility.PUBLIC) {
      permissions.roles['authenticated'] = ['read'];
    }

    return permissions;
  }

  private generateDownloadUrl(fileId: string): string {
    return `/api/files/${fileId}/download`;
  }

  private generatePreviewUrl(fileId: string): string {
    return `/api/files/${fileId}/preview`;
  }

  private generateThumbnailUrl(fileId: string): string {
    return `/api/files/${fileId}/thumbnail`;
  }

  private generateVersionPath(basePath: string, version: number): string {
    const ext = path.extname(basePath);
    const base = basePath.replace(ext, '');
    return `${base}_v${version}${ext}`;
  }

  private async checkUserQuota(userId: string, fileSize: number): Promise<void> {
    // Se implementaría lógica de cuotas por usuario
    // Por ahora, simplemente verificamos que no exceda un límite básico
    const maxUserStorage = this.configService.get<number>('MAX_USER_STORAGE', 1024 * 1024 * 1024); // 1GB

    const userFiles = await this.fileRepository
      .createQueryBuilder('file')
      .select('SUM(file.size)', 'totalSize')
      .where('file.uploadedById = :userId', { userId })
      .andWhere('file.status = :status', { status: FileStatus.ACTIVE })
      .getRawOne();

    const currentUsage = parseInt(userFiles?.totalSize || '0');
    
    if (currentUsage + fileSize > maxUserStorage) {
      throw new BadRequestException('Has excedido tu cuota de almacenamiento');
    }
  }

  private getAppliedFilters(filters: FileFilterDto): any {
    const applied: any = {};
    
    if (filters.folderId) applied.folderId = filters.folderId;
    if (filters.fileType) applied.fileType = filters.fileType;
    if (filters.purpose) applied.purpose = filters.purpose;
    if (filters.visibility) applied.visibility = filters.visibility;
    if (filters.search) applied.search = filters.search;
    if (filters.tags) applied.tags = filters.tags;
    
    return applied;
  }

  private async getFilesSummary(filters: FileFilterDto, userId: string): Promise<any> {
    // Implementar resumen básico de archivos
    return {
      totalFiles: 0,
      totalSize: 0,
      byType: {},
      byPurpose: {},
    };
  }

  private async getUserFilePermissions(file: File, userId: string): Promise<string[]> {
    if (file.uploadedById === userId) {
      return ['read', 'write', 'delete', 'share', 'admin'];
    }

    return file.permissions?.users?.[userId] || [];
  }

  private async getUserFolderPermissions(folder: Folder, userId: string): Promise<string[]> {
    if (folder.createdById === userId) {
      return ['read', 'write', 'delete', 'share', 'admin'];
    }

    return folder.permissions?.users?.[userId] || [];
  }

  private async getFolderPath(folder: Folder): Promise<string> {
    const ancestors = await this.folderRepository.findAncestors(folder);
    return ancestors.map(f => f.name).reverse().join('/');
  }

  private async getFolderStats(folderId: string): Promise<any> {
    const [filesCount, filesSize, subfoldersCount] = await Promise.all([
      this.fileRepository.count({
        where: { folderId, status: FileStatus.ACTIVE },
      }),
      this.fileRepository
        .createQueryBuilder('file')
        .select('SUM(file.size)', 'totalSize')
        .where('file.folderId = :folderId', { folderId })
        .andWhere('file.status = :status', { status: FileStatus.ACTIVE })
        .getRawOne(),
      this.folderRepository.count({
        where: { parentId: folderId, isActive: true },
      }),
    ]);

    return {
      filesCount,
      totalSize: parseInt(filesSize?.totalSize || '0'),
      subfoldersCount,
    };
  }
}