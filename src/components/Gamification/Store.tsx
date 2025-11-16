// ============================================================================
// TIENDA VIRTUAL
// ============================================================================
// Sistema de recompensas donde los estudiantes pueden canjear sus monedas

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { storeService } from '../../services/store.service';
import type { StoreItem as BackendStoreItem, UserPurchase } from '../../services/store.service';
import type { LucideIcon } from 'lucide-react';
import { 
  ShoppingBag, 
  Coins,
  Star,
  Crown,
  Trophy,
  Heart,
  Palette,
  Gift,
  Zap,
  Shield,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  Plus,
  Minus,
  ShoppingCart,
  Wallet,
  Package
} from 'lucide-react';

/**
 * Props del componente Store
 */
interface StoreProps {
  onBack: () => void;
}

/**
 * Tipos de items de la tienda (extendidos del backend)
 */
interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string; // Mapeado desde type del backend
  icon: LucideIcon;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'limited';
  isOwned: boolean;
  isEquipped?: boolean;
  imageUrl?: string;
  tags?: string[];
  purchaseId?: string; // ID de la compra si es owned
  type?: string; // Tipo original del backend
  isLimited?: boolean; // Si es un item limitado
  limitedQuantity?: number; // Cantidad disponible si es limitado
}

/**
 * Categorías de la tienda
 */
interface StoreCategory {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

/**
 * Carrito de compras
 */
interface CartItem {
  item: StoreItem;
  quantity: number;
}

/**
 * Estado del usuario (obtenido del contexto de auth)
 */
interface UserWallet {
  coins: number;
}

/**
 * 🔄 Mapear tipo del backend a categoría del UI
 * Convierte los tipos del backend a categorías mostradas en el UI
 */
const mapTypeToCategory = (type: string): string => {
  const mapping: Record<string, string> = {
    'avatar': 'avatars',
    'avatar_accessory': 'avatars',
    'avatar_clothing': 'avatars',
    'avatar_background': 'avatars',
    'theme': 'themes',
    'badge': 'badges',
    'frame': 'badges',
    'emote': 'power-ups',
    'celebration': 'power-ups',
    'sound_pack': 'power-ups',
    'other': 'rewards'
  };
  return mapping[type] || 'rewards';
};

/**
 * 🎨 Obtener icono según tipo de item
 * Asigna un icono de Lucide React a cada tipo
 */
const getIconForType = (type: string): LucideIcon => {
  const icons: Record<string, LucideIcon> = {
    'avatar': Crown,
    'avatar_accessory': Shield,
    'avatar_clothing': Heart,
    'avatar_background': Palette,
    'theme': Palette,
    'badge': Trophy,
    'frame': Package,
    'emote': Sparkles,
    'celebration': Gift,
    'sound_pack': Zap,
    'other': Star
  };
  return icons[type] || ShoppingBag;
};

/**
 * 🎨 Obtener color según tipo
 */
const getColorForType = (type: string): string => {
  const colors: Record<string, string> = {
    'avatar': 'purple',
    'theme': 'pink',
    'badge': 'yellow',
    'frame': 'blue',
    'celebration': 'green',
    'other': 'gray'
  };
  return colors[type] || 'indigo';
};

const mapBackendItemToStoreItem = (
  backendItem: BackendStoreItem,
  ownedItemIds: string[],
  equippedPurchases: UserPurchase[],
  inventoryItems: UserPurchase[]
): StoreItem => ({
  id: backendItem.id,
  name: backendItem.name,
  description: backendItem.description,
  price: backendItem.price,
  category: mapTypeToCategory(backendItem.type),
  type: backendItem.type,
  icon: getIconForType(backendItem.type),
  color: getColorForType(backendItem.type),
  rarity: backendItem.rarity,
  isOwned: ownedItemIds.includes(backendItem.id),
  isEquipped: equippedPurchases.some(purchase => purchase.itemId === backendItem.id),
  imageUrl: backendItem.imageUrl,
  tags: backendItem.tags,
  purchaseId: inventoryItems.find(purchase => purchase.itemId === backendItem.id)?.id,
  isLimited: backendItem.rarity === 'limited' || backendItem.availability === 'limited_time',
  limitedQuantity: backendItem.stockLimit ?? undefined
});

/**
 * Componente de la tienda virtual
 * Permite a los estudiantes canjear monedas por recompensas
 */
export const Store: React.FC<StoreProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [userWallet, setUserWallet] = useState<UserWallet | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{
    success: boolean;
    message: string;
    items?: StoreItem[];
  } | null>(null);

