/**
 * 💰 ENTIDAD DE MONEDAS VIRTUALES
 * 
 * Gestiona la economía virtual del sistema educativo.
 * Los estudiantes ganan monedas por actividades académicas y
 * las pueden usar para comprar items en la tienda.
 * 
 * FUNCIONALIDADES:
 * - Múltiples tipos de monedas virtuales
 * - Historial de transacciones detallado
 * - Sistema de recompensas automáticas
 * - Límites y restricciones configurables
 * - Auditoría completa de movimientos
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

// Enums
export enum CurrencyType {
  COINS = 'coins',                  // Monedas principales
  GEMS = 'gems',                    // Gemas premium
  EXPERIENCE_POINTS = 'xp',         // Puntos de experiencia
  ACHIEVEMENT_TOKENS = 'tokens',    // Tokens de logros
  SEASONAL_CURRENCY = 'seasonal',   // Moneda temporal de eventos
  PREMIUM_CURRENCY = 'premium'      // Moneda premium comprada
}

export enum TransactionType {
  EARNED = 'earned',                // Ganado por actividad
  SPENT = 'spent',                  // Gastado en compras
  BONUS = 'bonus',                  // Bonus adicional
  REWARD = 'reward',                // Recompensa por logro
  PENALTY = 'penalty',              // Penalización
  TRANSFER = 'transfer',            // Transferencia entre usuarios
  REFUND = 'refund',                // Reembolso
  ADMIN_ADJUSTMENT = 'admin_adjustment', // Ajuste administrativo
  DAILY_BONUS = 'daily_bonus',      // Bonus diario
  EVENT_REWARD = 'event_reward',    // Recompensa de evento
  STREAK_BONUS = 'streak_bonus',    // Bonus por racha
  ACHIEVEMENT_UNLOCK = 'achievement_unlock' // Desbloqueo de logro
}

export enum TransactionStatus {
  PENDING = 'pending',              // Pendiente de procesar
  COMPLETED = 'completed',          // Completada exitosamente
  FAILED = 'failed',                // Falló el procesamiento
  CANCELLED = 'cancelled',          // Cancelada por usuario/admin
  REFUNDED = 'refunded'             // Reembolsada
}

export enum TransactionSource {
  QUIZ_COMPLETION = 'quiz_completion',
  ASSIGNMENT_SUBMISSION = 'assignment_submission',
  CLASS_PARTICIPATION = 'class_participation',
  PERFECT_SCORE = 'perfect_score',
  DAILY_LOGIN = 'daily_login',
  WEEKLY_GOAL = 'weekly_goal',
  MONTHLY_CHALLENGE = 'monthly_challenge',
  HELP_CLASSMATE = 'help_classmate',
  STORE_PURCHASE = 'store_purchase',
  GAME_VICTORY = 'game_victory',
  STREAK_ACHIEVEMENT = 'streak_achievement',
  LEVEL_UP = 'level_up',
  SPECIAL_EVENT = 'special_event',
  ADMIN_GRANT = 'admin_grant',
  REFERRAL_BONUS = 'referral_bonus'
}

/**
 * 💰 Entidad principal de balance de monedas por usuario
 */
