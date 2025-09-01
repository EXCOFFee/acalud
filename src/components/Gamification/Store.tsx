// ============================================================================
// TIENDA VIRTUAL
// ============================================================================
// Sistema de recompensas donde los estudiantes pueden canjear sus monedas

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ShoppingBag, 
  Coins,
  Star,
  Crown,
  Trophy,
  Heart,
  Palette,
  Gift,
  Clock,
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
 * Tipos de items de la tienda
 */
interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'avatars' | 'themes' | 'badges' | 'power-ups' | 'rewards';
  icon: any;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isOwned: boolean;
  isEquipped?: boolean;
  isLimited?: boolean;
  limitedQuantity?: number;
  previewImage?: string;
}

/**
 * Categorías de la tienda
 */
interface StoreCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
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
 * Estado del usuario
 */
interface UserWallet {
  coins: number;
  totalEarned: number;
  totalSpent: number;
  ownedItems: string[];
  equippedItems: string[];
}

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
   * Definir items de la tienda
   */
  const defineStoreItems = (wallet: UserWallet): StoreItem[] => {
    return [
      // Avatares
      {
        id: 'avatar_ninja',
        name: 'Avatar Ninja',
        description: 'Un avatar sigiloso para estudiantes veloces',
        price: 50,
        category: 'avatars',
        icon: Shield,
        color: 'gray',
        rarity: 'common',
        isOwned: wallet.ownedItems.includes('avatar_ninja'),
        isEquipped: wallet.equippedItems.includes('avatar_ninja')
      },
      {
        id: 'avatar_wizard',
        name: 'Avatar Mago',
        description: 'Para los sabios del aprendizaje',
        price: 100,
        category: 'avatars',
        icon: Sparkles,
        color: 'purple',
        rarity: 'rare',
        isOwned: wallet.ownedItems.includes('avatar_wizard'),
        isEquipped: wallet.equippedItems.includes('avatar_wizard')
      },
      {
        id: 'avatar_dragon',
        name: 'Avatar Dragón',
        description: 'El avatar más poderoso disponible',
        price: 500,
        category: 'avatars',
        icon: Crown,
        color: 'red',
        rarity: 'legendary',
        isOwned: wallet.ownedItems.includes('avatar_dragon'),
        isEquipped: wallet.equippedItems.includes('avatar_dragon'),
        isLimited: true,
        limitedQuantity: 50
      },

      // Temas
      {
        id: 'theme_dark',
        name: 'Tema Oscuro',
        description: 'Perfecto para estudiar de noche',
        price: 30,
        category: 'themes',
        icon: Palette,
        color: 'gray',
        rarity: 'common',
        isOwned: wallet.ownedItems.includes('theme_dark'),
        isEquipped: wallet.equippedItems.includes('theme_dark')
      },
      {
        id: 'theme_nature',
        name: 'Tema Naturaleza',
        description: 'Colores verdes relajantes',
        price: 75,
        category: 'themes',
        icon: Heart,
        color: 'green',
        rarity: 'rare',
        isOwned: wallet.ownedItems.includes('theme_nature'),
        isEquipped: wallet.equippedItems.includes('theme_nature')
      },
      {
        id: 'theme_galaxy',
        name: 'Tema Galaxia',
        description: 'Explora el cosmos mientras estudias',
        price: 200,
        category: 'themes',
        icon: Star,
        color: 'purple',
        rarity: 'epic',
        isOwned: wallet.ownedItems.includes('theme_galaxy'),
        isEquipped: wallet.equippedItems.includes('theme_galaxy')
      },

      // Insignias
      {
        id: 'badge_honor',
        name: 'Insignia de Honor',
        description: 'Muestra tu dedicación al estudio',
        price: 25,
        category: 'badges',
        icon: Trophy,
        color: 'yellow',
        rarity: 'common',
        isOwned: wallet.ownedItems.includes('badge_honor'),
        isEquipped: wallet.equippedItems.includes('badge_honor')
      },
      {
        id: 'badge_excellence',
        name: 'Insignia de Excelencia',
        description: 'Para estudiantes sobresalientes',
        price: 150,
        category: 'badges',
        icon: Crown,
        color: 'gold',
        rarity: 'epic',
        isOwned: wallet.ownedItems.includes('badge_excellence'),
        isEquipped: wallet.equippedItems.includes('badge_excellence')
      },

      // Power-ups
      {
        id: 'powerup_double_points',
        name: 'Puntos Dobles',
        description: 'Duplica los puntos por 24 horas',
        price: 40,
        category: 'power-ups',
        icon: Zap,
        color: 'blue',
        rarity: 'common',
        isOwned: false // Los power-ups no se "poseen", se consumen
      },
      {
        id: 'powerup_time_freeze',
        name: 'Congelar Tiempo',
        description: 'Detiene el cronómetro por 5 minutos',
        price: 60,
        category: 'power-ups',
        icon: Clock,
        color: 'cyan',
        rarity: 'rare',
        isOwned: false
      },
      {
        id: 'powerup_hint_master',
        name: 'Maestro de Pistas',
        description: 'Pistas ilimitadas por 1 hora',
        price: 80,
        category: 'power-ups',
        icon: Sparkles,
        color: 'yellow',
        rarity: 'rare',
        isOwned: false
      },

      // Recompensas especiales
      {
        id: 'reward_homework_pass',
        name: 'Pase de Tarea',
        description: 'Salta una tarea asignada (solo con permiso del profesor)',
        price: 300,
        category: 'rewards',
        icon: Gift,
        color: 'green',
        rarity: 'epic',
        isOwned: false,
        isLimited: true,
        limitedQuantity: 10
      },
      {
        id: 'reward_extra_time',
        name: 'Tiempo Extra',
        description: '+30 minutos en el próximo examen',
        price: 250,
        category: 'rewards',
        icon: Plus,
        color: 'orange',
        rarity: 'epic',
        isOwned: false
      }
    ];
  };

  /**
   * Cargar datos del usuario y tienda
   */
  useEffect(() => {
    const loadStoreData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        // Simular datos del usuario (en producción vendría del backend)
        const mockWallet: UserWallet = {
          coins: 275,
          totalEarned: 450,
          totalSpent: 175,
          ownedItems: ['avatar_ninja', 'theme_dark', 'badge_honor'],
          equippedItems: ['avatar_ninja', 'theme_dark']
        };

        setUserWallet(mockWallet);
        
        // Generar items con estado de propiedad
        const items = defineStoreItems(mockWallet);
        setStoreItems(items);

      } catch (error) {
        console.error('Error al cargar tienda:', error);
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
   * Procesar compra
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
      // Simular procesamiento de compra
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Actualizar wallet del usuario
      const newWallet = {
        ...userWallet,
        coins: userWallet.coins - cartTotal,
        totalSpent: userWallet.totalSpent + cartTotal,
        ownedItems: [...userWallet.ownedItems, ...cart.map(item => item.item.id)]
      };

      setUserWallet(newWallet);

      // Actualizar items como poseídos
      setStoreItems(prevItems => 
        prevItems.map(item => {
          const cartItem = cart.find(c => c.item.id === item.id);
          return cartItem ? { ...item, isOwned: true } : item;
        })
      );

      setPurchaseResult({
        success: true,
        message: `¡Compra exitosa! Has adquirido ${cart.length} item(s).`,
        items: cart.map(c => c.item)
      });

      // Limpiar carrito
      setCart([]);

    } catch (error) {
      console.error('Error en compra:', error);
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