  /**
   * Categorías de la tienda
   */
  const categories: StoreCategory[] = [
    {
      id: 'all',
      name: 'Todo',
      description: 'Ver todos los items',
      icon: ShoppingBag,
      color: 'indigo'
    },
    {
      id: 'avatars',
      name: 'Avatares',
      description: 'Personaliza tu perfil',
      icon: Crown,
      color: 'purple'
    },
    {
      id: 'themes',
      name: 'Temas',
      description: 'Cambia la apariencia',
      icon: Palette,
      color: 'pink'
    },
    {
      id: 'badges',
      name: 'Insignias',
      description: 'Muestra tus logros',
      icon: Trophy,
      color: 'yellow'
    },
    {
      id: 'power-ups',
      name: 'Power-ups',
      description: 'Ventajas temporales',
      icon: Zap,
      color: 'blue'
    },
    {
      id: 'rewards',
      name: 'Recompensas',
      description: 'Premios especiales',
      icon: Gift,
      color: 'green'
    }
  ];

  /**
   * 🔄 Cargar datos del backend
   * Obtiene items de la tienda e inventario del usuario
   */
  useEffect(() => {
    const loadStoreData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        // Cargar balance del usuario desde el contexto de auth
        setUserWallet({
          coins: user.coins || 0
        });

        // Cargar items de la tienda desde el backend
        const itemsResponse = await storeService.getItems({
          page: 1,
          limit: 100,
          sortBy: 'price',
          sortOrder: 'ASC'
        });

        // Cargar inventario del usuario
        const inventoryResponse = await storeService.getInventory();
        const inventoryItems = inventoryResponse.data ?? [];
        const ownedItemIds = inventoryItems.map(purchase => purchase.itemId);
        const equippedPurchases = inventoryItems.filter(purchase => purchase.isEquipped);

        // Mapear items del backend al formato del UI
        const items = itemsResponse.data ?? [];
        const mappedItems: StoreItem[] = items.map(backendItem =>
          mapBackendItemToStoreItem(backendItem, ownedItemIds, equippedPurchases, inventoryItems)
        );

        setStoreItems(mappedItems);

        console.log('🛍️ Tienda cargada:', {
          totalItems: mappedItems.length,
          ownedItems: ownedItemIds.length,
          userCoins: user.coins
        });

      } catch (error) {
        console.error('❌ Error al cargar tienda:', error);
        setError('Error al cargar la tienda. Intenta recargar la página.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoreData();
  }, [user]);

  /**
   * Filtrar items por categoría
   */
  const filteredItems = selectedCategory === 'all' 
    ? storeItems 
    : storeItems.filter(item => item.category === selectedCategory);

  /**
   * Agregar item al carrito
   */
  const addToCart = (item: StoreItem) => {
    if (item.isOwned) return;

    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.item.id === item.id);
      
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { item, quantity: 1 }];
      }
    });
  };

  /**
   * Remover item del carrito
   */
  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(cartItem => cartItem.item.id !== itemId));
  };

  /**
   * Actualizar cantidad en carrito
   */
  const updateCartQuantity = (itemId: string, change: number) => {
    setCart(prevCart => {
      return prevCart.map(cartItem => {
        if (cartItem.item.id === itemId) {
          const newQuantity = Math.max(0, cartItem.quantity + change);
          return newQuantity > 0 ? { ...cartItem, quantity: newQuantity } : null;
        }
        return cartItem;
      }).filter(Boolean) as CartItem[];
    });
  };

  /**
   * Calcular total del carrito
   */
  const cartTotal = cart.reduce((total, cartItem) => 
    total + (cartItem.item.price * cartItem.quantity), 0);

  /**
   * 💰 Procesar compra con el backend
   * Envía solicitud de compra al servidor y actualiza el estado local
   */
  const processPurchase = async () => {
    if (!userWallet || cartTotal > userWallet.coins) {
      setPurchaseResult({
        success: false,
        message: 'No tienes suficientes monedas para esta compra.'
      });
      return;
    }

    try {
      // Procesar cada item del carrito
      const purchasePromises = cart.map(async (cartItem) => {
        try {
          // Llamar al backend para comprar el item
          const result = await storeService.purchaseItem(cartItem.item.id, cartItem.quantity);
          return { success: true, item: cartItem.item, result };
        } catch (error) {
          console.error(`Error comprando ${cartItem.item.name}:`, error);
          return { success: false, item: cartItem.item, error };
        }
      });

      const results = await Promise.all(purchasePromises);
      const successfulPurchases = results.filter(r => r.success);
      const failedPurchases = results.filter(r => !r.success);

      // Actualizar balance local (restar el total gastado)
      if (successfulPurchases.length > 0) {
        setUserWallet({
          coins: userWallet.coins - cartTotal
        });

        // Recargar items para reflejar cambios
        const itemsResponse = await storeService.getItems({
          page: 1,
          limit: 100,
          sortBy: 'price',
          sortOrder: 'ASC'
        });

        const inventoryResponse = await storeService.getInventory();
        const inventoryItems = inventoryResponse.data ?? [];
        const ownedItemIds = inventoryItems.map(purchase => purchase.itemId);
        const equippedPurchases = inventoryItems.filter(purchase => purchase.isEquipped);

        const items = itemsResponse.data ?? [];
        const mappedItems: StoreItem[] = items.map(backendItem =>
          mapBackendItemToStoreItem(backendItem, ownedItemIds, equippedPurchases, inventoryItems)
        );

        setStoreItems(mappedItems);
      }

      // Mostrar resultado
      if (failedPurchases.length === 0) {
        setPurchaseResult({
          success: true,
          message: `¡Compra exitosa! Has adquirido ${successfulPurchases.length} item(s).`,
          items: successfulPurchases.map(p => p.item)
        });
      } else {
        setPurchaseResult({
          success: false,
          message: `Se compraron ${successfulPurchases.length} items, pero ${failedPurchases.length} fallaron.`
        });
      }

      // Limpiar carrito solo con items exitosos
      setCart(prevCart => 
        prevCart.filter(cartItem => 
          !successfulPurchases.some(sp => sp.item.id === cartItem.item.id)
        )
      );

      console.log('🎉 Compra procesada:', {
        exitosos: successfulPurchases.length,
        fallidos: failedPurchases.length,
        nuevoBalance: userWallet.coins - cartTotal
      });

    } catch (error) {
      console.error('❌ Error en compra:', error);
      setPurchaseResult({
        success: false,
        message: 'Error al procesar la compra. Intenta de nuevo.'
      });
    }
  };

  /**
   * Obtener color según rareza
   */
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'gray';
      case 'rare': return 'blue';
      case 'epic': return 'purple';
      case 'legendary': return 'yellow';
      default: return 'gray';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Tienda Virtual</h1>
                <p className="text-gray-600 mt-1">
                  Canjea tus monedas por increíbles recompensas
                </p>
              </div>
            </div>

            {/* Wallet display */}
            {userWallet && (
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center space-x-3">
                  <Wallet className="w-8 h-8" />
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Tu Billetera</p>
                    <p className="text-2xl font-bold">{userWallet.coins}</p>
                    <div className="flex items-center space-x-1 text-sm text-yellow-100">
                      <Coins className="w-4 h-4" />
                      <span>monedas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Filtros por categoría */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Categorías</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {categories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;
                const categoryItems = category.id === 'all' 
                  ? storeItems 
                  : storeItems.filter(item => item.category === category.id);
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? `border-${category.color}-500 bg-${category.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                      isSelected ? `bg-${category.color}-100` : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        isSelected ? `text-${category.color}-600` : 'text-gray-600'
                      }`} />
                    </div>
                    <h3 className={`font-semibold text-sm ${
                      isSelected ? `text-${category.color}-900` : 'text-gray-900'
                    }`}>
                      {category.name}
                    </h3>
                    <p className={`text-xs ${
                      isSelected ? `text-${category.color}-700` : 'text-gray-600'
                    }`}>
                      {categoryItems.length} items
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Lista de productos */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const rarityColor = getRarityColor(item.rarity);
                const inCart = cart.some(cartItem => cartItem.item.id === item.id);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                      item.isOwned 
                        ? 'border-green-200 ring-2 ring-green-100' 
                        : `border-${rarityColor}-200`
                    }`}
                  >
                    {/* Header con rareza */}
                    <div className={`p-4 bg-gradient-to-r ${
                      item.rarity === 'legendary' ? 'from-yellow-400 to-yellow-500' :
                      item.rarity === 'epic' ? 'from-purple-400 to-purple-500' :
                      item.rarity === 'rare' ? 'from-blue-400 to-blue-500' :
                      'from-gray-400 to-gray-500'
                    }`}>
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-6 h-6" />
                          <span className="text-sm font-medium capitalize">{item.rarity}</span>
                        </div>
                        {item.isLimited && (
                          <div className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                            Limitado
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        </div>
                        {item.isOwned && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-xs font-medium">Poseído</span>
                          </div>
                        )}
                      </div>

                      {/* Precio */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Coins className="w-5 h-5 text-yellow-500" />
                          <span className="text-xl font-bold text-gray-900">{item.price}</span>
                        </div>
                        {item.isEquipped && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Equipado
                          </span>
                        )}
                      </div>

                      {/* Botón de acción */}
                      {item.isOwned ? (
                        <button
                          disabled
                          className="w-full bg-green-100 text-green-800 py-2 px-4 rounded-lg font-medium"
                        >
                          Ya lo posees
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {!inCart ? (
                            <button
                              onClick={() => addToCart(item)}
                              disabled={userWallet ? userWallet.coins < item.price : true}
                              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                                userWallet && userWallet.coins >= item.price
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {userWallet && userWallet.coins >= item.price 
                                ? 'Agregar al Carrito' 
                                : 'Monedas insuficientes'
                              }
                            </button>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateCartQuantity(item.id, -1)}
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="flex-1 text-center py-2 bg-purple-100 text-purple-800 rounded-lg font-medium">
                                En carrito ({cart.find(c => c.item.id === item.id)?.quantity || 0})
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.id, 1)}
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Carrito de compras */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Carrito</h3>
                  {cart.length > 0 && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                      {cart.length}
                    </span>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Tu carrito está vacío</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Agrega algunos items para comenzar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Items en carrito */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((cartItem) => {
                        const Icon = cartItem.item.icon;
                        return (
                          <div
                            key={cartItem.item.id}
                            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-${cartItem.item.color}-100 flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 text-${cartItem.item.color}-600`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {cartItem.item.name}
                              </p>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Coins className="w-3 h-3" />
                                <span>{cartItem.item.price} × {cartItem.quantity}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFromCart(cartItem.item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                        <div className="flex items-center space-x-1">
                          <Coins className="w-5 h-5 text-yellow-500" />
                          <span className="text-xl font-bold text-gray-900">{cartTotal}</span>
                        </div>
                      </div>

                      {/* Botón de compra */}
                      <button
                        onClick={() => setShowPurchaseModal(true)}
                        disabled={!userWallet || cartTotal > userWallet.coins}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                          userWallet && cartTotal <= userWallet.coins
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {userWallet && cartTotal <= userWallet.coins 
                          ? 'Comprar Ahora' 
                          : 'Monedas insuficientes'
                        }
                      </button>

                      {userWallet && cartTotal > userWallet.coins && (
                        <p className="text-xs text-red-600 mt-2 text-center">
                          Te faltan {cartTotal - userWallet.coins} monedas
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de confirmación de compra */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirmar Compra
              </h3>
              
              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-600">
                  Estás a punto de comprar {cart.length} item(s) por un total de:
                </p>
                <div className="flex items-center justify-center space-x-2 text-2xl font-bold text-gray-900">
                  <Coins className="w-6 h-6 text-yellow-500" />
                  <span>{cartTotal}</span>
                </div>
                {userWallet && (
                  <p className="text-sm text-gray-600 text-center">
                    Te quedarán {userWallet.coins - cartTotal} monedas
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowPurchaseModal(false);
                    processPurchase();
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de resultado de compra */}
        {purchaseResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center">
                {purchaseResult.success ? (
                  <div className="text-green-600 mb-4">
                    <Check className="w-16 h-16 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">¡Compra Exitosa!</h3>
                  </div>
                ) : (
                  <div className="text-red-600 mb-4">
                    <X className="w-16 h-16 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Error en la Compra</h3>
                  </div>
                )}
                
                <p className="text-gray-600 mb-6">{purchaseResult.message}</p>
                
                <button
                  onClick={() => setPurchaseResult(null)}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
