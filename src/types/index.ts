// ============================================================================
// 📋 TIPOS Y INTERFACES DEL SISTEMA ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este archivo es como el "diccionario" de toda la aplicación AcaLud.
 * Define exactamente cómo deben verse todos los datos que usamos.
 * 
 * 🤔 ¿POR QUÉ ES IMPORTANTE?
 * - Evita errores: TypeScript nos avisa si usamos mal los datos
 * - Documentación automática: Los tipos son documentación viva
 * - Autocompletado: El editor sabe qué propiedades tiene cada objeto
 * - Refactoring seguro: Si cambiamos algo, TypeScript nos dice dónde más cambiar
 * 
 * 🏗️ ORGANIZACIÓN:
 * 1. Interfaces principales (User, Classroom, Activity)
 * 2. Interfaces de soporte (Questions, Achievements, etc.)
 * 3. Interfaces para la UI (Navigation, Forms, etc.)
 * 4. Tipos de utilidad y constantes
 * 
 * 💡 REGLA DE ORO:
 * Si un dato se usa en más de un lugar, debe tener un tipo aquí.
 */

/**
 * 👤 INTERFAZ PRINCIPAL PARA REPRESENTAR UN USUARIO
 * 
 * ¿Qué información guardamos de cada usuario?
 * Esta interfaz define los datos básicos de cualquier usuario del sistema,
 * ya sea profesor, estudiante o administrador.
 * 
 * ¿Por qué tantos campos?
 * - Datos básicos: id, nombres, email (obligatorios)
 * - Gamificación: coins, level, experience (para motivar)
 * - Logros: achievements (para reconocimiento)
 * - Control: createdAt, updatedAt (para auditoría)
 */
export interface User {
  id: string;                    // 🆔 Identificador único (ej: "usr_123456")
  firstName: string;             // 📝 Nombre (ej: "Juan")
  lastName: string;              // 📝 Apellido (ej: "Pérez")
  email: string;                 // 📧 Email único (ej: "juan@email.com")
  name: string;                  // 📝 Nombre completo (ej: "Juan Pérez")
  role: 'teacher' | 'student' | 'admin';  // 🎭 Rol en el sistema
  avatar?: string;               // 🖼️ URL de foto de perfil (opcional)
  coins: number;                 // 🪙 Monedas virtuales para compras
  level: number;                 // 📊 Nivel actual (ej: 1, 2, 3...)
  experience: number;            // ⭐ Puntos de experiencia acumulados
  achievements: Achievement[];   // 🏆 Lista de logros obtenidos
  createdAt: Date;              // 📅 Cuándo se registró
  updatedAt?: Date;             // 📅 Última actualización (opcional)
}

/**
 * 🏫 INTERFAZ PARA REPRESENTAR UN AULA VIRTUAL
 * 
 * ¿Qué es un aula en AcaLud?
 * Es un espacio virtual donde un profesor organiza actividades para sus estudiantes.
 * Cada aula tiene un tema específico (matemáticas, ciencias, etc.).
 * 
 * Características importantes:
 * - Un profesor puede tener múltiples aulas
 * - Los estudiantes se unen con códigos de invitación
 * - Cada aula tiene sus propias actividades
 */
export interface Classroom {
  id: string;                    // 🆔 Identificador único del aula
  name: string;                  // 📝 Nombre del aula (ej: "Matemáticas 5to A")
  description: string;           // 📄 Descripción detallada
  subject: string;               // 📚 Materia (ej: "Matemáticas", "Ciencias")
  grade: string;                 // 🎓 Grado/Curso (ej: "5to Primaria")
  teacherId: string;             // 👨‍🏫 ID del profesor dueño
  teacher: User;                 // 👨‍🏫 Datos completos del profesor
  students: User[];              // 👥 Lista de estudiantes inscritos
  activities: Activity[];        // 📝 Actividades disponibles en el aula
  inviteCode: string;           // 🎫 Código único para que estudiantes se unan
  isActive: boolean;            // ✅ ¿El aula está activa?
  createdAt: Date;              // 📅 Cuándo se creó
  updatedAt: Date;              // 📅 Última actualización
}

