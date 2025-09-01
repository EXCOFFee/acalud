// ============================================================================
// IMPLEMENTACIÓN DEL SERVICIO DE USUARIOS
// ============================================================================
// Implementa la interface IUserService con lógica de negocio real
// Utiliza el patrón Repository y Singleton

import { IUserService } from '../interfaces/IUserService';
import { User, UserStats, UserInventory, Achievement } from '../../types';

/**
 * Implementación concreta del servicio de usuarios
 * Simula una base de datos en memoria para el prototipo
 */
export class UserService implements IUserService {
  private static instance: UserService;
  private users: Map<string, User> = new Map();
  private userStats: Map<string, UserStats> = new Map();
  private userInventories: Map<string, UserInventory> = new Map();

  /**
   * Implementa el patrón Singleton para garantizar una única instancia
   */
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Constructor privado para implementar Singleton
   */
  private constructor() {
    this.initializeDemoData();
  }

  /**
   * Inicializa datos de demostración para el prototipo
   */
  private initializeDemoData(): void {
    // Crear usuarios de demostración
    const demoTeacher: User = {
      id: 'teacher-1',
      email: 'teacher@demo.com',
      name: 'Profesor Demo',
      role: 'teacher',
      avatar: '',
      coins: 0,
      level: 1,
      experience: 0,
      achievements: [],
      createdAt: new Date()
    };

    const demoStudent: User = {
      id: 'student-1',
      email: 'student@demo.com',
      name: 'Estudiante Demo',
      role: 'student',
      avatar: '',
      coins: 150,
      level: 5,
      experience: 1250,
      achievements: [],
      createdAt: new Date()
    };

    this.users.set(demoTeacher.id, demoTeacher);
    this.users.set(demoStudent.id, demoStudent);

    // Inicializar estadísticas de demostración
    this.userStats.set(demoStudent.id, {
      userId: demoStudent.id,
      totalActivitiesCompleted: 25,
      totalScore: 2100,
      averageScore: 84,
      totalTimeSpent: 7200, // 2 horas en segundos
      streakDays: 7,
      favoriteSubject: 'Matemáticas',
      weeklyProgress: [
        { week: '2024-01', activitiesCompleted: 5, scoreEarned: 420, timeSpent: 1800 },
        { week: '2024-02', activitiesCompleted: 8, scoreEarned: 680, timeSpent: 2400 },
        { week: '2024-03', activitiesCompleted: 12, scoreEarned: 1000, timeSpent: 3000 }
      ]
    });

    // Inicializar inventario de demostración
    this.userInventories.set(demoStudent.id, {
      userId: demoStudent.id,
      items: [],
      equippedItems: {},
      purchaseHistory: []
    });
  }

  /**
   * Obtiene un usuario por su ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Obtiene un usuario por su email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  /**
   * Crea un nuevo usuario en el sistema
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const newUser: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date()
    };

    this.users.set(newUser.id, newUser);

    // Inicializar estadísticas para estudiantes
    if (newUser.role === 'student') {
      this.userStats.set(newUser.id, {
        userId: newUser.id,
        totalActivitiesCompleted: 0,
        totalScore: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        streakDays: 0,
        favoriteSubject: '',
        weeklyProgress: []
      });

      // Inicializar inventario
      this.userInventories.set(newUser.id, {
        userId: newUser.id,
        items: [],
        equippedItems: {},
        purchaseHistory: []
      });
    }

    return newUser;
  }

  /**
   * Actualiza los datos de un usuario existente
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(userId);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  /**
   * Elimina un usuario del sistema
   */
  async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
    this.userStats.delete(userId);
    this.userInventories.delete(userId);
  }

  /**
   * Obtiene las estadísticas de un usuario
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const stats = this.userStats.get(userId);
    if (!stats) {
      throw new Error('Estadísticas de usuario no encontradas');
    }
    return stats;
  }

  /**
   * Obtiene el inventario de un usuario
   */
  async getUserInventory(userId: string): Promise<UserInventory> {
    const inventory = this.userInventories.get(userId);
    if (!inventory) {
      throw new Error('Inventario de usuario no encontrado');
    }
    return inventory;
  }

  /**
   * Actualiza las monedas de un usuario
   */
  async updateUserCoins(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const newCoins = Math.max(0, user.coins + amount);
    return this.updateUser(userId, { coins: newCoins });
  }

  /**
   * Actualiza la experiencia de un usuario y calcula el nivel
   */
  async updateUserExperience(userId: string, experience: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const newExperience = user.experience + experience;
    const newLevel = this.calculateLevel(newExperience);

    return this.updateUser(userId, { 
      experience: newExperience,
      level: newLevel
    });
  }

  /**
   * Calcula el nivel basado en la experiencia
   * Fórmula: nivel = floor(sqrt(experiencia / 100)) + 1
   */
  private calculateLevel(experience: number): number {
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  /**
   * Genera un ID único para nuevos usuarios
   */
  private generateId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}