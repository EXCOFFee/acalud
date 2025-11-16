import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
  Unique
} from 'typeorm';
import { ActivityLibrary } from './activity-library.entity';

/**
 * Entidad que representa las etiquetas/tags de las actividades
 * Implementa un sistema flexible de clasificación y búsqueda
 * Sigue principios SOLID para extensibilidad y mantenimiento
 * 
 * @description Gestiona las etiquetas que permiten categorizar y buscar actividades
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Entity('activity_tags')
@Unique(['libraryActivityId', 'tagName']) // No duplicar tags en la misma actividad
@Index(['tagName', 'isActive'])
@Index(['libraryActivityId'])
export class ActivityTag {
  /**
   * Identificador único de la etiqueta
   * Clave primaria auto-generada
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID de la actividad de biblioteca
   * Referencia a la actividad etiquetada
   */
  @Column('uuid')
  libraryActivityId: string;

  /**
   * Nombre de la etiqueta
   * Texto identificativo del tag (normalizado a minúsculas)
   */
  @Column({ 
    type: 'varchar', 
    length: 50,
    transformer: {
      to: (value: string) => value?.toLowerCase().trim(),
      from: (value: string) => value
    }
  })
  tagName: string;

  /**
   * Color de la etiqueta para visualización
   * Código hexadecimal para UI consistente
   */
  @Column({ 
    type: 'varchar', 
    length: 7, 
    default: '#007bff',
    transformer: {
      to: (value: string) => value?.toLowerCase(),
      from: (value: string) => value
    }
  })
  color: string;

  /**
   * Indica si la etiqueta está activa
   * Permite desactivar tags sin eliminarlos
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Fecha de creación de la etiqueta
   * Auditoría automática
   */
  @CreateDateColumn()
  createdAt: Date;

  // =====================================
  // RELACIONES CON OTRAS ENTIDADES
  // =====================================

  /**
   * Relación con la actividad de biblioteca
   * Permite acceso a la actividad etiquetada
   */
  @ManyToOne(() => ActivityLibrary, activity => activity.tags, { 
    eager: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'libraryActivityId' })
  libraryActivity: ActivityLibrary;

  // =====================================
  // MÉTODOS DE NEGOCIO
  // =====================================

  /**
   * Valida que el nombre de la etiqueta sea correcto
   * Implementa reglas de negocio para tags
   * 
   * @returns {boolean} True si el nombre es válido
   */
  isValidTagName(): boolean {
    if (!this.tagName) return false;
    
    const trimmed = this.tagName.trim();
    return trimmed.length >= 2 && 
           trimmed.length <= 50 && 
      /^[a-záéíóúñü0-9\s_-]+$/i.test(trimmed);
  }

  /**
   * Valida que el color sea un código hexadecimal válido
   * Verifica formato de color CSS
   * 
   * @returns {boolean} True si el color es válido
   */
  isValidColor(): boolean {
    return /^#[0-9a-f]{6}$/i.test(this.color);
  }

  /**
   * Normaliza el nombre de la etiqueta
   * Aplica transformaciones estándar para consistencia
   */
  normalizeTagName(): void {
    if (this.tagName) {
      this.tagName = this.tagName
        .toLowerCase()
        .trim()
         .replace(/\s+/g, ' ') // Espacios múltiples a uno solo
         .replace(/[^\w\sáéíóúñü-]/g, ''); // Solo caracteres permitidos, incluyendo guiones
    }
  }

  /**
   * Normaliza el color a formato hexadecimal
   * Asegura formato correcto para CSS
   */
  normalizeColor(): void {
    if (this.color && !this.color.startsWith('#')) {
      this.color = '#' + this.color;
    }
    
    if (this.color) {
      this.color = this.color.toLowerCase();
    }
  }

  /**
   * Obtiene el nombre de la etiqueta formateado para mostrar
   * Capitaliza la primera letra de cada palabra
   * 
   * @returns {string} Nombre formateado
   */
  getDisplayName(): string {
    if (!this.tagName) return '';
    
    return this.tagName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Verifica si la etiqueta coincide con un término de búsqueda
   * Implementa búsqueda flexible por similitud
   * 
   * @param {string} searchTerm - Término a buscar
   * @returns {boolean} True si coincide
   */
  matchesSearch(searchTerm: string): boolean {
    if (!searchTerm) return true;
    
    const normalizedSearch = searchTerm.toLowerCase().trim();
    const normalizedTag = this.tagName.toLowerCase();
    
    return normalizedTag.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedTag);
  }

  /**
   * Calcula la similitud con otro tag
   * Útil para evitar duplicados y sugerir tags similares
   * 
   * @param {string} otherTag - Otro tag para comparar
   * @returns {number} Porcentaje de similitud (0-100)
   */
  calculateSimilarity(otherTag: string): number {
    if (!otherTag) return 0;
    
    const tag1 = this.tagName.toLowerCase();
    const tag2 = otherTag.toLowerCase();
    
    if (tag1 === tag2) return 100;
    
    // Algoritmo simple de similitud por caracteres comunes
    const commonChars = tag1.split('').filter(char => tag2.includes(char)).length;
    const maxLength = Math.max(tag1.length, tag2.length);
    
    return Math.round((commonChars / maxLength) * 100);
  }

  /**
   * Desactiva la etiqueta
   * Oculta el tag sin eliminarlo físicamente
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Reactiva la etiqueta
   * Vuelve a mostrar un tag previamente oculto
   */
  reactivate(): void {
    this.isActive = true;
  }

  /**
   * Actualiza el color de la etiqueta
   * Método para cambio controlado de color
   * 
   * @param {string} newColor - Nuevo color en formato hex
   */
  updateColor(newColor: string): void {
    if (/^#?[0-9a-f]{6}$/i.test(newColor)) {
      this.color = newColor.startsWith('#') ? newColor.toLowerCase() : '#' + newColor.toLowerCase();
    }
  }

  /**
   * Obtiene información completa de la etiqueta
   * Datos formateados para API response
   * 
   * @returns {object} Información de la etiqueta
   */
  getTagInfo(): {
    id: string;
    name: string;
    displayName: string;
    color: string;
    isActive: boolean;
    createdAt: Date;
  } {
    return {
      id: this.id,
      name: this.tagName,
      displayName: this.getDisplayName(),
      color: this.color,
      isActive: this.isActive,
      createdAt: this.createdAt
    };
  }

  /**
   * Lista de colores predefinidos para etiquetas
   * Paleta de colores consistente para la UI
   * 
   * @returns {string[]} Array de colores hexadecimales
   */
  static getDefaultColors(): string[] {
    return [
      '#007bff', // Azul
      '#28a745', // Verde
      '#ffc107', // Amarillo
      '#dc3545', // Rojo
      '#6f42c1', // Púrpura
      '#fd7e14', // Naranja
      '#20c997', // Turquesa
      '#e83e8c', // Rosa
      '#6c757d', // Gris
      '#17a2b8', // Cian
      '#495057', // Gris oscuro
      '#f8f9fa'  // Gris claro
    ];
  }

  /**
   * Obtiene un color aleatorio de la paleta predefinida
   * Útil para asignar colores automáticamente
   * 
   * @returns {string} Color hexadecimal aleatorio
   */
  static getRandomColor(): string {
    const colors = ActivityTag.getDefaultColors();
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Valida y normaliza un nombre de tag antes de crearlo
   * Método estático para validación previa
   * 
   * @param {string} tagName - Nombre del tag a validar
   * @returns {string|null} Tag normalizado o null si es inválido
   */
  static validateAndNormalizeTagName(tagName: string): string | null {
    if (!tagName || typeof tagName !== 'string') return null;
    
    const normalized = tagName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\sáéíóúñü-]/g, ''); // Only allow valid characters
    
    if (normalized.length < 2 || normalized.length > 50) return null;
    
    return normalized;
  }
}