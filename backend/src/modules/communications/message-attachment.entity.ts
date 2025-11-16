/**
 * 📎 ENTIDAD DE ARCHIVOS ADJUNTOS - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Entidad que representa archivos adjuntos a mensajes:
 * - Imágenes, videos, documentos, audio
 * - Metadatos de archivos (tamaño, tipo, dimensiones)
 * - Thumbnails y previews automáticos
 * - Validación de tipos permitidos
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de modelar archivos adjuntos
 * - OCP: Extensible para nuevos tipos de archivos
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interface específica para archivos
 * - DIP: Usa abstracciones de Message y User
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Message } from './message.entity';

/**
 * Enum de tipos de archivos soportados
 * Determina procesamiento y validaciones específicas
 */
export enum AttachmentType {
  // 🖼️ Imágenes
  IMAGE = 'image',
  
  // 🎥 Videos
  VIDEO = 'video',
  
  // 🎵 Audio
  AUDIO = 'audio',
  
  // 📄 Documentos
  DOCUMENT = 'document',
  
  // 🗄️ Archivos comprimidos
  ARCHIVE = 'archive',
  
  // 🔗 Enlaces/URLs
  LINK = 'link',
  
  // 📊 Hojas de cálculo
  SPREADSHEET = 'spreadsheet',
  
  // 🎨 Presentaciones
  PRESENTATION = 'presentation',
}

/**
 * Entidad que representa un archivo adjunto a un mensaje
 * 
 * @description Almacena información de archivos subidos por usuarios
 * incluyendo metadatos, ubicación de almacenamiento y previews.
 * 
 * @example
 * ```typescript
 * const attachment = new MessageAttachment();
 * attachment.type = AttachmentType.IMAGE;
 * attachment.originalName = 'foto.jpg';
 * attachment.message = targetMessage;
 * attachment.uploadedBy = currentUser;
 * ```
 */
