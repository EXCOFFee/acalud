// ============================================================================
// INTERFACE DEL SERVICIO DE USUARIOS
// ============================================================================
// Define el contrato para el servicio de usuarios siguiendo el principio
// de Dependency Inversion (SOLID)

import { User, UserStats, UserInventory } from '../../types';

/**
 * Interface que define las operaciones disponibles para el servicio de usuarios
 * Implementa el patrón Repository para abstraer la lógica de acceso a datos
 */
export interface IUserService {
  /**
   * Obtiene un usuario por su ID
   * @param userId - ID único del usuario
   * @returns Promise con el usuario encontrado o null
   */
  getUserById(userId: string): Promise<User | null>;

  /**
   * Obtiene un usuario por su email
   * @param email - Email del usuario
   * @returns Promise con el usuario encontrado o null
   */
  getUserByEmail(email: string): Promise<User | null>;

  /**
   * Crea un nuevo usuario en el sistema
   * @param userData - Datos del usuario a crear
   * @returns Promise con el usuario creado
   */
  createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User>;

  /**
   * Actualiza los datos de un usuario existente
   * @param userId - ID del usuario a actualizar
   * @param updates - Datos a actualizar
   * @returns Promise con el usuario actualizado
   */
  updateUser(userId: string, updates: Partial<User>): Promise<User>;

  /**
   * Elimina un usuario del sistema
   * @param userId - ID del usuario a eliminar
   * @returns Promise<void>
   */
  deleteUser(userId: string): Promise<void>;

  /**
   * Obtiene las estadísticas de un usuario
   * @param userId - ID del usuario
   * @returns Promise con las estadísticas del usuario
   */
  getUserStats(userId: string): Promise<UserStats>;

  /**
   * Obtiene el inventario de un usuario
   * @param userId - ID del usuario
   * @returns Promise con el inventario del usuario
   */
  getUserInventory(userId: string): Promise<UserInventory>;

  /**
   * Actualiza las monedas de un usuario
   * @param userId - ID del usuario
   * @param amount - Cantidad a agregar (puede ser negativa)
   * @returns Promise con el usuario actualizado
   */
  updateUserCoins(userId: string, amount: number): Promise<User>;

  /**
   * Actualiza la experiencia de un usuario
   * @param userId - ID del usuario
   * @param experience - Experiencia a agregar
   * @returns Promise con el usuario actualizado
   */
  updateUserExperience(userId: string, experience: number): Promise<User>;
}