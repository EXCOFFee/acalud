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

import type { Classroom as ClassroomEntity } from '../classroom.entity';
import type { ClassroomInvitation as ClassroomInvitationEntity, InvitationStatus as InvitationStatusEnum } from '../classroom-invitation.entity';
import type { User as UserEntity } from '../../users/user.entity';
import type { Activity as ActivityEntity } from '../../activities/activity.entity';

// ============================================================================
// 📊 REPOSITORIO DE AULAS (ACCESO A DATOS)
// ============================================================================
export interface IClassroomRepository {
  create(classroomData: CreateClassroomData): Promise<Classroom>;
  findById(id: string): Promise<Classroom | null>;
  findByInviteCode(code: string): Promise<Classroom | null>;
  findWithFilters(filters: ClassroomFilters): Promise<PaginatedResult<Classroom>>;
  findTeacherClassrooms(teacherId: string): Promise<Classroom[]>;
  findStudentClassrooms(studentId: string): Promise<Classroom[]>;
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
// ✉️ SERVICIOS DE INVITACIONES A AULAS
// ============================================================================

export interface SendInvitationsOptions {
  message?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InvitationDispatchItem {
  email: string;
  token: string;
  expiresAt?: Date | null;
  status: 'sent' | 'queued' | 'skipped';
  reason?: string;
}

export interface InvitationDispatchResult {
  classroomId: string;
  requested: number;
  processed: InvitationDispatchItem[];
}

export interface InvitationValidationResult {
  valid: boolean;
  status: InvitationStatus;
  token: string;
  email?: string;
  classroom?: {
    id: string;
    name: string;
    subject: string;
    grade: string;
    teacherName?: string;
  };
  expiresAt?: Date | null;
  message?: string;
  reason?: string;
}

export interface InvitationConsumptionResult {
  status: InvitationStatus;
  classroomId: string;
  studentId: string;
  email: string;
}

export interface CreateInvitationData {
  classroomId: string;
  email: string;
  token: string;
  invitedById: string;
  expiresAt?: Date | null;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface IClassroomInvitationRepository {
  createOrUpdatePending(data: CreateInvitationData): Promise<ClassroomInvitation>;
  findByToken(token: string): Promise<ClassroomInvitation | null>;
  findPendingByEmail(classroomId: string, email: string): Promise<ClassroomInvitation | null>;
  listByClassroom(classroomId: string): Promise<ClassroomInvitation[]>;
  findById(invitationId: string): Promise<ClassroomInvitation | null>;
  save(invitation: ClassroomInvitation): Promise<ClassroomInvitation>;
  updateStatus(invitationId: string, status: InvitationStatus, payload?: Partial<ClassroomInvitation>): Promise<ClassroomInvitation>;
}

export interface IClassroomInvitationService {
  sendInvitations(classroomId: string, teacherId: string, emails: string[], options?: SendInvitationsOptions): Promise<InvitationDispatchResult>;
  listInvitations(classroomId: string, requesterId: string): Promise<ClassroomInvitation[]>;
  validateInvitationToken(token: string): Promise<InvitationValidationResult>;
  consumeInvitationToken(token: string, userId: string, email: string): Promise<InvitationConsumptionResult>;
  resendInvitation(classroomId: string, invitationId: string, requesterId: string, options?: SendInvitationsOptions): Promise<ClassroomInvitation>;
  revokeInvitation(classroomId: string, invitationId: string, requesterId: string): Promise<ClassroomInvitation>;
}

// ============================================================================
// 🎯 SERVICIO PRINCIPAL DE AULAS
// ============================================================================
export interface IClassroomService {
  createClassroom(data: CreateClassroomDto, teacherId: string): Promise<Classroom>;
  findClassrooms(filters: ClassroomFilters): Promise<PaginatedResult<Classroom>>;
  findClassroomById(id: string): Promise<Classroom>;
  findClassroomByInviteCode(inviteCode: string): Promise<Classroom>;
  updateClassroom(id: string, data: UpdateClassroomDto, userId: string): Promise<Classroom>;
  deleteClassroom(id: string, userId: string): Promise<void>;
  joinClassroom(data: JoinClassroomDto, studentId: string): Promise<Classroom>;
  leaveClassroom(classroomId: string, studentId: string): Promise<void>;
  generateNewInviteCode(classroomId: string, userId: string): Promise<string>;
  getClassroomStats(classroomId: string): Promise<ClassroomStats>;
  getTeacherClassrooms(teacherId: string): Promise<Classroom[]>;
  getStudentClassrooms(studentId: string): Promise<Classroom[]>;
  addActivityToClassroom(classroomId: string, activityId: string, userId: string): Promise<Classroom>;
  removeActivityFromClassroom(classroomId: string, activityId: string, userId: string): Promise<void>;
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
  settings: Record<string, unknown>; // Coincide con la entidad para evitar any innecesario
  isActive: boolean;
  createdAt: Date;
  level: 'básico' | 'intermedio' | 'avanzado'; // Nivel académico declarado para facilitar filtros
  timezone: string; // Zona horaria usada para programar actividades
  language: 'es' | 'en' | 'fr' | 'pt'; // Idioma principal del aula
  tags?: string[]; // Etiquetas opcionales que ayudan a agrupar aulas
  invitedStudentEmails?: string[]; // Correos almacenados para controlar invitaciones pendientes
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
  level?: 'básico' | 'intermedio' | 'avanzado'; // Nivel opcional especificado al crear
  timezone?: string; // Zona horaria opcional al crear
  language?: 'es' | 'en' | 'fr' | 'pt'; // Idioma opcional al crear
  tags?: string[]; // Etiquetas opcionales al crear
  invitedStudentEmails?: string[]; // Correos opcionales para invitar estudiantes
}

export interface UpdateClassroomDto {
  name?: string;
  description?: string;
  subject?: string;
  grade?: string;
  color?: string;
  coverImage?: string;
  settings?: Partial<ClassroomSettings>;
  level?: 'básico' | 'intermedio' | 'avanzado'; // Nivel opcional al actualizar
  timezone?: string; // Zona horaria opcional al actualizar
  language?: 'es' | 'en' | 'fr' | 'pt'; // Idioma opcional al actualizar
  tags?: string[]; // Etiquetas opcionales al actualizar
  invitedStudentEmails?: string[]; // Correos adicionales para invitar desde la edición
}

export interface JoinClassroomDto {
  inviteCode: string;
}

// ============================================================================
// 👤 REFERENCIAS A ENTIDADES REALES
// ============================================================================
export type Classroom = ClassroomEntity;
export type User = UserEntity;
export type Activity = ActivityEntity;
export type ClassroomInvitation = ClassroomInvitationEntity;
export type InvitationStatus = InvitationStatusEnum;
