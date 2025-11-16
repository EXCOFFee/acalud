// ============================================================================
// SERVICIO DE TIENDA
// ============================================================================
// Maneja todas las interacciones con el backend de la tienda cosmética

/**
 * ⚠️ IMPORTANTE: Este servicio se comunica con el backend real
 * Endpoints utilizados:
 * - GET /api/v1/store/items - Obtener catálogo de items
 * - GET /api/v1/store/items/:id - Obtener detalles de un item
 * - POST /api/v1/store/purchase - Comprar item(s)
 * - GET /api/v1/store/inventory - Obtener inventario del usuario
 * - PATCH /api/v1/store/inventory/:purchaseId/equip - Equipar/desequipar item
 * - GET /api/v1/store/inventory/equipped - Obtener items equipados
 */

// URL base del API
const API_URL = 'http://localhost:3001/api/v1';

/**
 * Interfaz para un item de la tienda
 * Representa un artículo cosmético disponible para compra
 */
export interface StoreItem {
  id: string;
  name: string;
  description: string;
  type: 'avatar' | 'avatar_accessory' | 'avatar_clothing' | 'avatar_background' | 
        'theme' | 'emote' | 'sound_pack' | 'celebration' | 'frame' | 'badge' | 'other';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'limited';
  availability: 'available' | 'limited_time' | 'seasonal' | 'event_exclusive' | 
                'achievement_locked' | 'level_locked' | 'disabled' | 'retired';
  price: number;
  originalPrice?: number;
  imageUrl: string;
  additionalImages?: string[];
  itemData?: Record<string, unknown>;
  tags?: string[];
  isActive: boolean;
  isOnSale: boolean;
  discountPercentage?: number;
  stockLimit?: number;
  availableFrom?: string;
  availableUntil?: string;
  requiredAchievements?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz para la compra de un item
 * Representa un item que el usuario ha adquirido
 */
export interface UserPurchase {
  id: string;
  userId: string;
  itemId: string;
  purchasePrice: number;
  isEquipped: boolean;
  purchasedAt: string;
  equippedAt?: string;
  item: StoreItem;
}

/**
 * Interfaz para el filtro de items
 * Parámetros opcionales para filtrar el catálogo
 */
export interface StoreFilterOptions {
  type?: string;
  rarity?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: string;
  search?: string;
  isOnSale?: boolean;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Interfaz para la respuesta paginada
 * Estructura estándar para listas de items
 */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  timestamp: string;
}

/**
 * Interfaz para la solicitud de compra
 * Datos necesarios para realizar una compra
 */
export interface PurchaseRequest {
  itemId: string;
  quantity?: number;
}

/**
 * Servicio para interactuar con el sistema de tienda
 * Proporciona métodos para explorar, comprar y gestionar items cosméticos
 * 
 * @example
 * ```typescript
 * const storeService = new StoreService();
 * 
 * // Obtener items disponibles
 * const items = await storeService.getItems({ type: 'avatar', rarity: 'rare' });
 * 
 * // Comprar un item
 * const purchase = await storeService.purchaseItem('item-id-123');
 * 
 * // Ver inventario
 * const inventory = await storeService.getInventory();
 * ```
 */
export class StoreService {
  /**
   * Obtener el token de autenticación desde storage seguro
   * @returns Token JWT o null si no está autenticado
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage.getItem('acalud_token');
    } catch (error) {
      console.warn('No fue posible acceder a localStorage para recuperar el token', error);
      return null;
    }
  }

  /**
   * Crear headers para las peticiones HTTP
   * Incluye token de autenticación si está disponible
   * @returns Headers configurados
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 🛍️ Obtener catálogo de items de la tienda
   * Recupera la lista de items disponibles con filtros opcionales
   * 
   * @param filters - Filtros opcionales para búsqueda
   * @returns Lista paginada de items
   * @throws Error si la petición falla
   */
  async getItems(filters?: StoreFilterOptions): Promise<PaginatedResponse<StoreItem>> {
    try {
      // Construir query string con filtros
      const queryParams = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, v.toString()));
            } else {
              queryParams.append(key, value.toString());
            }
          }
        });
      }

      const url = `${API_URL}/store/items${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al cargar items de la tienda');
      }

      const data = await response.json();
      console.log('🛍️ Items de tienda cargados:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error al obtener items:', error);
      throw error;
    }
  }

  /**
   * 🔍 Obtener detalles de un item específico
   * Recupera información completa de un item por su ID
   * 
   * @param itemId - ID del item a consultar
   * @returns Detalles completos del item
   * @throws Error si el item no existe o hay error de red
   */
  async getItemById(itemId: string): Promise<StoreItem> {
    try {
      const response = await fetch(`${API_URL}/store/items/${itemId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Item no encontrado');
      }

      const data = await response.json();
      console.log('🔍 Detalles de item:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error al obtener item:', error);
      throw error;
    }
  }

  /**
   * 💰 Comprar un item de la tienda
   * Realiza la compra de un item usando las monedas del usuario
   * 
   * @param itemId - ID del item a comprar
   * @param quantity - Cantidad a comprar (default: 1)
   * @returns Registro de la compra realizada
   * @throws Error si no hay fondos suficientes o el item no está disponible
   */
  async purchaseItem(itemId: string, quantity: number = 1): Promise<UserPurchase> {
    try {
      const response = await fetch(`${API_URL}/store/purchase`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ storeItemId: itemId, quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al realizar la compra');
      }

      const data = await response.json();
      console.log('💰 Compra realizada exitosamente:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error al realizar la compra:', error);
      throw error;
    }
  }

  /**
   * 🎒 Obtener inventario del usuario
   * Recupera todos los items que el usuario ha comprado
   *
   * @param filters - Filtros opcionales (tipo, equipado, etc.)
   * @returns Lista de items en el inventario
   * @throws Error si hay problemas de red o autenticación
   */
  async getInventory(filters?: {
    type?: string;
    isEquipped?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<UserPurchase>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${API_URL}/store/inventory${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al cargar inventario');
      }

      const data = await response.json();
      console.log('🎒 Inventario cargado:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error al obtener inventario:', error);
      throw error;
    }
  }

  /**
   * ⚡ Equipar o desequipar un item
   * Cambia el estado de equipado de un item en el inventario
   * 
   * @param purchaseId - ID de la compra (no del item)
   * @param equip - true para equipar, false para desequipar
   * @returns Item actualizado
   * @throws Error si el item no existe en el inventario
   */
  async equipItem(purchaseId: string, equip: boolean): Promise<UserPurchase> {
    try {
      const response = await fetch(`${API_URL}/store/inventory/${purchaseId}/equip`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ equip }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al equipar item');
      }

      const data = await response.json();
      console.log(`⚡ Item ${equip ? 'equipado' : 'desequipado'}:`, data);
      
      return data;
    } catch (error) {
      console.error('❌ Error al equipar item:', error);
      throw error;
    }
  }

  /**
   * 🎭 Obtener items equipados actualmente
   * Recupera solo los items que el usuario tiene equipados
   * 
   * @returns Lista de items equipados
   * @throws Error si hay problemas de autenticación o red
   */
  async getEquippedItems(): Promise<UserPurchase[]> {
    try {
      const response = await fetch(`${API_URL}/store/inventory/equipped`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al cargar items equipados');
      }

      const data = await response.json();
      console.log('🎭 Items equipados:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error al obtener items equipados:', error);
      throw error;
    }
  }

  /**
   * 💎 Verificar si el usuario puede comprar un item
   * Valida si el usuario tiene suficientes monedas
   * 
   * @param itemPrice - Precio del item
   * @param userCoins - Monedas disponibles del usuario
   * @returns true si puede comprar, false si no
   */
  canAfford(itemPrice: number, userCoins: number): boolean {
    return userCoins >= itemPrice;
  }

  /**
   * 🏷️ Calcular precio con descuento
   * Si el item está en oferta, calcula el precio final
   * 
   * @param item - Item de la tienda
   * @returns Precio final a pagar
   */
  getFinalPrice(item: StoreItem): number {
    if (item.isOnSale && item.originalPrice) {
      return item.price; // El precio ya incluye el descuento
    }
    return item.price;
  }

  /**
   * 🎨 Obtener color según rareza
   * Retorna el color asociado a cada nivel de rareza
   * 
   * @param rarity - Nivel de rareza del item
   * @returns Nombre del color para CSS
   */
  getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: 'gray',
      uncommon: 'green',
      rare: 'blue',
      epic: 'purple',
      legendary: 'yellow',
      limited: 'red'
    };
    return colors[rarity] || 'gray';
  }

  /**
   * ✨ Obtener emoji según tipo de item
   * Retorna un emoji representativo para cada tipo
   * 
   * @param type - Tipo de item
   * @returns Emoji correspondiente
   */
  getTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      avatar: '🎭',
      avatar_accessory: '🎩',
      avatar_clothing: '👔',
      avatar_background: '🖼️',
      theme: '🎨',
      emote: '😄',
      sound_pack: '🔊',
      celebration: '🎉',
      frame: '🖼️',
      badge: '🏆',
      other: '✨'
    };
    return emojis[type] || '📦';
  }
}

// Exportar instancia singleton para uso en componentes
export const storeService = new StoreService();
