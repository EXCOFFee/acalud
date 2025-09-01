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
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errorCode?: string;
  details?: Record<string, any>;
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
  details?: Record<string, any>;
}

/**
 * Contrato para servicios de aulas
 */
export interface IClassroomService {
  create(createDto: any, teacherId: string): Promise<OperationResult<any>>;
  findAll(options: FindClassroomsOptions): Promise<PaginatedResponse<any>>;
  findById(id: string): Promise<OperationResult<any>>;
  findByInviteCode(inviteCode: string): Promise<OperationResult<any>>;
  update(id: string, updateDto: any, userId: string): Promise<OperationResult<any>>;
  remove(id: string, userId: string): Promise<OperationResult<void>>;
  joinClassroom(joinDto: any, studentId: string): Promise<OperationResult<any>>;
  leaveClassroom(classroomId: string, studentId: string): Promise<OperationResult<void>>;
  getTeacherClassrooms(teacherId: string): Promise<OperationResult<any[]>>;
  getStudentClassrooms(studentId: string): Promise<OperationResult<any[]>>;
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
  create(createDto: any, creatorId: string): Promise<OperationResult<any>>;
  findAll(options: FindActivitiesOptions): Promise<PaginatedResponse<any>>;
  findById(id: string, userId: string): Promise<OperationResult<any>>;
  update(id: string, updateDto: any, userId: string): Promise<OperationResult<any>>;
  remove(id: string, userId: string): Promise<OperationResult<void>>;
  completeActivity(activityId: string, studentId: string, answers: any[]): Promise<OperationResult<any>>;
  getActivityStats(activityId: string): Promise<OperationResult<ActivityStats>>;
  getClassroomActivities(classroomId: string, userId: string): Promise<OperationResult<any[]>>;
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
  findById(id: string): Promise<OperationResult<any>>;
  findByEmail(email: string): Promise<OperationResult<any>>;
  update(id: string, updateDto: any): Promise<OperationResult<any>>;
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
  getUserAchievements(userId: string): Promise<OperationResult<any[]>>;
  grantAchievement(userId: string, achievementId: string): Promise<OperationResult<any>>;
  checkAndGrantAchievements(userId: string, actionType: string, metadata?: any): Promise<OperationResult<any[]>>;
  getUserInventory(userId: string): Promise<OperationResult<any>>;
  purchaseItem(userId: string, purchaseDto: any): Promise<OperationResult<any>>;
  getGamificationStats(): Promise<OperationResult<any>>;
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
  value?: any;
}

/**
 * Advertencia de validación
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
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
  sendEmail(to: string, subject: string, template: string, data: any): Promise<OperationResult<void>>;
  sendInAppNotification(userId: string, title: string, message: string, type: string): Promise<OperationResult<void>>;
  getUserNotifications(userId: string, options: FindOptions): Promise<PaginatedResponse<any>>;
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
  log(message: string, context?: string, meta?: any): void;
  error(message: string, trace?: string, context?: string, meta?: any): void;
  warn(message: string, context?: string, meta?: any): void;
  debug(message: string, context?: string, meta?: any): void;
  verbose(message: string, context?: string, meta?: any): void;
}
