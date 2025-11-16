import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { ActivityType, DifficultyLevel } from '../activity.entity';

interface ActivityQuestionInput {
  question?: string;
  options?: string[];
  correctAnswer?: number;
  points?: number;
  [key: string]: unknown;
}

interface ActivityContentInput {
  questions?: ActivityQuestionInput[];
  instructions?: unknown;
  [key: string]: unknown;
}

interface ActivityRewardsInput {
  coins?: number;
  experience?: number;
  achievements?: unknown;
  [key: string]: unknown;
}

interface ActivityPayload {
  title?: string;
  description?: string;
  type?: ActivityType;
  difficulty?: DifficultyLevel;
  subject?: string;
  classroomId?: string;
  content?: ActivityContentInput;
  rewards?: ActivityRewardsInput;
  estimatedTime?: number;
  baseExperience?: number;
  dueDate?: string | Date;
  maxAttempts?: number;
  [key: string]: unknown;
}

interface ActivityRequestUser {
  id: string;
  role: string;
  [key: string]: unknown;
}

interface ActivityRequest extends Request {
  body: ActivityPayload;
  params: Record<string, string | undefined>;
  user?: ActivityRequestUser;
}

/**
 * 🛡️ Interceptor de validación para operaciones de actividades
 * Valida datos de entrada antes de procesarlos en el servicio
 */