@Entity('message_attachments')
@Index(['messageId', 'type']) // Índice para archivos por mensaje y tipo
@Index(['uploadedById', 'createdAt']) // Índice para archivos por usuario
@Index(['type', 'createdAt']) // Índice para archivos por tipo
@Check(`"size" > 0`) // Validar que el tamaño sea positivo
export class MessageAttachment {
  /**
   * Identificador único del archivo adjunto
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Mensaje al que pertenece el archivo
   */
  @ManyToOne(() => Message, message => message.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  /**
   * ID del mensaje (para consultas optimizadas)
   */
  @Column({ name: 'message_id' })
  messageId: string;

  /**
   * Usuario que subió el archivo
   */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  /**
   * ID del usuario que subió (para consultas optimizadas)
   */
  @Column({ name: 'uploaded_by_id' })
  uploadedById: string;

  /**
   * Tipo de archivo adjunto
   */
  @Column({
    type: 'enum',
    enum: AttachmentType,
    comment: 'Tipo de archivo que determina el procesamiento',
  })
  type: AttachmentType;

  /**
   * Nombre original del archivo
   */
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Nombre original del archivo subido por el usuario',
  })
  originalName: string;

  /**
   * Nombre del archivo en el sistema de almacenamiento
   */
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Nombre único del archivo en el sistema de almacenamiento',
  })
  fileName: string;

  /**
   * Ruta completa o URL del archivo
   */
  @Column({
    type: 'text',
    comment: 'Ruta completa o URL donde está almacenado el archivo',
  })
  filePath: string;

  /**
   * Tipo MIME del archivo
   */
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Tipo MIME para determinación de contenido',
  })
  mimeType: string;

  /**
   * Tamaño del archivo en bytes
   */
  @Column({
    type: 'bigint',
    comment: 'Tamaño del archivo en bytes',
  })
  size: number;

  /**
   * Hash del archivo para detección de duplicados
   */
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Hash SHA-256 del archivo para detección de duplicados',
  })
  fileHash?: string;

  /**
   * URL del thumbnail/preview del archivo
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'URL del thumbnail generado automáticamente',
  })
  thumbnailUrl?: string;

  /**
   * Metadatos específicos del archivo en formato JSON
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Metadatos específicos según el tipo de archivo',
  })
  metadata?: {
    // 🖼️ Para imágenes
    image?: {
      width: number;
      height: number;
      format: string;
      hasAlpha: boolean;
      colorSpace: string;
      dpi?: number;
    };
    
    // 🎥 Para videos
    video?: {
      duration: number; // en segundos
      width: number;
      height: number;
      fps: number;
      codec: string;
      bitrate: number;
      hasAudio: boolean;
    };
    
    // 🎵 Para audio
    audio?: {
      duration: number; // en segundos
      bitrate: number;
      sampleRate: number;
      channels: number;
      codec: string;
      title?: string;
      artist?: string;
      album?: string;
    };
    
    // 📄 Para documentos
    document?: {
      pages: number;
      wordCount?: number;
      language?: string;
      author?: string;
      title?: string;
      createdDate?: Date;
      modifiedDate?: Date;
    };
    
    // 🗄️ Para archivos comprimidos
    archive?: {
      fileCount: number;
      compressedSize: number;
      uncompressedSize: number;
      compressionRatio: number;
      format: string;
      isEncrypted: boolean;
    };
    
    // Metadatos adicionales extensibles
    [key: string]: unknown;
  };

  /**
   * Indica si el archivo ha sido escaneado por antivirus
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Indica si el archivo fue escaneado por antivirus',
  })
  isScanned: boolean;

  /**
   * Resultado del escaneo de seguridad
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Resultado del escaneo: clean, infected, suspicious, error',
  })
  scanResult?: 'clean' | 'infected' | 'suspicious' | 'error';

  /**
   * Número de descargas del archivo
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Contador de descargas del archivo',
  })
  downloadCount: number;

  /**
   * Fecha de expiración del archivo (opcional)
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Fecha de expiración para archivos temporales',
  })
  expiresAt?: Date;

  /**
   * Fecha de creación
   */
  @CreateDateColumn({ 
    name: 'created_at',
    comment: 'Timestamp de subida del archivo',
  })
  createdAt: Date;

  /**
   * Fecha de actualización
   */
  @UpdateDateColumn({ 
    name: 'updated_at',
    comment: 'Timestamp de última modificación',
  })
  updatedAt: Date;

  // =============================================================================
  // 🔧 MÉTODOS DE UTILIDAD
  // =============================================================================

  /**
   * Verifica si el archivo ha expirado
   * 
   * @returns true si el archivo ha expirado
   */
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  /**
   * Obtiene el tamaño formateado para mostrar
   * 
   * @returns Tamaño en formato legible (KB, MB, GB)
   */
  getFormattedSize(): string {
    const bytes = this.size;
    
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Verifica si el archivo es una imagen
   * 
   * @returns true si es imagen
   */
  isImage(): boolean {
    return this.type === AttachmentType.IMAGE;
  }

  /**
   * Verifica si el archivo es un video
   * 
   * @returns true si es video
   */
  isVideo(): boolean {
    return this.type === AttachmentType.VIDEO;
  }

  /**
   * Verifica si el archivo es seguro para descargar
   * 
   * @returns true si es seguro
   */
  isSafeToDownload(): boolean {
    // Si no ha sido escaneado, no es seguro
    if (!this.isScanned) {
      return false;
    }
    
    // Solo archivos limpios son seguros
    return this.scanResult === 'clean';
  }

  /**
   * Incrementa el contador de descargas
   */
  incrementDownloadCount(): void {
    this.downloadCount += 1;
  }

  /**
   * Obtiene el ícono apropiado según el tipo de archivo
   * 
   * @returns Emoji representativo del tipo de archivo
   */
  getFileIcon(): string {
    const iconMap: Record<AttachmentType, string> = {
      [AttachmentType.IMAGE]: '🖼️',
      [AttachmentType.VIDEO]: '🎥',
      [AttachmentType.AUDIO]: '🎵',
      [AttachmentType.DOCUMENT]: '📄',
      [AttachmentType.ARCHIVE]: '🗄️',
      [AttachmentType.LINK]: '🔗',
      [AttachmentType.SPREADSHEET]: '📊',
      [AttachmentType.PRESENTATION]: '🎨',
    };

    return iconMap[this.type] || '📎';
  }

  /**
   * Obtiene resumen del archivo para APIs
   * 
   * @returns Objeto con datos esenciales del archivo
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      originalName: this.originalName,
      size: this.size,
      formattedSize: this.getFormattedSize(),
      mimeType: this.mimeType,
      thumbnailUrl: this.thumbnailUrl,
      downloadCount: this.downloadCount,
      isImage: this.isImage(),
      isVideo: this.isVideo(),
      isSafe: this.isSafeToDownload(),
      isExpired: this.isExpired(),
      icon: this.getFileIcon(),
      createdAt: this.createdAt,
      metadata: this.metadata,
    };
  }
}