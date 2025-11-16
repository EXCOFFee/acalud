import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn,
  Index,
  JoinColumn
} from 'typeorm';
import { User } from '../../users/user.entity';
import { StoreItem } from './store-item.entity';

/**
 * Enumeración para el estado de una compra
 * Define el ciclo de vida de las transacciones
 */
export enum PurchaseStatus {
  PENDING = 'pending',         // Compra iniciada pero no completada
  COMPLETED = 'completed',     // Compra exitosa y completada
  FAILED = 'failed',           // Compra falló por algún motivo
  REFUNDED = 'refunded',       // Compra reembolsada
  CANCELLED = 'cancelled'      // Compra cancelada por el usuario
}

/**
 * Enumeración para el método de pago usado
 * Define cómo se pagó el elemento
 */
export enum PaymentMethod {
  COINS = 'coins',             // Pagado con monedas de gamificación
  ACHIEVEMENT = 'achievement', // Obtenido por logro
  GIFT = 'gift',               // Recibido como regalo
  PROMOTION = 'promotion',     // Obtenido por promoción
  ADMIN_GRANT = 'admin_grant'  // Otorgado por administrador
}

/**
 * Entidad que representa una compra de usuario en la tienda
 * Registra todas las transacciones y el inventario de elementos cosméticos
 * Implementa el historial completo de adquisiciones del usuario
 * 
 * @description Gestiona las compras realizadas por usuarios en la tienda cosmética
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Entity('user_purchases')
@Index(['userId', 'purchaseStatus'])
@Index(['storeItemId', 'purchaseStatus'])
@Index(['createdAt'])
@Index(['userId', 'storeItemId'])
export class UserPurchase {
  /**
   * Identificador único de la compra
   * Clave primaria auto-generada
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID del usuario que realizó la compra
   * Referencia al comprador
   */
  @Column('uuid')
  @Index()
  userId: string;

  /**
   * ID del elemento de tienda comprado
   * Referencia al artículo adquirido
   */
  @Column('uuid')
  @Index()
  storeItemId: string;

  /**
   * Estado actual de la compra
   * Seguimiento del ciclo de vida de la transacción
   */
  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.PENDING
  })
  purchaseStatus: PurchaseStatus;

  /**
   * Método de pago utilizado
   * Cómo se adquirió el elemento
   */
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.COINS
  })
  paymentMethod: PaymentMethod;

  /**
   * Precio pagado en el momento de la compra
   * Registro histórico del costo real
   */
  @Column({ type: 'int' })
  pricePaid: number;

  /**
   * Precio original del elemento en el momento de compra
   * Para calcular descuentos aplicados
   */
  @Column({ type: 'int' })
  originalPriceAtPurchase: number;

  /**
   * Descuento aplicado en porcentaje
   * Registro del descuento obtenido
   */
  @Column({ type: 'int', default: 0 })
  discountApplied: number;

  /**
   * Cantidad comprada del elemento
   * Número de unidades adquiridas (normalmente 1)
   */
  @Column({ type: 'int', default: 1 })
  quantity: number;

  /**
   * Indica si el elemento está equipado/activo
   * Para elementos que se pueden usar en el perfil
   */
  @Column({ type: 'boolean', default: false })
  isEquipped: boolean;

  /**
   * Fecha en que se equipó el elemento
   * Registro de uso del artículo cosmético
   */
  @Column({ type: 'timestamp', nullable: true })
  equippedAt: Date;

  /**
   * Datos adicionales de la compra
   * Información extra como promociones aplicadas, etc.
   */
  @Column({ type: 'json', nullable: true })
  purchaseData: Record<string, any>;

  /**
   * ID de la transacción (para auditoria)
   * Referencia única de la transacción financiera
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId: string;

  /**
   * Notas adicionales sobre la compra
   * Comentarios o información extra
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * Indica si la compra fue un regalo
   * Para sistema de regalos entre usuarios
   */
  @Column({ type: 'boolean', default: false })
  isGift: boolean;

  /**
   * ID del usuario que regaló el elemento
   * Solo si isGift es true
   */
  @Column({ type: 'uuid', nullable: true })
  giftFromUserId: string;

  /**
   * Mensaje del regalo
   * Texto personalizado del remitente
   */
  @Column({ type: 'text', nullable: true })
  giftMessage: string;

  /**
   * Fecha de vencimiento del elemento
   * Para elementos temporales (null = permanente)
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  /**
   * Fecha de creación de la compra
   * Momento de la transacción
   */
  @CreateDateColumn()
  createdAt: Date;

  // =====================================
  // RELACIONES CON OTRAS ENTIDADES
  // =====================================

  /**
   * Relación con el usuario comprador
   * Permite acceso a información del propietario
   */
  @ManyToOne(() => User, user => user.purchases, { 
    eager: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Relación con el elemento de tienda
   * Permite acceso a información del artículo
   */
  @ManyToOne(() => StoreItem, item => item.purchases, { 
    eager: false,
    onDelete: 'RESTRICT' // No permitir eliminar elementos que han sido comprados
  })
  @JoinColumn({ name: 'storeItemId' })
  storeItem: StoreItem;

  /**
   * Relación con el usuario que regaló (si aplica)
   * Para sistema de regalos
   */
  @ManyToOne(() => User, { 
    eager: false,
    nullable: true
  })
  @JoinColumn({ name: 'giftFromUserId' })
  giftFromUser: User;

  // =====================================
  // MÉTODOS DE NEGOCIO
  // =====================================

  /**
   * Verifica si la compra fue exitosa
   * @returns {boolean} True si está completada
   */
  isSuccessful(): boolean {
    return this.purchaseStatus === PurchaseStatus.COMPLETED;
  }

  /**
   * Verifica si la compra está pendiente
   * @returns {boolean} True si está pendiente
   */
  isPending(): boolean {
    return this.purchaseStatus === PurchaseStatus.PENDING;
  }

  /**
   * Verifica si la compra fue reembolsada
   * @returns {boolean} True si fue reembolsada
   */
  isRefunded(): boolean {
    return this.purchaseStatus === PurchaseStatus.REFUNDED;
  }

  /**
   * Verifica si el elemento puede ser equipado
   * Solo elementos exitosamente comprados y no expirados
   * @returns {boolean} True si puede equiparse
   */
  canBeEquipped(): boolean {
    if (!this.isSuccessful()) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    
    return true;
  }

  /**
   * Verifica si el elemento ha expirado
   * Para elementos temporales
   * @returns {boolean} True si ha expirado
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Equipa el elemento cosmético
   * Marca como equipado y actualiza fecha
   */
  equip(): void {
    if (!this.canBeEquipped()) {
      throw new Error('El elemento no puede ser equipado en este momento');
    }
    
    this.isEquipped = true;
    this.equippedAt = new Date();
  }

  /**
   * Desequipa el elemento cosmético
   * Marca como no equipado
   */
  unequip(): void {
    this.isEquipped = false;
    this.equippedAt = null;
  }

  /**
   * Marca la compra como completada
   * Finaliza la transacción exitosamente
   * @param {string} transactionId - ID de la transacción
   */
  markAsCompleted(transactionId?: string): void {
    this.purchaseStatus = PurchaseStatus.COMPLETED;
    if (transactionId) {
      this.transactionId = transactionId;
    }
  }

  /**
   * Marca la compra como fallida
   * Registra el fallo de la transacción
   * @param {string} reason - Motivo del fallo
   */
  markAsFailed(reason?: string): void {
    this.purchaseStatus = PurchaseStatus.FAILED;
    if (reason) {
      this.notes = reason;
    }
  }

  /**
   * Procesa un reembolso de la compra
   * Cambia estado y registra información del reembolso
   * @param {string} reason - Motivo del reembolso
   */
  processRefund(reason?: string): void {
    if (!this.isSuccessful()) {
      throw new Error('Solo se pueden reembolsar compras completadas');
    }
    
    this.purchaseStatus = PurchaseStatus.REFUNDED;
    this.isEquipped = false;
    this.equippedAt = null;
    
    if (reason) {
      this.notes = `Reembolsado: ${reason}`;
    }
  }

  /**
   * Calcula el ahorro obtenido en la compra
   * Diferencia entre precio original y pagado
   * @returns {number} Cantidad ahorrada
   */
  getSavingsAmount(): number {
    return Math.max(0, this.originalPriceAtPurchase - this.pricePaid);
  }

  /**
   * Obtiene el porcentaje de descuento real aplicado
   * Calcula basado en precios reales
   * @returns {number} Porcentaje de descuento
   */
  getActualDiscountPercentage(): number {
    if (this.originalPriceAtPurchase <= 0) return 0;
    
    const savings = this.getSavingsAmount();
    return Math.round((savings / this.originalPriceAtPurchase) * 100);
  }

  /**
   * Verifica si fue pagado con monedas
   * @returns {boolean} True si se pagó con monedas
   */
  wasPaidWithCoins(): boolean {
    return this.paymentMethod === PaymentMethod.COINS;
  }

  /**
   * Verifica si fue obtenido por logro
   * @returns {boolean} True si fue por achievement
   */
  wasEarnedThroughAchievement(): boolean {
    return this.paymentMethod === PaymentMethod.ACHIEVEMENT;
  }

  /**
   * Verifica si fue recibido como regalo
   * @returns {boolean} True si fue un regalo
   */
  wasReceivedasGift(): boolean {
    return this.isGift && this.paymentMethod === PaymentMethod.GIFT;
  }

  /**
   * Obtiene el tiempo restante antes de expirar
   * Para elementos temporales
   * @returns {number|null} Milisegundos restantes o null si es permanente
   */
  getTimeUntilExpiration(): number | null {
    if (!this.expiresAt) return null;
    
    const now = new Date();
    const remaining = this.expiresAt.getTime() - now.getTime();
    
    return Math.max(0, remaining);
  }

  /**
   * Extiende la duración del elemento
   * Para elementos temporales que pueden renovarse
   * @param {number} additionalDays - Días adicionales a agregar
   */
  extendDuration(additionalDays: number): void {
    if (additionalDays <= 0) return;
    
    const millisecondsToAdd = additionalDays * 24 * 60 * 60 * 1000;
    
    if (this.expiresAt) {
      this.expiresAt = new Date(this.expiresAt.getTime() + millisecondsToAdd);
    } else {
      this.expiresAt = new Date(Date.now() + millisecondsToAdd);
    }
  }

  /**
   * Obtiene información resumida de la compra
   * Para APIs y respuestas estructuradas
   * @returns {object} Resumen de la compra
   */
  getPurchaseSummary(): {
    id: string;
    itemName: string;
    status: PurchaseStatus;
    paymentMethod: PaymentMethod;
    pricePaid: number;
    savings: number;
    isEquipped: boolean;
    isExpired: boolean;
    purchaseDate: Date;
    isGift: boolean;
  } {
    return {
      id: this.id,
      itemName: this.storeItem?.name || 'Elemento desconocido',
      status: this.purchaseStatus,
      paymentMethod: this.paymentMethod,
      pricePaid: this.pricePaid,
      savings: this.getSavingsAmount(),
      isEquipped: this.isEquipped,
      isExpired: this.isExpired(),
      purchaseDate: this.createdAt,
      isGift: this.isGift
    };
  }

  /**
   * Valida que los datos de la compra sean coherentes
   * Verificaciones de integridad de datos
   * @returns {boolean} True si los datos son válidos
   */
  validateData(): boolean {
    // Precio pagado debe ser positivo
    if (this.pricePaid < 0) return false;
    
    // Precio original debe ser positivo
    if (this.originalPriceAtPurchase < 0) return false;
    
    // Cantidad debe ser positiva
    if (this.quantity <= 0) return false;
    
    // Descuento no puede ser mayor a 100%
    if (this.discountApplied > 100) return false;
    
    // Si es regalo, debe tener remitente
    if (this.isGift && !this.giftFromUserId) return false;
    
    // Elementos expirados no pueden estar equipados
    if (this.isExpired() && this.isEquipped) return false;
    
    return true;
  }
}