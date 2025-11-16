/**
 * 📁 DTOs PARA SISTEMA DE ARCHIVOS Y REPOSITORIO
 * 
 * Data Transfer Objects para la gestión completa de archivos educativos.
 * Incluye validación robusta y documentación Swagger.
 * 
 * FUNCIONALIDADES CUBIERTAS:
 * - Upload y gestión de archivos
 * - Organización con carpetas
 * - Sistema de permisos
 * - Búsqueda y filtros
 * - Versionado y metadata
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsDateString,
  IsInt,
  Min,
  Max,
  Length,
  IsNotEmpty,
  ValidateNested,
  ArrayMaxSize,
  IsHexColor,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Importar enums
import { FileType, FileStatus, AccessLevel, FileUsage } from '../entities/file.entity';
import { FolderType, FolderStatus } from '../entities/folder.entity';

// =============================================================================
// DTOs DE CONFIGURACIÓN Y METADATA
// =============================================================================

/**
 * 📚 DTO para metadatos educativos
 */
export class EducationalMetadataDto {
  @ApiPropertyOptional({ description: 'Materia asociada', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  subject?: string;

  @ApiPropertyOptional({ description: 'Nivel educativo', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'Nivel de dificultad', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Objetivos de aprendizaje', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  learningObjectives?: string[];

  @ApiPropertyOptional({ description: 'Palabras clave', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Uso educativo', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  educationalUse?: string;

  @ApiPropertyOptional({ description: 'Rango de edad típico', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  typicalAgeRange?: string;

  @ApiPropertyOptional({ description: 'Tipo de interactividad', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  interactivityType?: string;

  @ApiPropertyOptional({ description: 'Tipo de recurso educativo', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  learningResourceType?: string;
}

/**
 * 🔒 DTO para configuración de permisos
 */
export class FilePermissionsDto {
  @ApiPropertyOptional({ description: 'IDs de usuarios que pueden leer', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @ArrayMaxSize(100)
  canRead?: string[];

  @ApiPropertyOptional({ description: 'IDs de usuarios que pueden escribir', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @ArrayMaxSize(50)
  canWrite?: string[];

  @ApiPropertyOptional({ description: 'IDs de usuarios que pueden eliminar', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @ArrayMaxSize(20)
  canDelete?: string[];

  @ApiPropertyOptional({ description: 'IDs de usuarios que pueden compartir', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @ArrayMaxSize(50)
  canShare?: string[];

  @ApiPropertyOptional({ description: 'Permisos por rol' })
  @IsOptional()
  @IsObject()
  rolePermissions?: {
    [role: string]: {
      read: boolean;
      write: boolean;
      delete: boolean;
      share: boolean;
    };
  };
}

/**
 * 🔄 DTO para información de versión
 */
export class VersionInfoDto {
  @ApiProperty({ description: 'Número de versión', maxLength: 20 })
  @IsString()
  @Length(1, 20)
  version: string;

  @ApiPropertyOptional({ description: 'Registro de cambios', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  changelog?: string;

  @ApiPropertyOptional({ description: 'ID de versión anterior' })
  @IsOptional()
  @IsUUID()
  previousVersionId?: string;

  @ApiProperty({ description: 'Es la versión más reciente' })
  @IsBoolean()
  isLatest: boolean;
}

// =============================================================================
// DTOs PRINCIPALES DE ARCHIVO
// =============================================================================

/**
 * 📤 DTO para subir un nuevo archivo
 */
export class UploadFileDto {
  @ApiProperty({ description: 'Nombre para mostrar del archivo', minLength: 1, maxLength: 255 })
  @IsString({ message: 'El nombre para mostrar debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre para mostrar no puede estar vacío' })
  @Length(1, 255, { message: 'El nombre debe tener entre 1 y 255 caracteres' })
  @Transform(({ value }) => value?.trim())
  displayName: string;

  @ApiPropertyOptional({ description: 'Descripción del archivo', maxLength: 2000 })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @Length(0, 2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({ description: 'Nivel de acceso', enum: AccessLevel })
  @IsEnum(AccessLevel, { message: 'El nivel de acceso debe ser un valor válido (PRIVATE, CLASSROOM, INSTITUTION, PUBLIC)' })
  @IsNotEmpty({ message: 'El nivel de acceso es obligatorio' })
  accessLevel: AccessLevel;

  @ApiPropertyOptional({ description: 'Uso educativo del archivo', enum: FileUsage })
  @IsOptional()
  @IsEnum(FileUsage)
  usage?: FileUsage = FileUsage.RESOURCE;

  @ApiPropertyOptional({ description: 'ID del aula asociada' })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del aula debe ser un UUID válido' })
  classroomId?: string;

  @ApiPropertyOptional({ description: 'ID de la institución' })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de la institución debe ser un UUID válido' })
  institutionId?: string;

  @ApiPropertyOptional({ description: 'ID de la carpeta padre' })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de la carpeta padre debe ser un UUID válido' })
  parentFolderId?: string;

  @ApiPropertyOptional({ description: 'Metadatos educativos' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EducationalMetadataDto)
  educationalMetadata?: EducationalMetadataDto;

  @ApiPropertyOptional({ description: 'Configuración de permisos' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FilePermissionsDto)
  permissions?: FilePermissionsDto;

  @ApiPropertyOptional({ description: 'Etiquetas del archivo', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Requiere autenticación para acceder' })
  @IsOptional()
  @IsBoolean()
  requiresAuth?: boolean = true;

  @ApiPropertyOptional({ description: 'Fecha de expiración del archivo' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Metadata técnica adicional' })
  @IsOptional()
  @IsObject()
  technicalMetadata?: any;
}

/**
 * ✏️ DTO para actualizar archivo existente
 */
export class UpdateFileDto {
  @ApiPropertyOptional({ description: 'Nombre para mostrar del archivo', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Descripción del archivo', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Estado del archivo', enum: FileStatus })
  @IsOptional()
  @IsEnum(FileStatus)
  status?: FileStatus;

  @ApiPropertyOptional({ description: 'Nivel de acceso', enum: AccessLevel })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiPropertyOptional({ description: 'Uso educativo del archivo', enum: FileUsage })
  @IsOptional()
  @IsEnum(FileUsage)
  usage?: FileUsage;

  @ApiPropertyOptional({ description: 'ID de la carpeta padre' })
  @IsOptional()
  @IsUUID()
  parentFolderId?: string;

  @ApiPropertyOptional({ description: 'Metadatos educativos' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EducationalMetadataDto)
  educationalMetadata?: EducationalMetadataDto;

  @ApiPropertyOptional({ description: 'Configuración de permisos' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FilePermissionsDto)
  permissions?: FilePermissionsDto;

  @ApiPropertyOptional({ description: 'Etiquetas del archivo', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Es archivo público' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Es archivo destacado' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Requiere autenticación' })
  @IsOptional()
  @IsBoolean()
  requiresAuth?: boolean;

  @ApiPropertyOptional({ description: 'Fecha de expiración' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Metadata técnica' })
  @IsOptional()
  @IsObject()
  technicalMetadata?: any;
}

// =============================================================================
// DTOs DE CARPETAS
// =============================================================================

/**
 * 📁 DTO para crear nueva carpeta
 */
export class CreateFolderDto {
  @ApiProperty({ description: 'Nombre de la carpeta', minLength: 1, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la carpeta', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ description: 'Tipo de carpeta', enum: FolderType })
  @IsEnum(FolderType)
  folderType: FolderType;

  @ApiProperty({ description: 'Nivel de acceso', enum: AccessLevel })
  @IsEnum(AccessLevel)
  accessLevel: AccessLevel;

  @ApiPropertyOptional({ description: 'ID del aula asociada' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'ID de la institución' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ description: 'ID de la carpeta padre' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Color de la carpeta (hex)' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Icono personalizado', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Etiquetas de la carpeta', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(15)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Carpeta pública' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ description: 'Carpeta fijada' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean = false;

  @ApiPropertyOptional({ description: 'Metadata adicional' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

/**
 * ✏️ DTO para actualizar carpeta existente
 */
export class UpdateFolderDto {
  @ApiPropertyOptional({ description: 'Nombre de la carpeta', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción de la carpeta', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Estado de la carpeta', enum: FolderStatus })
  @IsOptional()
  @IsEnum(FolderStatus)
  status?: FolderStatus;

  @ApiPropertyOptional({ description: 'Nivel de acceso', enum: AccessLevel })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiPropertyOptional({ description: 'ID de la carpeta padre' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Color de la carpeta (hex)' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Icono personalizado', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Etiquetas de la carpeta', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(15)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Carpeta favorita' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ description: 'Carpeta fijada' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Carpeta pública' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Orden dentro de la carpeta padre', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Metadata adicional' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

// =============================================================================
// DTOs DE CONSULTA Y FILTROS
// =============================================================================

/**
 * 🔍 DTO para filtrar archivos
 */
export class FileFilterDto {
  @ApiPropertyOptional({ description: 'Tipo de archivo', enum: FileType })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiPropertyOptional({ description: 'Estado del archivo', enum: FileStatus })
  @IsOptional()
  @IsEnum(FileStatus)
  status?: FileStatus;

  @ApiPropertyOptional({ description: 'Nivel de acceso', enum: AccessLevel })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiPropertyOptional({ description: 'Uso educativo', enum: FileUsage })
  @IsOptional()
  @IsEnum(FileUsage)
  usage?: FileUsage;

  @ApiPropertyOptional({ description: 'ID del propietario' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'ID del aula' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'ID de la institución' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ description: 'ID de la carpeta padre' })
  @IsOptional()
  @IsUUID()
  parentFolderId?: string;

  @ApiPropertyOptional({ description: 'Solo archivos públicos' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Solo archivos destacados' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Etiquetas a incluir', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Extensiones de archivo', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  extensions?: string[];

  @ApiPropertyOptional({ description: 'Tamaño mínimo en bytes', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSize?: number;

  @ApiPropertyOptional({ description: 'Tamaño máximo en bytes', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Fecha de creación desde' })
  @IsOptional()
  @IsDateString()
  createdFrom?: Date;

  @ApiPropertyOptional({ description: 'Fecha de creación hasta' })
  @IsOptional()
  @IsDateString()
  createdTo?: Date;

  @ApiPropertyOptional({ description: 'Término de búsqueda', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  search?: string;

  @ApiPropertyOptional({ description: 'Ordenar por campo', enum: ['filename', 'size', 'createdAt', 'lastModified', 'popularity'] })
  @IsOptional()
  @IsString()
  sortBy?: 'filename' | 'size' | 'createdAt' | 'lastModified' | 'popularity';

  @ApiPropertyOptional({ description: 'Orden de clasificación', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Página actual', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

/**
 * 🔍 DTO para filtrar carpetas
 */
export class FolderFilterDto {
  @ApiPropertyOptional({ description: 'Tipo de carpeta', enum: FolderType })
  @IsOptional()
  @IsEnum(FolderType)
  folderType?: FolderType;

  @ApiPropertyOptional({ description: 'Estado de la carpeta', enum: FolderStatus })
  @IsOptional()
  @IsEnum(FolderStatus)
  status?: FolderStatus;

  @ApiPropertyOptional({ description: 'Nivel de acceso', enum: AccessLevel })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiPropertyOptional({ description: 'ID del propietario' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'ID del aula' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'ID de la institución' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ description: 'ID de la carpeta padre' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Solo carpetas públicas' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Solo carpetas favoritas' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ description: 'Solo carpetas fijadas' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Término de búsqueda', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  search?: string;

  @ApiPropertyOptional({ description: 'Ordenar por campo', enum: ['name', 'createdAt', 'updatedAt', 'totalFiles', 'totalSize'] })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'totalFiles' | 'totalSize';

  @ApiPropertyOptional({ description: 'Orden de clasificación', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Página actual', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

// =============================================================================
// DTOs DE RESPUESTA
// =============================================================================

/**
 * 📄 DTO de respuesta para archivo
 */
export class FileResponseDto {
  @ApiProperty({ description: 'ID único del archivo' })
  id: string;

  @ApiProperty({ description: 'Nombre del archivo' })
  filename: string;

  @ApiProperty({ description: 'Nombre para mostrar' })
  displayName: string;

  @ApiProperty({ description: 'Descripción' })
  description: string;

  @ApiProperty({ description: 'Tipo de archivo', enum: FileType })
  fileType: FileType;

  @ApiProperty({ description: 'Estado del archivo', enum: FileStatus })
  status: FileStatus;

  @ApiProperty({ description: 'Nivel de acceso', enum: AccessLevel })
  accessLevel: AccessLevel;

  @ApiProperty({ description: 'Uso educativo', enum: FileUsage })
  usage: FileUsage;

  @ApiProperty({ description: 'ID del propietario' })
  ownerId: string;

  @ApiProperty({ description: 'ID del aula' })
  classroomId: string;

  @ApiProperty({ description: 'ID de la carpeta padre' })
  parentFolderId: string;

  @ApiProperty({ description: 'Tipo MIME' })
  mimeType: string;

  @ApiProperty({ description: 'Tamaño en bytes' })
  size: number;

  @ApiProperty({ description: 'Tamaño formateado' })
  formattedSize: string;

  @ApiProperty({ description: 'URL del archivo' })
  url: string;

  @ApiProperty({ description: 'URL del thumbnail' })
  thumbnailUrl: string;

  @ApiProperty({ description: 'Hash del archivo' })
  fileHash: string;

  @ApiProperty({ description: 'Metadatos educativos' })
  educationalMetadata: any;

  @ApiProperty({ description: 'Estadísticas de uso' })
  statistics: any;

  @ApiProperty({ description: 'Información de versión' })
  versionInfo: any;

  @ApiProperty({ description: 'Etiquetas' })
  tags: string[];

  @ApiProperty({ description: 'Extensión del archivo' })
  extension: string;

  @ApiProperty({ description: 'Icono representativo' })
  typeIcon: string;

  @ApiProperty({ description: 'Es archivo multimedia' })
  isMultimedia: boolean;

  @ApiProperty({ description: 'Es previsualizable' })
  isPreviewable: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: Date;
}

/**
 * 📁 DTO de respuesta para carpeta
 */
export class FolderResponseDto {
  @ApiProperty({ description: 'ID único de la carpeta' })
  id: string;

  @ApiProperty({ description: 'Nombre de la carpeta' })
  name: string;

  @ApiProperty({ description: 'Descripción' })
  description: string;

  @ApiProperty({ description: 'Tipo de carpeta', enum: FolderType })
  folderType: FolderType;

  @ApiProperty({ description: 'Etiqueta del tipo' })
  typeLabel: string;

  @ApiProperty({ description: 'Estado', enum: FolderStatus })
  status: FolderStatus;

  @ApiProperty({ description: 'Nivel de acceso', enum: AccessLevel })
  accessLevel: AccessLevel;

  @ApiProperty({ description: 'ID del propietario' })
  ownerId: string;

  @ApiProperty({ description: 'ID de la carpeta padre' })
  parentId: string;

  @ApiProperty({ description: 'Ruta completa' })
  fullPath: string;

  @ApiProperty({ description: 'Nivel de profundidad' })
  depth: number;

  @ApiProperty({ description: 'Estadísticas' })
  statistics: any;

  @ApiProperty({ description: 'Color de la carpeta' })
  color: string;

  @ApiProperty({ description: 'Icono' })
  icon: string;

  @ApiProperty({ description: 'Es favorita' })
  isFavorite: boolean;

  @ApiProperty({ description: 'Es pública' })
  isPublic: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: Date;
}

/**
 * 📃 DTO de respuesta paginada para archivos
 */
export class FilePaginatedResponseDto {
  @ApiProperty({ description: 'Lista de archivos', type: [FileResponseDto] })
  data: FileResponseDto[];

  @ApiProperty({ description: 'Total de elementos' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ description: 'Hay página siguiente' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Hay página anterior' })
  hasPrevPage: boolean;
}

/**
 * 📃 DTO de respuesta paginada para carpetas
 */
export class FolderPaginatedResponseDto {
  @ApiProperty({ description: 'Lista de carpetas', type: [FolderResponseDto] })
  data: FolderResponseDto[];

  @ApiProperty({ description: 'Total de elementos' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ description: 'Hay página siguiente' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Hay página anterior' })
  hasPrevPage: boolean;
}