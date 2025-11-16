/**
 * 🎯 ENTIDAD GAME SESSION - SESIONES DE JUEGO MULTIJUGADOR
 * 
 * Entidad que gestiona sesiones multijugador, torneos y competencias en tiempo real.
 * Coordina múltiples jugadores en un mismo juego con sincronización.
 * 
 * FUNCIONALIDADES:
 * - Sesiones multijugador en tiempo real
 * - Torneos y competencias
 * - Chat integrado durante el juego
 * - Ranking en vivo
 * - Sincronización de estado
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

/**
 * 📋 Enumeraciones para tipado fuerte
 */
export enum SessionStatus {
  WAITING = 'waiting',           // Esperando jugadores
  STARTING = 'starting',         // Iniciando (countdown)
  IN_PROGRESS = 'in_progress',   // En progreso
  PAUSED = 'paused',            // Pausada
  FINISHED = 'finished',         // Terminada
  CANCELLED = 'cancelled',       // Cancelada
  ERROR = 'error',              // Error técnico
}

export enum SessionType {
  CASUAL = 'casual',             // Partida casual
  RANKED = 'ranked',             // Partida clasificatoria
  TOURNAMENT = 'tournament',     // Torneo
  CLASSROOM = 'classroom',       // Actividad de clase
  PRACTICE = 'practice',         // Práctica guiada
  CHALLENGE = 'challenge',       // Desafío especial
}

export enum JoinMode {
  OPEN = 'open',                 // Cualquiera puede unirse
  INVITE_ONLY = 'invite_only',   // Solo por invitación
  CODE_REQUIRED = 'code_required', // Requiere código
  CLASSROOM_ONLY = 'classroom_only', // Solo miembros del aula
}

/**
 * 👤 Información de participante
 */
export interface Participant {
  userId: string;
  username: string;
  avatar?: string;
  role: 'host' | 'player' | 'observer';
  joinedAt: Date;
  status: 'connected' | 'disconnected' | 'playing' | 'finished';
  score?: number;
  progress?: number;
  position?: number;
  ready: boolean;
}

/**
 * ⚙️ Configuración de sesión
 */
export interface SessionConfig {
  maxPlayers: number;
  minPlayers: number;
  waitTime: number;              // Tiempo de espera en segundos
  gameTime: number;              // Tiempo de juego en segundos
  allowLateJoin: boolean;
  allowObservers: boolean;
  allowChat: boolean;
  allowPause: boolean;
  showLeaderboard: boolean;
  syncQuestions: boolean;        // Preguntas sincronizadas
  allowReconnect: boolean;
  reconnectTimeLimit: number;
}

/**
 * 📊 Estado de la sesión en tiempo real
 */
export interface SessionState {
  currentQuestion?: number;
  totalQuestions: number;
  timeRemaining: number;
  isPaused: boolean;
  leaderboard: {
    userId: string;
    username: string;
    score: number;
    position: number;
    progress: number;
  }[];
  activeParticipants: number;
  totalParticipants: number;
}

/**
 * 💬 Mensaje de chat de sesión
 */
export interface SessionMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  type: 'text' | 'system' | 'emoji' | 'reaction';
  timestamp: Date;
  private?: boolean;
  targetUserId?: string;
}

/**
 * 🎯 Entidad GameSession
 * 
 * Gestiona sesiones multijugador con sincronización en tiempo real.
 */
@Entity('game_sessions')
@Index(['gameId', 'status'])
@Index(['hostId', 'status'])
@Index(['classroomId', 'status'])
@Index(['type', 'status'])
@Index(['joinCode'])
export class GameSession {
  /**
   * 🔑 Identificador único de la sesión
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 🎮 ID del juego base
   */
  @Column({ type: 'uuid' })
  @Index()
  gameId: string;

  /**
   * 👤 ID del anfitrión/host
   */
  @Column({ type: 'uuid' })
  @Index()
  hostId: string;