@Injectable()
export class ActivityValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityValidationInterceptor.name);

  // Configuración de validaciones
  private readonly config = {
    minTitleLength: 3,
    maxTitleLength: 100,
    minDescriptionLength: 10,
    maxDescriptionLength: 1000,
    maxSubjectLength: 50,
    minEstimatedTime: 1,
    maxEstimatedTime: 240, // 4 horas
    minExperience: 10,
    maxExperience: 1000,
    minCoins: 0,
    maxCoins: 10000,
    minMaxAttempts: 1,
    maxMaxAttempts: 10,
    maxFutureDate: 365, // días en el futuro
    allowedTypes: Object.values(ActivityType),
    allowedDifficulties: Object.values(DifficultyLevel),
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<ActivityRequest>();
    const { method, body, params, user, url } = request;
    const requestId = this.generateRequestId();

    this.logger.log(`🔍 [${requestId}] Interceptando operación de actividad: ${method} ${url}`);

    try {
      // Validar según el tipo de operación
      if (method === 'POST' && url.includes('/activities')) {
        this.validateActivityCreation(body, user, requestId);
      } else if (method === 'PUT' || method === 'PATCH') {
        this.validateActivityUpdate(body, user, requestId);
      } else if (method === 'DELETE') {
        this.validateActivityDeletion(params, user, requestId);
      }

      this.logger.log(`✅ [${requestId}] Validación exitosa`);
      return next.handle();

    } catch (error) {
      this.logger.error(`❌ [${requestId}] Error de validación: ${error.message}`);
      throw error;
    }
  }

  /**
   * ➕ Validar creación de actividad
   */
  private validateActivityCreation(body: ActivityPayload, currentUser: ActivityRequestUser | undefined, requestId: string): void {
    this.logger.log(`➕ [${requestId}] Validando creación de actividad`);

    // Validar usuario es docente
    if (currentUser && currentUser.role !== 'teacher' && currentUser.role !== 'admin') {
      this.logger.error(`❌ [${requestId}] Usuario ${currentUser.id} no es docente`);
      throw new ForbiddenException('Solo los docentes pueden crear actividades');
    }

    // Validar campos obligatorios
    this.validateRequiredFields(body, requestId);

    // Validar título
    this.validateTitle(body.title as string, requestId);

    // Validar descripción
    this.validateDescription(body.description as string, requestId);

    // Validar tipo
    this.validateType(body.type as ActivityType, requestId);

    // Validar dificultad
    this.validateDifficulty(body.difficulty as DifficultyLevel, requestId);

    // Validar materia
    this.validateSubject(body.subject as string, requestId);

    // Validar contenido
    this.validateContent(body.content as ActivityContentInput, body.type, requestId);

    // Validar recompensas
    this.validateRewards(body.rewards as ActivityRewardsInput, requestId);

    // Validar tiempos y valores numéricos
    if (body.estimatedTime) {
      this.validateEstimatedTime(body.estimatedTime, requestId);
    }

    if (body.baseExperience) {
      this.validateExperience(body.baseExperience, requestId);
    }

    // Validar fecha límite
    if (body.dueDate) {
      this.validateDueDate(body.dueDate, requestId);
    }

    // Validar intentos máximos
    if (body.maxAttempts) {
      this.validateMaxAttempts(body.maxAttempts, requestId);
    }

    this.logger.log(`✅ [${requestId}] Datos de creación válidos`);
  }

  /**
   * ✏️ Validar actualización de actividad
   */
  private validateActivityUpdate(body: ActivityPayload, currentUser: ActivityRequestUser | undefined, requestId: string): void {
    this.logger.log(`✏️ [${requestId}] Validando actualización de actividad`);

    // Validar usuario es docente
    if (currentUser && currentUser.role !== 'teacher' && currentUser.role !== 'admin') {
      this.logger.error(`❌ [${requestId}] Usuario ${currentUser.id} no es docente`);
      throw new ForbiddenException('Solo los docentes pueden actualizar actividades');
    }

    // Validar campos si están presentes
    if (body.title) {
      this.validateTitle(body.title, requestId);
    }

    if (body.description) {
      this.validateDescription(body.description, requestId);
    }

    if (body.type) {
      this.validateType(body.type, requestId);
    }

    if (body.difficulty) {
      this.validateDifficulty(body.difficulty, requestId);
    }

    if (body.subject) {
      this.validateSubject(body.subject, requestId);
    }

    if (body.content) {
      this.validateContent(body.content, body.type, requestId);
    }

    if (body.rewards) {
      this.validateRewards(body.rewards, requestId);
    }

    if (body.estimatedTime !== undefined) {
      this.validateEstimatedTime(body.estimatedTime, requestId);
    }

    if (body.baseExperience !== undefined) {
      this.validateExperience(body.baseExperience, requestId);
    }

    if (body.dueDate) {
      this.validateDueDate(body.dueDate, requestId);
    }

    if (body.maxAttempts !== undefined) {
      this.validateMaxAttempts(body.maxAttempts, requestId);
    }

    this.logger.log(`✅ [${requestId}] Actualización válida`);
  }

  /**
   * 🗑️ Validar eliminación de actividad
   */
  private validateActivityDeletion(
    params: Record<string, string | undefined>,
    currentUser: ActivityRequestUser | undefined,
    requestId: string,
  ): void {
    this.logger.log(`🗑️ [${requestId}] Validando eliminación de actividad`);

    // Validar usuario es docente o admin
    if (currentUser && currentUser.role !== 'teacher' && currentUser.role !== 'admin') {
      this.logger.error(`❌ [${requestId}] Usuario ${currentUser.id} no tiene permisos para eliminar`);
      throw new ForbiddenException('Solo los docentes pueden eliminar actividades');
    }

    if (!params.id) {
      throw new BadRequestException('ID de actividad es obligatorio');
    }

    this.logger.log(`✅ [${requestId}] Eliminación permitida`);
  }

  /**
   * ✅ Validar campos obligatorios
   */
  private validateRequiredFields(body: ActivityPayload, _requestId: string): void {
    const requiredFields: Array<keyof ActivityPayload> = [
      'title',
      'description',
      'type',
      'difficulty',
      'subject',
      'classroomId',
      'content',
      'rewards',
    ];

    requiredFields.forEach((field) => {
      const value = body[field];
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim().length === 0)
      ) {
        throw new BadRequestException(`El campo '${String(field)}' es obligatorio`);
      }
    });
  }

  /**
   * 📝 Validar título
   */
  private validateTitle(title: string, requestId: string): void {
    if (typeof title !== 'string') {
      throw new BadRequestException('El título debe ser un texto');
    }

    const trimmedTitle = title.trim();

    if (trimmedTitle.length < this.config.minTitleLength) {
      throw new BadRequestException(
        `El título debe tener al menos ${this.config.minTitleLength} caracteres`
      );
    }

    if (trimmedTitle.length > this.config.maxTitleLength) {
      throw new BadRequestException(
        `El título no puede exceder ${this.config.maxTitleLength} caracteres`
      );
    }

    this.logger.log(`✅ [${requestId}] Título válido`);
  }

  /**
   * 📝 Validar descripción
   */
  private validateDescription(description: string, requestId: string): void {
    if (typeof description !== 'string') {
      throw new BadRequestException('La descripción debe ser un texto');
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length < this.config.minDescriptionLength) {
      throw new BadRequestException(
        `La descripción debe tener al menos ${this.config.minDescriptionLength} caracteres`
      );
    }

    if (trimmedDescription.length > this.config.maxDescriptionLength) {
      throw new BadRequestException(
        `La descripción no puede exceder ${this.config.maxDescriptionLength} caracteres`
      );
    }

    this.logger.log(`✅ [${requestId}] Descripción válida`);
  }

  /**
   * 🎯 Validar tipo de actividad
   */
  private validateType(type: ActivityType, requestId: string): void {
    if (!this.config.allowedTypes.includes(type as ActivityType)) {
      throw new BadRequestException(
        `Tipo de actividad no válido. Tipos permitidos: ${this.config.allowedTypes.join(', ')}`
      );
    }

    this.logger.log(`✅ [${requestId}] Tipo válido: ${type}`);
  }

  /**
   * 🎚️ Validar dificultad
   */
  private validateDifficulty(difficulty: DifficultyLevel, requestId: string): void {
    if (!this.config.allowedDifficulties.includes(difficulty as DifficultyLevel)) {
      throw new BadRequestException(
        `Dificultad no válida. Dificultades permitidas: ${this.config.allowedDifficulties.join(', ')}`
      );
    }

    this.logger.log(`✅ [${requestId}] Dificultad válida: ${difficulty}`);
  }

  /**
   * 📚 Validar materia
   */
  private validateSubject(subject: string, requestId: string): void {
    if (typeof subject !== 'string') {
      throw new BadRequestException('La materia debe ser un texto');
    }

    if (subject.trim().length === 0) {
      throw new BadRequestException('La materia no puede estar vacía');
    }

    if (subject.length > this.config.maxSubjectLength) {
      throw new BadRequestException(
        `La materia no puede exceder ${this.config.maxSubjectLength} caracteres`
      );
    }

    this.logger.log(`✅ [${requestId}] Materia válida: ${subject}`);
  }

  /**
   * 📦 Validar contenido
   */
  private validateContent(content: ActivityContentInput | undefined, type: ActivityType | undefined, requestId: string): void {
    if (!content || typeof content !== 'object') {
      throw new BadRequestException('El contenido debe ser un objeto válido');
    }

    // Validar que tenga preguntas o instrucciones
    if (!content.questions && !content.instructions) {
      throw new BadRequestException('El contenido debe tener preguntas o instrucciones');
    }

    // Si es un quiz, validar estructura
    if (type === ActivityType.QUIZ) {
      this.validateQuizContent(content, requestId);
    }

    this.logger.log(`✅ [${requestId}] Contenido válido`);
  }

  /**
   * ❓ Validar contenido de quiz
   */
  private validateQuizContent(content: ActivityContentInput, requestId: string): void {
    const questions = content.questions;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestException('Un quiz debe tener al menos una pregunta');
    }

    questions.forEach((question, index) => {
      if (!question.question || typeof question.question !== 'string') {
        throw new BadRequestException(`La pregunta ${index + 1} debe tener un texto válido`);
      }

      if (!Array.isArray(question.options) || question.options.length < 2) {
        throw new BadRequestException(`La pregunta ${index + 1} debe tener al menos 2 opciones`);
      }

      if (typeof question.correctAnswer !== 'number' || 
          question.correctAnswer < 0 || 
          question.correctAnswer >= question.options.length) {
        throw new BadRequestException(
          `La pregunta ${index + 1} tiene una respuesta correcta inválida`
        );
      }

      if (question.points !== undefined && (typeof question.points !== 'number' || question.points < 0)) {
        throw new BadRequestException(`La pregunta ${index + 1} tiene puntos inválidos`);
      }
    });

    this.logger.log(`✅ [${requestId}] Contenido de quiz válido con ${questions.length} preguntas`);
  }

  /**
   * 🎁 Validar recompensas
   */
  private validateRewards(rewards: ActivityRewardsInput | undefined, requestId: string): void {
    if (!rewards || typeof rewards !== 'object') {
      throw new BadRequestException('Las recompensas deben ser un objeto válido');
    }

    // Validar monedas
    if (typeof rewards.coins !== 'number' || rewards.coins < this.config.minCoins) {
      throw new BadRequestException(
        `Las monedas deben ser un número mayor o igual a ${this.config.minCoins}`
      );
    }

    if (rewards.coins > this.config.maxCoins) {
      throw new BadRequestException(
        `Las monedas no pueden exceder ${this.config.maxCoins}`
      );
    }

    // Validar experiencia
    if (typeof rewards.experience !== 'number' || rewards.experience < this.config.minExperience) {
      throw new BadRequestException(
        `La experiencia debe ser un número mayor o igual a ${this.config.minExperience}`
      );
    }

    if (rewards.experience > this.config.maxExperience) {
      throw new BadRequestException(
        `La experiencia no puede exceder ${this.config.maxExperience}`
      );
    }

    // Validar achievements si existen
    if (rewards.achievements && !Array.isArray(rewards.achievements)) {
      throw new BadRequestException('Los logros deben ser un array');
    }

    this.logger.log(`✅ [${requestId}] Recompensas válidas: ${rewards.coins} monedas, ${rewards.experience} XP`);
  }

  /**
   * ⏱️ Validar tiempo estimado
   */
  private validateEstimatedTime(time: number, requestId: string): void {
    if (typeof time !== 'number' || time < this.config.minEstimatedTime) {
      throw new BadRequestException(
        `El tiempo estimado debe ser al menos ${this.config.minEstimatedTime} minuto`
      );
    }

    if (time > this.config.maxEstimatedTime) {
      throw new BadRequestException(
        `El tiempo estimado no puede exceder ${this.config.maxEstimatedTime} minutos`
      );
    }

    this.logger.log(`✅ [${requestId}] Tiempo estimado válido: ${time} minutos`);
  }

  /**
   * ⭐ Validar experiencia base
   */
  private validateExperience(experience: number, requestId: string): void {
    if (typeof experience !== 'number' || experience < this.config.minExperience) {
      throw new BadRequestException(
        `La experiencia debe ser al menos ${this.config.minExperience}`
      );
    }

    if (experience > this.config.maxExperience) {
      throw new BadRequestException(
        `La experiencia no puede exceder ${this.config.maxExperience}`
      );
    }

    this.logger.log(`✅ [${requestId}] Experiencia válida: ${experience} XP`);
  }

  /**
   * 📅 Validar fecha límite
   */
  private validateDueDate(dueDate: string | Date, requestId: string): void {
    const date = new Date(dueDate);

    if (isNaN(date.getTime())) {
      throw new BadRequestException('La fecha límite no es válida');
    }

    const now = new Date();

    if (date < now) {
      throw new BadRequestException('La fecha límite no puede ser en el pasado');
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + this.config.maxFutureDate);

    if (date > maxDate) {
      throw new BadRequestException(
        `La fecha límite no puede ser más de ${this.config.maxFutureDate} días en el futuro`
      );
    }

    this.logger.log(`✅ [${requestId}] Fecha límite válida: ${date.toISOString()}`);
  }

  /**
   * 🔢 Validar intentos máximos
   */
  private validateMaxAttempts(maxAttempts: number, requestId: string): void {
    if (typeof maxAttempts !== 'number' || 
        maxAttempts < this.config.minMaxAttempts || 
        maxAttempts > this.config.maxMaxAttempts) {
      throw new BadRequestException(
        `Los intentos máximos deben estar entre ${this.config.minMaxAttempts} y ${this.config.maxMaxAttempts}`
      );
    }

    this.logger.log(`✅ [${requestId}] Intentos máximos válidos: ${maxAttempts}`);
  }

  private generateRequestId(): string {
    return `REQ-${Date.now()}`;
  }
}