/**
 * 🎮 INTERFAZ PARA ACTIVIDADES/TAREAS LÚDICAS
 * 
 * ¿Qué es una actividad?
 * Es el contenido educativo principal de AcaLud. Puede ser:
 * - Un quiz con preguntas
 * - Un juego interactivo
 * - Una tarea para completar
 * - Actividades de arrastrar y soltar
 * - Juegos de memoria
 * 
 * Elementos clave:
 * - Contenido flexible: se adapta al tipo de actividad
 * - Sistema de recompensas: motiva a los estudiantes
 * - Seguimiento: registra quién la completó y cómo
 */
export interface Activity {
  id: string;                    // 🆔 Identificador único
  title: string;                 // 📝 Título atractivo (ej: "Suma divertida")
  description: string;           // 📄 Descripción detallada de qué hacer
  type: 'quiz' | 'game' | 'assignment' | 'interactive' | 'drag-drop' | 'memory';  // 🎭 Tipo de actividad
  difficulty: 'easy' | 'medium' | 'hard';  // 📊 Nivel de dificultad
  subject: string;               // 📚 Materia a la que pertenece
  content: ActivityContent;      // 📋 Contenido específico de la actividad
  rewards: ActivityRewards;      // 🎁 Recompensas por completarla
  classroomId: string;          // 🏫 A qué aula pertenece
  teacherId: string;            // 👨‍🏫 Quién la creó
  isPublic: boolean;            // 🌐 ¿Disponible en repositorio público?
  completions: ActivityCompletion[];  // 📊 Registro de quién la completó
  tags: string[];               // 🏷️ Etiquetas para categorización
  estimatedTime: number;        // ⏱️ Tiempo estimado en minutos
  createdAt: Date;              // 📅 Cuándo se creó
  updatedAt: Date;              // 📅 Última actualización
}

/**
 * Interface para el contenido específico de cada actividad
 * Permite flexibilidad en los tipos de contenido
 */
export interface ActivityContent {
  questions?: Question[];
  instructions?: string;
  resources?: Resource[];
  gameConfig?: GameConfiguration;
  multimedia?: MultimediaContent[];
}

/**
 * Interface para las recompensas de las actividades
 */
export interface ActivityRewards {
  coins: number;
  experience: number;
  achievements?: string[]; // IDs de logros que se pueden desbloquear
}

/**
 * Interface para las preguntas dentro de las actividades
 */
export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'drag-drop' | 'matching';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  multimedia?: MultimediaContent;
}

/**
 * Interface para el registro de completación de actividades
 */
export interface ActivityCompletion {
  id: string;
  activityId: string;
  studentId: string;
  student: User;
  score: number;
  maxScore: number;
  completedAt: Date;
  timeSpent: number; // Tiempo en segundos
  answers: StudentAnswer[];
  attempts: number;
}

/**
 * Interface para las respuestas de los estudiantes
 */
export interface StudentAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  timeSpent: number;
}

/**
 * Interface para el sistema de logros/achievements
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'progress' | 'special' | 'social' | 'academic';
  category: 'beginner' | 'intermediate' | 'advanced' | 'master';
  requirement: AchievementRequirement;
  reward: ActivityRewards;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
}

/**
 * Interface para los requisitos de los logros
 */
export interface AchievementRequirement {
  type: 'activities_completed' | 'score_achieved' | 'streak_days' | 'coins_earned';
  value: number;
  subject?: string;
}

/**
 * Interface para los elementos de la tienda virtual
 */
export interface StoreItem {
  id: string;
  name: string;
  description: string;
  type: 'avatar' | 'theme' | 'badge' | 'decoration' | 'frame';
  price: number;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  isLimited: boolean;
  availableUntil?: Date;
}

/**
 * Interface para el inventario del usuario
 */
export interface UserInventory {
  userId: string;
  items: StoreItem[];
  equippedItems: EquippedItems;
  purchaseHistory: Purchase[];
}

/**
 * Interface para los elementos equipados del usuario
 */
export interface EquippedItems {
  avatar?: string;
  theme?: string;
  badge?: string;
  frame?: string;
}

/**
 * Interface para el historial de compras
 */
export interface Purchase {
  id: string;
  itemId: string;
  item: StoreItem;
  purchasedAt: Date;
  price: number;
}

