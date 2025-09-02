/**
 * ✅ INTERFACES REFACTORIZADAS - SIGUIENDO PRINCIPIOS SOLID
 * 
 * PRINCIPIO DE SEGREGACIÓN DE INTERFACES (ISP):
 * - Cada interface tiene una responsabilidad específica
 * - No hay métodos que los implementadores no necesiten
 * 
 * PRINCIPIO DE INVERSIÓN DE DEPENDENCIAS (DIP):
 * - Los servicios dependen de estas abstracciones
 * - No dependen de implementaciones concretas
 */

// ============================================================================
// 📊 REPOSITORIO DE AULAS (ACCESO A DATOS)
// ============================================================================
export interface IClassroomRepository {
  create(classroomData: CreateClassroomData): Promise<Classroom>;
  findById(id: string): Promise<Classroom | null>;
  findByInviteCode(code: string): Promise<Classroom | null>;
  findWithFilters(filters: ClassroomFilters): Promise<PaginatedResult<Classroom>>;
  update(id: string, updateData: Partial<Classroom>): Promise<Classroom>;
  delete(id: string): Promise<void>;
  addStudent(classroomId: string, studentId: string): Promise<Classroom>;
  removeStudent(classroomId: string, studentId: string): Promise<Classroom>;
  getStudentCount(classroomId: string): Promise<number>;
}

// ============================================================================
// ✅ VALIDADOR DE AULAS (LÓGICA DE VALIDACIÓN)
// ============================================================================
export interface IClassroomValidator {
  validateCreateData(data: CreateClassroomDto): Promise<void>;
  validateUpdateData(data: UpdateClassroomDto): Promise<void>;
  validateJoinData(data: JoinClassroomDto): Promise<void>;
  validateFilters(filters: ClassroomFilters): Promise<void>;
  validateCanJoinSpecificClassroom(classroom: Classroom, studentId: string): Promise<void>;
  validateClassroomCapacity(classroomId: string): Promise<void>;
}

// ============================================================================
// 🎲 GENERADOR DE CÓDIGOS DE INVITACIÓN
// ============================================================================
export interface IInviteCodeGenerator {
  generateUniqueCode(): Promise<string>;
  validateCodeFormat(code: string): boolean;
  isCodeExpired(code: string, createdAt: Date): boolean;
}

// ============================================================================
// 🔐 VALIDADOR DE PERMISOS
// ============================================================================
export interface IPermissionValidator {
  validateCanCreateClassroom(userId: string): Promise<void>;
  validateCanModifyClassroom(classroomId: string, userId: string): Promise<void>;
  validateCanDeleteClassroom(classroomId: string, userId: string): Promise<void>;
  validateCanJoinClassroom(userId: string): Promise<void>;
  validateCanViewClassroom(classroomId: string, userId: string): Promise<void>;
}

// ============================================================================
// 🎯 SERVICIO PRINCIPAL DE AULAS
// ============================================================================
export interface IClassroomService {
  createClassroom(data: CreateClassroomDto, teacherId: string): Promise<Classroom>;
  findClassrooms(filters: ClassroomFilters): Promise<PaginatedResult<Classroom>>;
  findClassroomById(id: string): Promise<Classroom>;
  updateClassroom(id: string, data: UpdateClassroomDto, userId: string): Promise<Classroom>;
  deleteClassroom(id: string, userId: string): Promise<void>;
  joinClassroom(data: JoinClassroomDto, studentId: string): Promise<Classroom>;
  leaveClassroom(classroomId: string, studentId: string): Promise<void>;
  generateNewInviteCode(classroomId: string, userId: string): Promise<string>;
  getClassroomStats(classroomId: string): Promise<ClassroomStats>;
}

// ============================================================================
// 📋 TIPOS DE DATOS MEJORADOS
// ============================================================================

export interface CreateClassroomData {
  name: string;
  description: string;
  subject: string;
  grade: string;
  teacherId: string;
  inviteCode: string;
  color?: string;
  coverImage?: string;
  settings: Record<string, any>; // Cambiar para coincidir con la entidad
  isActive: boolean;
  createdAt: Date;
}

export interface ClassroomFilters {
  page: number;
  limit: number;
  search?: string;
  subject?: string;
  grade?: string;
  teacherId?: string;
  isActive?: boolean;
}

export interface PaginatedResult<T> {
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

export interface ClassroomSettings {
  allowStudentDiscussion: boolean;
  requireApprovalForJoin: boolean;
  maxStudents: number;
  timezone: string;
  language: string;
  notifications: {
    newStudent: boolean;
    activityCompleted: boolean;
    announcements: boolean;
  };
}

export interface ClassroomStats {
  totalStudents: number;
  totalActivities: number;
  activeActivities: number;
  averageCompletion: number;
  lastActivity: Date | null;
  createdAt: Date;
  isActive: boolean;
}

// ============================================================================
// 🎯 ENTIDAD DE AULA SIMPLIFICADA
// ============================================================================
export interface Classroom {
  id: string;
  name: string;
  description: string;
  subject: string;
  grade: string;
  inviteCode: string;
  color: string;
  coverImage?: string;
  settings: Record<string, any>; // Cambiar para coincidir con la entidad
  isActive: boolean;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relaciones (opcional - depende del contexto)
  teacher?: User;
  students?: User[];
  activities?: Activity[];
}

// ============================================================================
// 📝 DTOS SIMPLIFICADOS
// ============================================================================
export interface CreateClassroomDto {
  name: string;
  description: string;
  subject: string;
  grade: string;
  color?: string;
  coverImage?: string;
  settings?: Partial<ClassroomSettings>;
}

export interface UpdateClassroomDto {
  name?: string;
  description?: string;
  subject?: string;
  grade?: string;
  color?: string;
  coverImage?: string;
  settings?: Partial<ClassroomSettings>;
}

export interface JoinClassroomDto {
  inviteCode: string;
}

// ============================================================================
// 👤 ENTIDADES RELACIONADAS (REFERENCIAS)
// ============================================================================
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth?: Date;
  bio?: string;
  role: 'teacher' | 'student' | 'admin';
  avatar?: string;
  coins: number;
  level: number;
  experience: number;
  isActive: boolean;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  preferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
}