@Entity('user_currency_balances')
@Index(['userId', 'currencyType'])
@Index(['updatedAt'])
export class UserCurrencyBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // =============================================================================
  // INFORMACIÓN BÁSICA
  // =============================================================================

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: CurrencyType,
    default: CurrencyType.COINS
  })
  @Index()
  currencyType: CurrencyType;

  @Column({ type: 'bigint', default: 0 })
  @Index()
  currentBalance: number;

  @Column({ type: 'bigint', default: 0 })
  totalEarned: number; // Total ganado históricamente

  @Column({ type: 'bigint', default: 0 })
  totalSpent: number; // Total gastado históricamente

  @Column({ type: 'bigint', default: 0 })
  lifetimeEarnings: number; // Ganancias de por vida

  // =============================================================================
  // LÍMITES Y RESTRICCIONES
  // =============================================================================

  @Column({ type: 'bigint', nullable: true })
  dailyEarnLimit: number; // Límite diario de ganancias

  @Column({ type: 'bigint', default: 0 })
  dailyEarned: number; // Ganado hoy

  @Column({ type: 'bigint', nullable: true })
  weeklyEarnLimit: number; // Límite semanal

  @Column({ type: 'bigint', default: 0 })
  weeklyEarned: number; // Ganado esta semana

  @Column({ type: 'bigint', nullable: true })
  maxBalance: number; // Balance máximo permitido

  @Column({ type: 'date', nullable: true })
  lastDailyReset: Date; // Última vez que se reinició el contador diario

  @Column({ type: 'date', nullable: true })
  lastWeeklyReset: Date; // Última vez que se reinició el contador semanal

  // =============================================================================
  // ESTADÍSTICAS Y MÉTRICAS
  // =============================================================================

  @Column({ type: 'int', default: 0 })
  consecutiveDaysEarning: number; // Días consecutivos ganando monedas

  @Column({ type: 'int', default: 0 })
  bestStreak: number; // Mejor racha de días consecutivos

  @Column({ type: 'date', nullable: true })
  lastEarnedDate: Date; // Última fecha que ganó monedas

  @Column({ type: 'date', nullable: true })
  lastSpentDate: Date; // Última fecha que gastó monedas

  @Column({ type: 'int', default: 0 })
  transactionCount: number; // Número total de transacciones

  @Column({ type: 'jsonb', nullable: true })
  monthlyStats: {
    [yearMonth: string]: {
      earned: number;
      spent: number;
      transactions: number;
      averageDaily: number;
    };
  };

  // =============================================================================
  // CONFIGURACIÓN Y PREFERENCIAS
  // =============================================================================

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Si está activo para ganar/gastar

  @Column({ type: 'boolean', default: true })
  receiveNotifications: boolean; // Recibir notificaciones de transacciones

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    notifyOnEarn?: boolean;
    notifyOnSpend?: boolean;
    notifyOnMilestone?: boolean;
    autoSavePercentage?: number; // Porcentaje que se guarda automáticamente
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    campaign?: string;
    referralCode?: string;
    specialFlags?: string[];
  };

  // =============================================================================
  // TIMESTAMPS
  // =============================================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // =============================================================================
  // RELACIONES
  // =============================================================================

  @OneToMany(() => CurrencyTransaction, transaction => transaction.userBalance)
  transactions: CurrencyTransaction[];

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 💰 Añadir monedas al balance
   */
  async addCurrency(
    amount: number, 
    source: TransactionSource, 
    description?: string,
    metadata?: any
  ): Promise<CurrencyTransaction> {
    // Verificar límites diarios y semanales
    this.checkAndResetLimits();

    if (this.dailyEarnLimit && this.dailyEarned + amount > this.dailyEarnLimit) {
      throw new Error(`Límite diario excedido. Máximo: ${this.dailyEarnLimit}, actual: ${this.dailyEarned}`);
    }

    if (this.weeklyEarnLimit && this.weeklyEarned + amount > this.weeklyEarnLimit) {
      throw new Error(`Límite semanal excedido. Máximo: ${this.weeklyEarnLimit}, actual: ${this.weeklyEarned}`);
    }

    if (this.maxBalance && this.currentBalance + amount > this.maxBalance) {
      throw new Error(`Balance máximo excedido. Máximo: ${this.maxBalance}`);
    }

    // Actualizar balances
    this.currentBalance += amount;
    this.totalEarned += amount;
    this.lifetimeEarnings += amount;
    this.dailyEarned += amount;
    this.weeklyEarned += amount;

    // Actualizar racha
    this.updateEarningStreak();

    // Crear transacción
    const transaction = new CurrencyTransaction();
    transaction.userBalanceId = this.id;
    transaction.transactionType = TransactionType.EARNED;
    transaction.amount = amount;
    transaction.balanceAfter = this.currentBalance;
    transaction.source = source;
    transaction.description = description || `Ganado por ${source}`;
    transaction.metadata = metadata;
    transaction.status = TransactionStatus.COMPLETED;

    this.transactionCount++;
    this.lastEarnedDate = new Date();

    return transaction;
  }

  /**
   * 💸 Gastar monedas del balance
   */
  async spendCurrency(
    amount: number,
    description: string,
    metadata?: any
  ): Promise<CurrencyTransaction> {
    if (this.currentBalance < amount) {
      throw new Error(`Balance insuficiente. Disponible: ${this.currentBalance}, requerido: ${amount}`);
    }

    // Actualizar balances
    this.currentBalance -= amount;
    this.totalSpent += amount;

    // Crear transacción
    const transaction = new CurrencyTransaction();
    transaction.userBalanceId = this.id;
    transaction.transactionType = TransactionType.SPENT;
    transaction.amount = amount;
    transaction.balanceAfter = this.currentBalance;
    transaction.source = TransactionSource.STORE_PURCHASE;
    transaction.description = description;
    transaction.metadata = metadata;
    transaction.status = TransactionStatus.COMPLETED;

    this.transactionCount++;
    this.lastSpentDate = new Date();

    return transaction;
  }

  /**
   * 🎁 Otorgar bonus especial
   */
  async grantBonus(
    amount: number,
    reason: string,
    source: TransactionSource = TransactionSource.ADMIN_GRANT,
    metadata?: any
  ): Promise<CurrencyTransaction> {
    this.currentBalance += amount;
    this.totalEarned += amount;
    this.lifetimeEarnings += amount;

    const transaction = new CurrencyTransaction();
    transaction.userBalanceId = this.id;
    transaction.transactionType = TransactionType.BONUS;
    transaction.amount = amount;
    transaction.balanceAfter = this.currentBalance;
    transaction.source = source;
    transaction.description = reason;
    transaction.metadata = metadata;
    transaction.status = TransactionStatus.COMPLETED;

    this.transactionCount++;

    return transaction;
  }

  /**
   * 📅 Verificar y reiniciar límites diarios/semanales
   */
  private checkAndResetLimits(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Reiniciar contador diario
    if (!this.lastDailyReset || this.lastDailyReset < today) {
      this.dailyEarned = 0;
      this.lastDailyReset = today;
    }

    // Reiniciar contador semanal (lunes)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    
    if (!this.lastWeeklyReset || this.lastWeeklyReset < startOfWeek) {
      this.weeklyEarned = 0;
      this.lastWeeklyReset = startOfWeek;
    }
  }

  /**
   * 🔥 Actualizar racha de ganancias consecutivas
   */
  private updateEarningStreak(): void {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (!this.lastEarnedDate) {
      this.consecutiveDaysEarning = 1;
    } else if (this.isSameDay(this.lastEarnedDate, yesterday)) {
      this.consecutiveDaysEarning++;
    } else if (!this.isSameDay(this.lastEarnedDate, today)) {
      this.consecutiveDaysEarning = 1;
    }

    if (this.consecutiveDaysEarning > this.bestStreak) {
      this.bestStreak = this.consecutiveDaysEarning;
    }
  }

  /**
   * 📊 Calcular estadísticas del mes actual
   */
  updateMonthlyStats(): void {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!this.monthlyStats) {
      this.monthlyStats = {};
    }

    if (!this.monthlyStats[yearMonth]) {
      this.monthlyStats[yearMonth] = {
        earned: 0,
        spent: 0,
        transactions: 0,
        averageDaily: 0,
      };
    }

    // Las estadísticas se actualizarían desde las transacciones
  }

  /**
   * 📈 Obtener estadísticas de rendimiento
   */
  getPerformanceStats(): {
    currentStreak: number;
    bestStreak: number;
    averageDailyEarning: number;
    totalTransactions: number;
    savingsRate: number;
    efficiencyScore: number;
  } {
    const daysSinceCreation = Math.ceil(
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const averageDailyEarning = daysSinceCreation > 0 
      ? this.totalEarned / daysSinceCreation 
      : 0;

    const savingsRate = this.totalEarned > 0 
      ? ((this.totalEarned - this.totalSpent) / this.totalEarned) * 100 
      : 0;

    const efficiencyScore = this.calculateEfficiencyScore();

    return {
      currentStreak: this.consecutiveDaysEarning,
      bestStreak: this.bestStreak,
      averageDailyEarning,
      totalTransactions: this.transactionCount,
      savingsRate,
      efficiencyScore,
    };
  }

  /**
   * 📊 Calcular puntuación de eficiencia
   */
  private calculateEfficiencyScore(): number {
    let score = 0;

    // Puntos por racha actual
    score += Math.min(this.consecutiveDaysEarning * 2, 50);

    // Puntos por tasa de ahorro
    const savingsRate = this.totalEarned > 0 
      ? ((this.totalEarned - this.totalSpent) / this.totalEarned) * 100 
      : 0;
    score += Math.min(savingsRate, 30);

    // Puntos por consistencia (transacciones regulares)
    if (this.transactionCount > 10) score += 10;
    if (this.transactionCount > 50) score += 10;

    // Penalización por balance muy bajo
    if (this.currentBalance < this.totalEarned * 0.1) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 🗓️ Verificar si dos fechas son el mismo día
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * 💎 Obtener información de moneda formateada
   */
  getCurrencyInfo(): {
    type: string;
    symbol: string;
    name: string;
    color: string;
  } {
    const currencyInfo = {
      [CurrencyType.COINS]: {
        type: 'coins',
        symbol: '🪙',
        name: 'Monedas',
        color: '#FFD700',
      },
      [CurrencyType.GEMS]: {
        type: 'gems',
        symbol: '💎',
        name: 'Gemas',
        color: '#4169E1',
      },
      [CurrencyType.EXPERIENCE_POINTS]: {
        type: 'xp',
        symbol: '⭐',
        name: 'Experiencia',
        color: '#32CD32',
      },
      [CurrencyType.ACHIEVEMENT_TOKENS]: {
        type: 'tokens',
        symbol: '🏅',
        name: 'Tokens',
        color: '#FF4500',
      },
      [CurrencyType.SEASONAL_CURRENCY]: {
        type: 'seasonal',
        symbol: '🎃',
        name: 'Especial',
        color: '#8A2BE2',
      },
      [CurrencyType.PREMIUM_CURRENCY]: {
        type: 'premium',
        symbol: '💰',
        name: 'Premium',
        color: '#DC143C',
      },
    };

    return currencyInfo[this.currencyType] || currencyInfo[CurrencyType.COINS];
  }
}

/**
 * 📜 Entidad de transacciones de monedas
 */
@Entity('currency_transactions')
@Index(['userBalanceId', 'createdAt'])
@Index(['transactionType', 'createdAt'])
@Index(['source', 'createdAt'])
@Index(['status'])
export class CurrencyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userBalanceId: string;

  @Column()
  @Index()
  userId: string; // Desnormalizado para consultas rápidas

  @Column({
    type: 'enum',
    enum: TransactionType
  })
  @Index()
  transactionType: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionSource
  })
  @Index()
  source: TransactionSource;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'bigint' })
  balanceAfter: number; // Balance después de la transacción

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING
  })
  status: TransactionStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    relatedEntityId?: string;
    relatedEntityType?: string;
    campaignId?: string;
    eventId?: string;
    bonusMultiplier?: number;
    originalAmount?: number;
    processingTime?: number;
    ipAddress?: string;
    userAgent?: string;
    adminUserId?: string;
    reason?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId: string; // ID de referencia externa

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // =============================================================================
  // RELACIONES
  // =============================================================================

  @ManyToOne(() => UserCurrencyBalance, balance => balance.transactions)
  @JoinColumn({ name: 'userBalanceId' })
  userBalance: UserCurrencyBalance;

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * ✅ Marcar transacción como completada
   */
  markAsCompleted(): void {
    this.status = TransactionStatus.COMPLETED;
    this.processedAt = new Date();
  }

  /**
   * ❌ Marcar transacción como fallida
   */
  markAsFailed(reason?: string): void {
    this.status = TransactionStatus.FAILED;
    this.processedAt = new Date();
    
    if (reason) {
      this.metadata = { ...this.metadata, reason };
    }
  }

  /**
   * 🔄 Obtener información de display
   */
  getDisplayInfo(): {
    icon: string;
    color: string;
    title: string;
    description: string;
    isPositive: boolean;
  } {
    const isPositive = [
      TransactionType.EARNED,
      TransactionType.BONUS,
      TransactionType.REWARD,
      TransactionType.REFUND,
      TransactionType.DAILY_BONUS,
      TransactionType.EVENT_REWARD,
      TransactionType.STREAK_BONUS,
      TransactionType.ACHIEVEMENT_UNLOCK
    ].includes(this.transactionType);

    const typeInfo = {
      [TransactionType.EARNED]: { icon: '💰', title: 'Ganado', color: '#22C55E' },
      [TransactionType.SPENT]: { icon: '🛒', title: 'Gastado', color: '#EF4444' },
      [TransactionType.BONUS]: { icon: '🎁', title: 'Bonus', color: '#8B5CF6' },
      [TransactionType.REWARD]: { icon: '🏆', title: 'Recompensa', color: '#F59E0B' },
      [TransactionType.PENALTY]: { icon: '⚠️', title: 'Penalización', color: '#DC2626' },
      [TransactionType.TRANSFER]: { icon: '↔️', title: 'Transferencia', color: '#6B7280' },
      [TransactionType.REFUND]: { icon: '↩️', title: 'Reembolso', color: '#10B981' },
      [TransactionType.ADMIN_ADJUSTMENT]: { icon: '⚙️', title: 'Ajuste', color: '#6366F1' },
      [TransactionType.DAILY_BONUS]: { icon: '📅', title: 'Bonus Diario', color: '#06B6D4' },
      [TransactionType.EVENT_REWARD]: { icon: '🎉', title: 'Evento', color: '#EC4899' },
      [TransactionType.STREAK_BONUS]: { icon: '🔥', title: 'Racha', color: '#F97316' },
      [TransactionType.ACHIEVEMENT_UNLOCK]: { icon: '🏅', title: 'Logro', color: '#84CC16' },
    };

    const info = typeInfo[this.transactionType] || typeInfo[TransactionType.EARNED];

    return {
      ...info,
      description: this.description,
      isPositive,
    };
  }

  /**
   * 📊 Formatear cantidad para display
   */
  getFormattedAmount(): string {
    const sign = this.transactionType === TransactionType.SPENT || 
                 this.transactionType === TransactionType.PENALTY ? '-' : '+';
    
    return `${sign}${this.amount.toLocaleString()}`;
  }
}