/**
 * Interface para recursos multimedia
 */
export interface MultimediaContent {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  alt?: string;
  caption?: string;
}

/**
 * Interface para recursos educativos
 */
export interface Resource {
  id: string;
  name: string;
  type: 'pdf' | 'link' | 'video' | 'image';
  url: string;
  description?: string;
}

/**
 * Interface para configuración de juegos
 */
export interface GameConfiguration {
  gameType: 'memory' | 'puzzle' | 'matching' | 'sequence';
  difficulty: number;
  timeLimit?: number;
  attempts?: number;
  customSettings?: Record<string, any>;
}

/**
 * Interface para estadísticas del usuario
 */
export interface UserStats {
  userId: string;
  totalActivitiesCompleted: number;
  totalScore: number;
  averageScore: number;
  totalTimeSpent: number;
  streakDays: number;
  favoriteSubject: string;
  weeklyProgress: WeeklyProgress[];
}

/**
 * Interface para el progreso semanal
 */
export interface WeeklyProgress {
  week: string;
  activitiesCompleted: number;
  scoreEarned: number;
  timeSpent: number;
}

/**
 * Interface para notificaciones del sistema
 */
export interface Notification {
  id: string;
  userId: string;
  type: 'achievement' | 'activity' | 'classroom' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

/**
 * Interface para reportes de contenido inapropiado
 */
export interface ContentReport {
  id: string;
  reporterId: string;
  reporter: User;
  contentType: 'activity' | 'comment' | 'profile';
  contentId: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

/**
 * Props comunes para componentes de navegación
 */
export interface NavigationProps {
  onNavigate: (page: string, data?: any) => void;
  onBack?: () => void;
  currentPage?: string;
}

/**
 * Props comunes para formularios
 */
export interface FormProps {
  onSubmit: (data: any) => void | Promise<void>;
  onCancel?: () => void;
  initialData?: any;
  isLoading?: boolean;
  errors?: ValidationErrors;
}

/**
 * Errores de validación de formularios
 */
export interface ValidationErrors {
  [fieldName: string]: string[];
}

/**
 * Estado del contexto de autenticación
 */
export interface AuthContextState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

/**
 * Respuesta de API estándar
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
}

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Filtros para búsquedas
 */
export interface SearchFilters {
  subject?: string;
  grade?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: Activity['type'];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

/**
 * Estado de carga de componentes
 */
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: Date;
}

/**
 * Tipos de utilidad para el estado de la aplicación
 */
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';
export type UserRole = User['role'];
export type ActivityType = Activity['type'];
export type DifficultyLevel = Activity['difficulty'];

// 📊 CONSTANTES ÚTILES PARA LA APLICACIÓN

/**
 * 📚 MATERIAS SOPORTADAS POR LA PLATAFORMA
 * 
 * ¿Para qué sirve?
 * Lista fija de materias que los profesores pueden elegir.
 * Usar 'as const' hace que TypeScript sepa exactamente qué valores pueden tener.
 */
export const SUPPORTED_SUBJECTS = [
  'Matemáticas',      // 🔢 Números, operaciones, geometría
  'Ciencias',         // 🔬 Biología, química, física
  'Historia',         // 📜 Eventos del pasado
  'Geografía',        // 🌍 Países, mapas, ubicaciones
  'Lengua',          // 📖 Gramática, literatura, redacción
  'Inglés',          // 🇬🇧 Idioma extranjero
  'Educación Física', // ⚽ Deportes y ejercicio
  'Arte',            // 🎨 Dibujo, pintura, creatividad
  'Música',          // 🎵 Instrumentos, canciones, ritmo
  'Tecnología'       // 💻 Computación, programación
] as const;

/**
 * 🎓 NIVELES DE GRADO DISPONIBLES
 * 
 * ¿Para qué sirve?
 * Lista de todos los grados/cursos donde se puede usar AcaLud.
 * Cubre desde primaria hasta secundaria completa.
 */
export const GRADE_LEVELS = [
  // 🏫 PRIMARIA (6 años de educación básica)
  '1ro Primaria', '2do Primaria', '3ro Primaria', 
  '4to Primaria', '5to Primaria', '6to Primaria',
  
  // 🎒 SECUNDARIA (5 años de educación media)
  '1ro Secundaria', '2do Secundaria', '3ro Secundaria', 
  '4to Secundaria', '5to Secundaria'
] as const;

/**
 * 📈 RESUMEN COMPLETO DE ESTE ARCHIVO:
 * 
 * 🎯 PROPÓSITO PRINCIPAL:
 * Este archivo es la "biblioteca de tipos" de AcaLud. Define la estructura
 * de TODOS los datos que maneja la aplicación.
 * 
 * 🏗️ ARQUITECTURA DE DATOS:
 * 
 * 1. 👤 USUARIOS (User):
 *    - Datos básicos: nombre, email, rol
 *    - Gamificación: coins, level, experience
 *    - Logros: achievements array
 *    - Auditoría: fechas de creación/actualización
 * 
 * 2. 🏫 AULAS (Classroom):
 *    - Información: nombre, descripción, materia, grado
 *    - Relaciones: profesor dueño, estudiantes inscritos
 *    - Funcionalidad: código de invitación, actividades
 * 
 * 3. 🎮 ACTIVIDADES (Activity):
 *    - Contenido: título, descripción, tipo, dificultad
 *    - Gamificación: recompensas, seguimiento de completación
 *    - Flexibilidad: contenido adaptable según el tipo
 * 
 * 4. 📝 CONTENIDO EDUCATIVO:
 *    - Preguntas: múltiple opción, verdadero/falso, llenar espacios
 *    - Multimedia: imágenes, videos, audio
 *    - Configuración: juegos personalizables
 * 
 * 5. 🏆 GAMIFICACIÓN:
 *    - Logros: sistema de achievements con requisitos
 *    - Tienda: items virtuales comprables con coins
 *    - Inventario: elementos equipados por el usuario
 * 
 * 6. 📊 SEGUIMIENTO Y ANÁLISIS:
 *    - Completaciones: registro detallado de cada intento
 *    - Estadísticas: progreso, tiempo, puntuaciones
 *    - Reportes: análisis del rendimiento
 * 
 * 7. 🔧 INFRAESTRUCTURA DE UI:
 *    - Navegación: props comunes para componentes
 *    - Formularios: validación y manejo de errores
 *    - Estados: loading, paginación, filtros
 * 
 * 💡 VENTAJAS DE ESTA ORGANIZACIÓN:
 * 
 * ✅ CONSISTENCIA:
 * - Todos los datos siguen la misma estructura
 * - No hay confusión sobre qué propiedades tiene cada objeto
 * 
 * ✅ SEGURIDAD DE TIPOS:
 * - TypeScript previene errores de tipado
 * - Autocompletado inteligente en el editor
 * 
 * ✅ MANTENIBILIDAD:
 * - Cambios centralizados en un solo lugar
 * - Refactoring seguro en toda la aplicación
 * 
 * ✅ DOCUMENTACIÓN VIVA:
 * - Los tipos documentan automáticamente la API
 * - Los comentarios explican el propósito de cada campo
 * 
 * ✅ ESCALABILIDAD:
 * - Fácil agregar nuevos tipos sin romper existentes
 * - Interfaces extensibles para nuevas funcionalidades
 * 
 * 🚀 CASOS DE USO COMUNES:
 * 
 * ```typescript
 * // Crear un usuario nuevo
 * const newUser: User = {
 *   id: generateId(),
 *   firstName: "Ana",
 *   lastName: "García",
 *   email: "ana@email.com",
 *   name: "Ana García",
 *   role: "student",
 *   coins: 0,
 *   level: 1,
 *   experience: 0,
 *   achievements: [],
 *   createdAt: new Date()
 * };
 * 
 * // Validar datos de actividad
 * function validateActivity(activity: Activity): boolean {
 *   return activity.title.length > 0 && 
 *          activity.difficulty in ['easy', 'medium', 'hard'];
 * }
 * ```
 * 
 * 🎓 PRINCIPIOS APLICADOS:
 * - Separación de responsabilidades: cada interfaz tiene un propósito específico
 * - Composición sobre herencia: interfaces pequeñas que se combinan
 * - Inmutabilidad: readonly donde es apropiado
 * - Flexibilidad: campos opcionales y tipos union donde hace sentido
 */
