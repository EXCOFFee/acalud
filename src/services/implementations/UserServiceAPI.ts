// ============================================================================
// IMPLEMENTACIÓN DEL SERVICIO DE USUARIOS - ACALUD
// ============================================================================
// Implementa la interface IUserService con integración a API real

import { IUserService } from '../interfaces/IUserService';
import { User, UserStats, UserInventory } from '../../types';
import { httpClient } from '../http.service';

/**
 * Implementación concreta del servicio de usuarios
 * Conecta con el backend API para operaciones reales
 */
export class UserService implements IUserService {
  private static instance: UserService;

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
  private constructor() {}

  /**
   * Obtiene un usuario por su ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await httpClient.get<User>(`/users/${userId}`);
      return user;
    } catch (error) {
      console.error('Error al obtener usuario por ID:', error);
      return null;
    }
  }

  /**
   * Obtiene un usuario por su email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await httpClient.get<User>(`/users/email/${email}`);
      return user;
    } catch (error) {
      console.error('Error al obtener usuario por email:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo usuario en el sistema
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      const newUser = await httpClient.post<User>('/users', userData);
      return newUser;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza los datos de un usuario existente
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const updatedUser = await httpClient.patch<User>(`/users/${userId}`, updates);
      return updatedUser;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  }

  /**
   * Elimina un usuario del sistema
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await httpClient.delete(`/users/${userId}`);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene las estadísticas de un usuario
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const stats = await httpClient.get<UserStats>(`/users/${userId}/stats`);
      return stats;
    } catch (error) {
      console.error('Error al obtener estadísticas de usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene el inventario de un usuario
   */
  async getUserInventory(userId: string): Promise<UserInventory> {
    try {
      const inventory = await httpClient.get<UserInventory>(`/users/${userId}/inventory`);
      return inventory;
    } catch (error) {
      console.error('Error al obtener inventario de usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza las monedas de un usuario
   */
  async updateUserCoins(userId: string, amount: number): Promise<User> {
    try {
      const updatedUser = await httpClient.patch<User>(`/users/${userId}/coins`, {
        amount,
      });
      return updatedUser;
    } catch (error) {
      console.error('Error al actualizar monedas de usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza la experiencia de un usuario
   */
  async updateUserExperience(userId: string, experience: number): Promise<User> {
    try {
      const updatedUser = await httpClient.patch<User>(`/users/${userId}/experience`, {
        experience,
      });
      return updatedUser;
    } catch (error) {
      console.error('Error al actualizar experiencia de usuario:', error);
      throw error;
    }
  }
}