  /**
   * 🏫 ID del aula (opcional)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  classroomId: string;

  /**
   * 📊 Estado de la sesión
   */
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.WAITING,
  })
  status: SessionStatus;

  /**
   * 🎯 Tipo de sesión
   */
  @Column({
    type: 'enum',
    enum: SessionType,
    default: SessionType.CASUAL,
  })
  type: SessionType;

  /**
   * 🚪 Modo de acceso
   */
  @Column({
    type: 'enum',
    enum: JoinMode,
    default: JoinMode.OPEN,
  })
  joinMode: JoinMode;

  /**
   * 🔐 Código de acceso (si es requerido)
   */
  @Column({ type: 'varchar', length: 10, nullable: true, unique: true })
  joinCode: string;

  /**
   * 🏷️ Nombre de la sesión
   */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /**
   * 📄 Descripción de la sesión
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 👥 Lista de participantes
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  participants: Participant[];

  /**
   * ⚙️ Configuración de la sesión
   */
  @Column({
    type: 'jsonb',
    default: {
      maxPlayers: 10,
      minPlayers: 2,
      waitTime: 30,
      gameTime: 300,
      allowLateJoin: false,
      allowObservers: true,
      allowChat: true,
      allowPause: false,
      showLeaderboard: true,
      syncQuestions: true,
      allowReconnect: true,
      reconnectTimeLimit: 120,
    },
  })
  config: SessionConfig;

  /**
   * 📊 Estado actual de la sesión
   */
  @Column({
    type: 'jsonb',
    default: {
      currentQuestion: 0,
      totalQuestions: 0,
      timeRemaining: 0,
      isPaused: false,
      leaderboard: [],
      activeParticipants: 0,
      totalParticipants: 0,
    },
  })
  state: SessionState;

  /**
   * 💬 Mensajes de chat de la sesión
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  messages: SessionMessage[];

  /**
   * 🎮 Datos específicos del juego
   */
  @Column({
    type: 'jsonb',
    default: {},
  })
  gameData: any;

  /**
   * 📊 Estadísticas de la sesión
   */
  @Column({
    type: 'jsonb',
    default: {
      totalJoins: 0,
      totalLeaves: 0,
      averageScore: 0,
      highestScore: 0,
      totalMessages: 0,
      averageTime: 0,
    },
  })
  stats: any;

  /**
   * 🏆 Configuración de premios
   */
  @Column({
    type: 'jsonb',
    default: {
      winnerReward: 100,
      participationReward: 25,
      experienceMultiplier: 1.5,
      specialBadges: [],
    },
  })
  rewards: any;

  /**
   * ⏰ Hora programada de inicio
   */
  @Column({ type: 'timestamp', nullable: true })
  scheduledStartAt: Date;

  /**
   * 🚀 Hora real de inicio
   */
  @Column({ type: 'timestamp', nullable: true })
  actualStartAt: Date;

  /**
   * 🏁 Hora de finalización
   */
  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date;

  /**
   * ⏱️ Duración total (segundos)
   */
  @Column({ type: 'integer', nullable: true })
  duration: number;

  /**
   * 🔄 Número de reconexiones totales
   */
  @Column({ type: 'integer', default: 0 })
  reconnections: number;

  /**
   * ❌ Número de abandonos
   */
  @Column({ type: 'integer', default: 0 })
  abandonments: number;

  /**
   * 📊 Tasa de finalización
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate: number;

  /**
   * 🌟 Calificación promedio de la sesión
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  /**
   * 🏷️ Etiquetas de la sesión
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  tags: string[];

  /**
   * 🌍 Sesión pública
   */
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  /**
   * 📱 Plataforma principal utilizada
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  primaryPlatform: string;

  /**
   * 📅 Fecha de creación
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * 🔄 Fecha de última actualización
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // =============================================================================
  // RELACIONES
  // =============================================================================

  /**
   * 🎮 Relación con el juego
   */
  @ManyToOne('Game', (game: any) => game.sessions)
  @JoinColumn({ name: 'gameId' })
  game: any;

  /**
   * 🏆 Resultados de la sesión
   */
  @OneToMany('GameResult', (result: any) => result.multiplayerSessionId)
  results: any[];

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 👤 Agregar participante a la sesión
   */
  addParticipant(userId: string, username: string, avatar?: string, role: 'host' | 'player' | 'observer' = 'player'): boolean {
    // Verificar si ya está en la sesión
    const existingParticipant = this.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      existingParticipant.status = 'connected';
      existingParticipant.ready = false;
      return true;
    }

    // Verificar límites
    const playerCount = this.participants.filter(p => p.role === 'player').length;
    if (role === 'player' && playerCount >= this.config.maxPlayers) {
      return false;
    }

    // Agregar participante
    const participant: Participant = {
      userId,
      username,
      avatar,
      role,
      joinedAt: new Date(),
      status: 'connected',
      ready: false,
    };

    this.participants.push(participant);
    this.stats.totalJoins++;
    this.state.totalParticipants = this.participants.length;
    this.state.activeParticipants = this.participants.filter(p => p.status === 'connected').length;

    return true;
  }

  /**
   * 🚪 Remover participante de la sesión
   */
  removeParticipant(userId: string): boolean {
    const participantIndex = this.participants.findIndex(p => p.userId === userId);
    if (participantIndex === -1) {
      return false;
    }

    const participant = this.participants[participantIndex];
    
    // Si es el host, transferir a otro participante
    if (participant.role === 'host' && this.participants.length > 1) {
      const newHost = this.participants.find(p => p.userId !== userId && p.role === 'player');
      if (newHost) {
        newHost.role = 'host';
        // Agregar mensaje del sistema
        this.addSystemMessage(`${newHost.username} es ahora el anfitrión`);
      }
    }

    this.participants.splice(participantIndex, 1);
    this.stats.totalLeaves++;
    this.state.totalParticipants = this.participants.length;
    this.state.activeParticipants = this.participants.filter(p => p.status === 'connected').length;

    // Si no quedan jugadores, cancelar sesión
    if (this.participants.filter(p => p.role === 'player').length === 0) {
      this.status = SessionStatus.CANCELLED;
    }

    return true;
  }

  /**
   * ✅ Marcar participante como listo
   */
  setParticipantReady(userId: string, ready: boolean): boolean {
    const participant = this.participants.find(p => p.userId === userId);
    if (!participant) {
      return false;
    }

    participant.ready = ready;

    // Verificar si todos están listos para iniciar
    if (this.canStart()) {
      this.addSystemMessage('¡Todos los jugadores están listos! Iniciando...');
    }

    return true;
  }

  /**
   * 🎯 Verificar si la sesión puede iniciarse
   */
  canStart(): boolean {
    const players = this.participants.filter(p => p.role === 'player');
    return players.length >= this.config.minPlayers &&
           players.every(p => p.ready) &&
           this.status === SessionStatus.WAITING;
  }

  /**
   * 🚀 Iniciar la sesión
   */
  start(): boolean {
    if (!this.canStart()) {
      return false;
    }

    this.status = SessionStatus.IN_PROGRESS;
    this.actualStartAt = new Date();
    this.state.timeRemaining = this.config.gameTime;
    this.addSystemMessage('¡El juego ha comenzado!');

    return true;
  }

  /**
   * ⏸️ Pausar la sesión
   */
  pause(): boolean {
    if (this.status !== SessionStatus.IN_PROGRESS || !this.config.allowPause) {
      return false;
    }

    this.status = SessionStatus.PAUSED;
    this.state.isPaused = true;
    this.addSystemMessage('Juego pausado');

    return true;
  }

  /**
   * ▶️ Reanudar la sesión
   */
  resume(): boolean {
    if (this.status !== SessionStatus.PAUSED) {
      return false;
    }

    this.status = SessionStatus.IN_PROGRESS;
    this.state.isPaused = false;
    this.addSystemMessage('Juego reanudado');

    return true;
  }

  /**
   * 🏁 Finalizar la sesión
   */
  finish(): boolean {
    if (this.status !== SessionStatus.IN_PROGRESS) {
      return false;
    }

    this.status = SessionStatus.FINISHED;
    this.finishedAt = new Date();
    
    if (this.actualStartAt) {
      this.duration = Math.floor((this.finishedAt.getTime() - this.actualStartAt.getTime()) / 1000);
    }

    // Calcular tasa de finalización
    const playersWhoFinished = this.participants.filter(p => p.status === 'finished').length;
    const totalPlayers = this.participants.filter(p => p.role === 'player').length;
    this.completionRate = totalPlayers > 0 ? (playersWhoFinished / totalPlayers) * 100 : 0;

    this.addSystemMessage('¡Juego terminado! Calculando resultados...');

    return true;
  }

  /**
   * 💬 Agregar mensaje al chat
   */
  addMessage(userId: string, message: string, type: 'text' | 'emoji' | 'reaction' = 'text'): boolean {
    if (!this.config.allowChat) {
      return false;
    }

    const participant = this.participants.find(p => p.userId === userId);
    if (!participant) {
      return false;
    }

    const chatMessage: SessionMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username: participant.username,
      message,
      type,
      timestamp: new Date(),
    };

    this.messages.push(chatMessage);
    this.stats.totalMessages++;

    // Limitar a últimos 100 mensajes
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }

    return true;
  }

  /**
   * 🤖 Agregar mensaje del sistema
   */
  addSystemMessage(message: string): void {
    const systemMessage: SessionMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'system',
      username: 'Sistema',
      message,
      type: 'system',
      timestamp: new Date(),
    };

    this.messages.push(systemMessage);
  }

  /**
   * 🏆 Actualizar leaderboard
   */
  updateLeaderboard(): void {
    const players = this.participants
      .filter(p => p.role === 'player' && p.score !== undefined)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((p, index) => ({
        userId: p.userId,
        username: p.username,
        score: p.score || 0,
        position: index + 1,
        progress: p.progress || 0,
      }));

    this.state.leaderboard = players;
  }

  /**
   * 🔄 Actualizar progreso de participante
   */
  updateParticipantProgress(userId: string, score: number, progress: number): boolean {
    const participant = this.participants.find(p => p.userId === userId);
    if (!participant) {
      return false;
    }

    participant.score = score;
    participant.progress = progress;

    // Actualizar leaderboard
    this.updateLeaderboard();

    return true;
  }

  /**
   * 🎯 Generar código único de acceso
   */
  generateJoinCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    this.joinCode = code;
    return code;
  }

  /**
   * ✨ Serialización para API
   */
  toJSON() {
    return {
      id: this.id,
      gameId: this.gameId,
      hostId: this.hostId,
      classroomId: this.classroomId,
      status: this.status,
      type: this.type,
      joinMode: this.joinMode,
      joinCode: this.joinCode,
      name: this.name,
      description: this.description,
      participants: this.participants,
      config: this.config,
      state: this.state,
      messages: this.messages.slice(-20), // Solo últimos 20 mensajes
      gameData: this.gameData,
      stats: this.stats,
      rewards: this.rewards,
      scheduledStartAt: this.scheduledStartAt,
      actualStartAt: this.actualStartAt,
      finishedAt: this.finishedAt,
      duration: this.duration,
      reconnections: this.reconnections,
      abandonments: this.abandonments,
      completionRate: this.completionRate,
      averageRating: this.averageRating,
      tags: this.tags,
      isPublic: this.isPublic,
      primaryPlatform: this.primaryPlatform,
      canStart: this.canStart(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}