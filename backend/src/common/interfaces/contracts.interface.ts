/**
 * Interfaz para contratos de servicios
 * Implementa el principio de Inversión de Dependencias (SOLID)
 */

// Tipos base para evitar dependencias circulares
export type EntityId = string;
export type UserRole = 'teacher' | 'student' | 'admin';

/**
 * Opciones para filtrado y paginación
 */
export interface FindOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Respuesta paginada estándar
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Resultado de operaciones
 */
export interface OperationResult<T = unknown, D = Record<string, unknown>> {
  success: boolean;
  data?: T;
  message: string;
  errorCode?: string;
  details?: D;
}

/**
 * Interfaz para auditoría de operaciones
 */
export interface AuditInfo {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
}

/**
 * Contrato para servicios de aulas
 */
export interface IClassroomService {
  create(createDto: unknown, teacherId: string): Promise<OperationResult<unknown>>;
  findAll(options: FindClassroomsOptions): Promise<PaginatedResponse<unknown>>;
  findById(id: string): Promise<OperationResult<unknown>>;
  findByInviteCode(inviteCode: string): Promise<OperationResult<unknown>>;
  update(id: string, updateDto: unknown, userId: string): Promise<OperationResult<unknown>>;
  remove(id: string, userId: string): Promise<OperationResult<void>>;
  joinClassroom(joinDto: unknown, studentId: string): Promise<OperationResult<unknown>>;
  leaveClassroom(classroomId: string, studentId: string): Promise<OperationResult<void>>;
  getTeacherClassrooms(teacherId: string): Promise<OperationResult<unknown[]>>;
  getStudentClassrooms(studentId: string): Promise<OperationResult<unknown[]>>;
  regenerateInviteCode(classroomId: string, userId: string): Promise<OperationResult<string>>;
  getClassroomStats(classroomId: string): Promise<OperationResult<ClassroomStats>>;
}

/**
 * Opciones específicas para búsqueda de aulas
 */
export interface FindClassroomsOptions extends FindOptions {
  subject?: string;
  grade?: string;
  teacherId?: string;
  isActive?: boolean;
}

/**
 * Estadísticas de aula
 */
export interface ClassroomStats {
  totalStudents: number;
  totalActivities: number;
  activeActivities: number;
  completedActivities: number;
  averageScore: number;
  lastActivity: Date;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Contrato para servicios de actividades
 */
export interface IActivityService {
  create(createDto: unknown, creatorId: string): Promise<OperationResult<unknown>>;
  findAll(options: FindActivitiesOptions): Promise<PaginatedResponse<unknown>>;
  findById(id: string, userId: string): Promise<OperationResult<unknown>>;
  update(id: string, updateDto: unknown, userId: string): Promise<OperationResult<unknown>>;
  remove(id: string, userId: string): Promise<OperationResult<void>>;
  completeActivity(activityId: string, studentId: string, answers: unknown[]): Promise<OperationResult<unknown>>;
  getActivityStats(activityId: string): Promise<OperationResult<ActivityStats>>;
  getClassroomActivities(classroomId: string, userId: string): Promise<OperationResult<unknown[]>>;
}

/**
 * Opciones para búsqueda de actividades
 */
export interface FindActivitiesOptions extends FindOptions {
  classroomId?: string;
  type?: string;
  difficulty?: string;
  isActive?: boolean;
  isPublic?: boolean;
}

/**
 * Estadísticas de actividad
 */
export interface ActivityStats {
  totalCompletions: number;
  averageScore: number;
  averageTimeSpent: number;
  completionRate: number;
  difficultyRating: number;
  lastCompleted: Date;
}

/**
 * Contrato para servicios de usuarios
 */
export interface IUserService {
  findById(id: string): Promise<OperationResult<unknown>>;
  findByEmail(email: string): Promise<OperationResult<unknown>>;
  update(id: string, updateDto: unknown): Promise<OperationResult<unknown>>;
  updatePassword(id: string, currentPassword: string, newPassword: string): Promise<OperationResult<void>>;
  getUserStats(id: string): Promise<OperationResult<UserStats>>;
  deactivateUser(id: string, adminId: string): Promise<OperationResult<void>>;
}

/**
 * Estadísticas de usuario
 */
export interface UserStats {
  totalActivitiesCompleted: number;
  totalScore: number;
  averageScore: number;
  totalTimeSpent: number;
  level: number;
  experience: number;
  coins: number;
  achievementsCount: number;
  classroomsCount: number;
  streakDays: number;
  lastActivity: Date;
}

/**
 * Contrato para servicios de gamificación
 */
export interface IGamificationService {
  getUserAchievements(userId: string): Promise<OperationResult<unknown[]>>;
  grantAchievement(userId: string, achievementId: string): Promise<OperationResult<unknown>>;
  checkAndGrantAchievements(userId: string, actionType: string, metadata?: Record<string, unknown>): Promise<OperationResult<unknown[]>>;
  getUserInventory(userId: string): Promise<OperationResult<unknown>>;
  purchaseItem(userId: string, purchaseDto: Record<string, unknown>): Promise<OperationResult<unknown>>;
  getGamificationStats(): Promise<OperationResult<Record<string, unknown>>>;
}

/**
 * Contrato para servicios de auditoría
 */
export interface IAuditService {
  logAction(auditInfo: AuditInfo): Promise<void>;
  getAuditLog(options: FindAuditOptions): Promise<PaginatedResponse<AuditInfo>>;
  getUserActions(userId: string, options: FindOptions): Promise<PaginatedResponse<AuditInfo>>;
}

/**
 * Opciones para búsqueda de auditoría
 */
export interface FindAuditOptions extends FindOptions {
  userId?: string;
  action?: string;
  resource?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Contrato para validadores
 */
export interface IValidator<T> {
  validate(data: T): Promise<ValidationResult>;
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * Error de validación
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Advertencia de validación
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Contrato para cache
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Contrato para notificaciones
 */
export interface INotificationService {
  sendEmail(to: string, subject: string, template: string, data: Record<string, unknown>): Promise<OperationResult<void>>;
  sendInAppNotification(userId: string, title: string, message: string, type: string): Promise<OperationResult<void>>;
  getUserNotifications(userId: string, options: FindOptions): Promise<PaginatedResponse<unknown>>;
  markAsRead(notificationId: string, userId: string): Promise<OperationResult<void>>;
}

/**
 * Contrato para manejo de archivos
 */
export interface IFileService {
  uploadFile(file: Express.Multer.File, folder: string): Promise<OperationResult<FileUploadResult>>;
  deleteFile(filePath: string): Promise<OperationResult<void>>;
  validateFile(file: Express.Multer.File): Promise<ValidationResult>;
  generateThumbnail(imagePath: string): Promise<OperationResult<string>>;
}

/**
 * Resultado de subida de archivo
 */
export interface FileUploadResult {
  originalName: string;
  fileName: string;
  path: string;
  size: number;
  mimeType: string;
  url: string;
}

/**
 * Contrato para servicios de configuración
 */
export interface IConfigService {
  get<T>(key: string): T;
  getOrThrow<T>(key: string): T;
  isDevelopment(): boolean;
  isProduction(): boolean;
  isTest(): boolean;
}

/**
 * Contrato para logging
 */
export interface ILoggerService {
  log(message: string, context?: string, meta?: Record<string, unknown>): void;
  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>): void;
  warn(message: string, context?: string, meta?: Record<string, unknown>): void;
  debug(message: string, context?: string, meta?: Record<string, unknown>): void;
  verbose(message: string, context?: string, meta?: Record<string, unknown>): void;
}
