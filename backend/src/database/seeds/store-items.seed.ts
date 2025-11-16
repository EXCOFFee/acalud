// ============================================================================
// SEED DE ITEMS DE TIENDA
// ============================================================================
// Datos iniciales para poblar el catálogo de la tienda cosmética

import { DataSource } from 'typeorm';
import { StoreItem, StoreItemType, ItemRarity, ItemAvailability } from '../../modules/store/entities/store-item.entity';

/**
 * Seed para crear items iniciales en la tienda
 * Incluye avatares, temas, insignias, accesorios y power-ups
 * Cada item tiene nombre en español, precio balanceado y rareza apropiada
 * 
 * @param dataSource - Conexión a la base de datos
 * @returns Cantidad de items creados
 */
export async function seedStoreItems(dataSource: DataSource): Promise<number> {
  console.log('🏪 Iniciando seed de items de tienda...');

  const storeItemRepository = dataSource.getRepository(StoreItem);

  // Verificar si ya existen items
  const existingCount = await storeItemRepository.count();
  if (existingCount > 0) {
    console.log(`⚠️  Ya existen ${existingCount} items en la tienda. Omitiendo seed.`);
    return existingCount;
  }

  /**
   * 🎭 AVATARES COMPLETOS
   * Cambios completos de apariencia del personaje
   */
  const avatars: Partial<StoreItem>[] = [
    {
      name: '🐱 Avatar Gato Estudioso',
      description: 'Un adorable gato con gafas y libros. Perfecto para los amantes de los felinos académicos.',
      type: StoreItemType.AVATAR,
      rarity: ItemRarity.COMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 50,
      imageUrl: '/assets/avatars/cat-student.png',
      tags: ['gato', 'animal', 'estudioso', 'lindo'],
      itemData: { icon: 'cat', color: 'orange', animation: 'bounce' }
    },
    {
      name: '🦊 Avatar Zorro Sabio',
      description: 'Un zorro astuto con pergamino. Para estudiantes inteligentes y estratégicos.',
      type: StoreItemType.AVATAR,
      rarity: ItemRarity.UNCOMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 100,
      imageUrl: '/assets/avatars/fox-sage.png',
      tags: ['zorro', 'sabio', 'animal', 'inteligente'],
      itemData: { icon: 'fox', color: 'amber', animation: 'glow' }
    },
    {
      name: '🦉 Avatar Búho Nocturno',
      description: 'Un búho misterioso bajo la luna. Ideal para quienes estudian de noche.',
      type: StoreItemType.AVATAR,
      rarity: ItemRarity.RARE,
      availability: ItemAvailability.AVAILABLE,
      price: 200,
      originalPrice: 250,
      imageUrl: '/assets/avatars/owl-night.png',
      tags: ['búho', 'nocturno', 'misterioso', 'luna'],
      itemData: { icon: 'moon', color: 'indigo', animation: 'float' }
    },
    {
      name: '🐉 Avatar Dragón Legendario',
      description: 'Un majestuoso dragón de sabiduría ancestral. El avatar más codiciado de todos.',
      type: StoreItemType.AVATAR,
      rarity: ItemRarity.LEGENDARY,
      availability: ItemAvailability.AVAILABLE,
      price: 500,
      imageUrl: '/assets/avatars/dragon-legendary.png',
      tags: ['dragón', 'legendario', 'poderoso', 'épico'],
      stockLimit: 100,
      itemData: { icon: 'flame', color: 'red', animation: 'pulse' }
    },
    {
      name: '🤖 Avatar Robot Futurista',
      description: 'Un robot de última generación. Para los amantes de la tecnología.',
      type: StoreItemType.AVATAR,
      rarity: ItemRarity.EPIC,
      availability: ItemAvailability.AVAILABLE,
      price: 350,
      imageUrl: '/assets/avatars/robot-future.png',
      tags: ['robot', 'tecnología', 'futurista', 'ciencia'],
      itemData: { icon: 'cpu', color: 'cyan', animation: 'spin' }
    }
  ];

  /**
   * 🎨 TEMAS VISUALES
   * Cambios de apariencia de la interfaz
   */
  const themes: Partial<StoreItem>[] = [
    {
      name: '🌙 Tema Noche Estrellada',
      description: 'Modo oscuro con estrellas brillantes. Perfecto para estudiar de noche sin cansar la vista.',
      type: StoreItemType.THEME,
      rarity: ItemRarity.COMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 30,
      imageUrl: '/assets/themes/starry-night.png',
      tags: ['oscuro', 'noche', 'estrellas', 'relajante'],
      itemData: { primaryColor: '#1a1a2e', secondaryColor: '#16213e', accentColor: '#ffd700' }
    },
    {
      name: '🌸 Tema Sakura Primaveral',
      description: 'Colores rosados y flores de cerezo. Ambiente fresco y motivador.',
      type: StoreItemType.THEME,
      rarity: ItemRarity.UNCOMMON,
      availability: ItemAvailability.SEASONAL,
      price: 75,
      imageUrl: '/assets/themes/sakura-spring.png',
      tags: ['rosa', 'flores', 'primavera', 'alegre'],
      itemData: { primaryColor: '#ffc0cb', secondaryColor: '#ffb6c1', accentColor: '#ff69b4' }
    },
    {
      name: '🌊 Tema Océano Profundo',
      description: 'Tonos azules del mar. Transmite calma y concentración.',
      type: StoreItemType.THEME,
      rarity: ItemRarity.RARE,
      availability: ItemAvailability.AVAILABLE,
      price: 150,
      imageUrl: '/assets/themes/deep-ocean.png',
      tags: ['azul', 'océano', 'calma', 'profundo'],
      itemData: { primaryColor: '#001f3f', secondaryColor: '#0074D9', accentColor: '#7FDBFF' }
    },
    {
      name: '🍂 Tema Bosque Otoñal',
      description: 'Colores cálidos del otoño. Ambiente acogedor y nostálgico.',
      type: StoreItemType.THEME,
      rarity: ItemRarity.RARE,
      availability: ItemAvailability.SEASONAL,
      price: 150,
      imageUrl: '/assets/themes/autumn-forest.png',
      tags: ['otoño', 'bosque', 'cálido', 'natural'],
      itemData: { primaryColor: '#8B4513', secondaryColor: '#D2691E', accentColor: '#FFD700' }
    },
    {
      name: '🌌 Tema Galaxia Infinita',
      description: 'Nebulosas y galaxias en todo su esplendor. Para los soñadores del espacio.',
      type: StoreItemType.THEME,
      rarity: ItemRarity.EPIC,
      availability: ItemAvailability.AVAILABLE,
      price: 250,
      imageUrl: '/assets/themes/infinite-galaxy.png',
      tags: ['espacio', 'galaxia', 'épico', 'cósmico'],
      itemData: { primaryColor: '#0a0e27', secondaryColor: '#16213e', accentColor: '#a855f7' }
    }
  ];

  /**
   * 🏆 INSIGNIAS ESPECIALES
   * Reconocimientos y logros visuales
   */
  const badges: Partial<StoreItem>[] = [
    {
      name: '⭐ Insignia de Honor',
      description: 'Reconocimiento básico a tu dedicación. Muestra tu compromiso con el aprendizaje.',
      type: StoreItemType.BADGE,
      rarity: ItemRarity.COMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 25,
      imageUrl: '/assets/badges/honor.png',
      tags: ['honor', 'dedicación', 'básico'],
      itemData: { icon: 'award', color: 'gold', shine: true }
    },
    {
      name: '🎖️ Insignia de Excelencia',
      description: 'Para estudiantes que buscan la perfección. Demuestra tu alto rendimiento.',
      type: StoreItemType.BADGE,
      rarity: ItemRarity.RARE,
      availability: ItemAvailability.AVAILABLE,
      price: 150,
      imageUrl: '/assets/badges/excellence.png',
      tags: ['excelencia', 'rendimiento', 'superior'],
      itemData: { icon: 'medal', color: 'platinum', shine: true }
    },
    {
      name: '👑 Insignia Real',
      description: 'Solo para los mejores de los mejores. Corona tu perfil con majestuosidad.',
      type: StoreItemType.BADGE,
      rarity: ItemRarity.LEGENDARY,
      availability: ItemAvailability.ACHIEVEMENT_LOCKED,
      price: 400,
      imageUrl: '/assets/badges/royal.png',
      tags: ['real', 'corona', 'legendario', 'élite'],
      itemData: { icon: 'crown', color: 'gold', shine: true, animated: true, requiredLevel: 20 }
    }
  ];

  /**
   * 🎩 ACCESORIOS DE AVATAR
   * Complementos para personalizar tu personaje
   */
  const accessories: Partial<StoreItem>[] = [
    {
      name: '🎓 Birrete Académico',
      description: 'Clásico sombrero de graduación. Para verdaderos académicos.',
      type: StoreItemType.AVATAR_ACCESSORY,
      rarity: ItemRarity.COMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 40,
      imageUrl: '/assets/accessories/graduation-cap.png',
      tags: ['sombrero', 'graduación', 'académico'],
      itemData: { slot: 'head', icon: 'graduation-cap', color: 'black' }
    },
    {
      name: '👓 Lentes de Sabio',
      description: 'Gafas redondas de intelectual. +10 de inteligencia percibida.',
      type: StoreItemType.AVATAR_ACCESSORY,
      rarity: ItemRarity.UNCOMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 60,
      imageUrl: '/assets/accessories/wise-glasses.png',
      tags: ['gafas', 'intelectual', 'sabio'],
      itemData: { slot: 'face', icon: 'glasses', color: 'gold' }
    },
    {
      name: '🎩 Sombrero de Mago',
      description: 'Alto sombrero púrpura con estrellas. Magia del conocimiento.',
      type: StoreItemType.AVATAR_ACCESSORY,
      rarity: ItemRarity.RARE,
      availability: ItemAvailability.AVAILABLE,
      price: 180,
      imageUrl: '/assets/accessories/wizard-hat.png',
      tags: ['sombrero', 'mago', 'mágico', 'estrellas'],
      itemData: { slot: 'head', icon: 'sparkles', color: 'purple' }
    },
    {
      name: '🦸 Capa de Héroe',
      description: 'Capa épica que ondea al viento. Para héroes del aprendizaje.',
      type: StoreItemType.AVATAR_ACCESSORY,
      rarity: ItemRarity.EPIC,
      availability: ItemAvailability.AVAILABLE,
      price: 300,
      imageUrl: '/assets/accessories/hero-cape.png',
      tags: ['capa', 'héroe', 'épico', 'ondulante'],
      itemData: { slot: 'back', icon: 'shield', color: 'red', animated: true }
    }
  ];

  /**
   * 🖼️ MARCOS DECORATIVOS
   * Bordes especiales para tu perfil
   */
  const frames: Partial<StoreItem>[] = [
    {
      name: '🟨 Marco Dorado Básico',
      description: 'Marco dorado simple y elegante. Dale un toque especial a tu perfil.',
      type: StoreItemType.FRAME,
      rarity: ItemRarity.COMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 35,
      imageUrl: '/assets/frames/basic-gold.png',
      tags: ['marco', 'dorado', 'básico', 'elegante'],
      itemData: { border: 'solid', color: '#FFD700', width: 3 }
    },
    {
      name: '💎 Marco de Diamante',
      description: 'Marco brillante con efecto de gemas. Lujo y distinción.',
      type: StoreItemType.FRAME,
      rarity: ItemRarity.EPIC,
      availability: ItemAvailability.AVAILABLE,
      price: 280,
      imageUrl: '/assets/frames/diamond.png',
      tags: ['marco', 'diamante', 'brillante', 'lujo'],
      itemData: { border: 'gradient', colors: ['#b9f2ff', '#ffffff', '#8be9fd'], width: 4, animated: true }
    },
    {
      name: '🔥 Marco de Fuego',
      description: 'Llamas ardientes rodean tu perfil. Pasión por el aprendizaje.',
      type: StoreItemType.FRAME,
      rarity: ItemRarity.LEGENDARY,
      availability: ItemAvailability.LIMITED_TIME,
      price: 450,
      imageUrl: '/assets/frames/fire.png',
      tags: ['marco', 'fuego', 'llamas', 'ardiente'],
      availableUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      itemData: { border: 'animated', colors: ['#ff6b6b', '#ffa500', '#ff0000'], width: 5, animated: true }
    }
  ];

  /**
   * ⚡ POWER-UPS TEMPORALES
   * Ventajas temporales en el juego
   */
  const powerups: Partial<StoreItem>[] = [
    {
      name: '⚡ Puntos Dobles (24h)',
      description: 'Duplica todos los puntos que ganes durante 24 horas. ¡Maximiza tu progreso!',
      type: StoreItemType.OTHER,
      rarity: ItemRarity.UNCOMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 80,
      imageUrl: '/assets/powerups/double-points.png',
      tags: ['power-up', 'puntos', 'temporal', 'multiplicador'],
      itemData: { effect: 'points_multiplier', value: 2, duration: 86400, consumable: true }
    },
    {
      name: '⏱️ Tiempo Extra (+30min)',
      description: 'Añade 30 minutos extra en tu próximo examen o actividad cronometrada.',
      type: StoreItemType.OTHER,
      rarity: ItemRarity.RARE,
      availability: ItemAvailability.AVAILABLE,
      price: 120,
      imageUrl: '/assets/powerups/extra-time.png',
      tags: ['power-up', 'tiempo', 'examen', 'ventaja'],
      itemData: { effect: 'time_extension', value: 1800, consumable: true }
    },
    {
      name: '💡 Pista Instantánea',
      description: 'Revela una pista útil en cualquier actividad. Úsala sabiamente.',
      type: StoreItemType.OTHER,
      rarity: ItemRarity.COMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 45,
      imageUrl: '/assets/powerups/instant-hint.png',
      tags: ['power-up', 'pista', 'ayuda', 'consumible'],
      itemData: { effect: 'hint', value: 1, consumable: true }
    }
  ];

  /**
   * 🎉 CELEBRACIONES Y EMOTES
   * Animaciones y efectos especiales
   */
  const celebrations: Partial<StoreItem>[] = [
    {
      name: '🎊 Confeti de Victoria',
      description: 'Explosión de confeti al completar actividades. ¡Celebra tus logros!',
      type: StoreItemType.CELEBRATION,
      rarity: ItemRarity.COMMON,
      availability: ItemAvailability.AVAILABLE,
      price: 55,
      imageUrl: '/assets/celebrations/confetti.png',
      tags: ['celebración', 'confeti', 'victoria', 'animación'],
      itemData: { animation: 'confetti', duration: 3, sound: 'celebration.mp3' }
    },
    {
      name: '✨ Lluvia de Estrellas',
      description: 'Estrellas caen del cielo cuando logras un 100%. Mágico y espectacular.',
      type: StoreItemType.CELEBRATION,
      rarity: ItemRarity.RARE,
      availability: ItemAvailability.AVAILABLE,
      price: 165,
      imageUrl: '/assets/celebrations/star-rain.png',
      tags: ['celebración', 'estrellas', 'mágico', 'épico'],
      itemData: { animation: 'star_rain', duration: 5, sound: 'magic.mp3' }
    },
    {
      name: '🏆 Trofeo Dorado',
      description: 'Un trofeo brillante aparece al conseguir logros importantes.',
      type: StoreItemType.CELEBRATION,
      rarity: ItemRarity.EPIC,
      availability: ItemAvailability.AVAILABLE,
      price: 240,
      imageUrl: '/assets/celebrations/golden-trophy.png',
      tags: ['celebración', 'trofeo', 'logro', 'dorado'],
      itemData: { animation: 'trophy_rise', duration: 4, sound: 'fanfare.mp3', glow: true }
    }
  ];

  // Combinar todos los items
  const allItems: Partial<StoreItem>[] = [
    ...avatars,
    ...themes,
    ...badges,
    ...accessories,
    ...frames,
    ...powerups,
    ...celebrations
  ];

  // Crear todos los items
  const createdItems: StoreItem[] = [];
  
  for (const itemData of allItems) {
    try {
      const item = storeItemRepository.create({
        ...itemData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const savedItem = await storeItemRepository.save(item);
      createdItems.push(savedItem);
      
      console.log(`  ✅ Creado: ${savedItem.name} (${savedItem.rarity}) - ${savedItem.price} monedas`);
    } catch (error) {
      console.error(`  ❌ Error creando item ${itemData.name}:`, error.message);
    }
  }

  console.log(`\n🎉 Seed completado: ${createdItems.length} items creados exitosamente`);
  console.log(`   📊 Distribución:`);
  console.log(`      • Avatares: ${avatars.length}`);
  console.log(`      • Temas: ${themes.length}`);
  console.log(`      • Insignias: ${badges.length}`);
  console.log(`      • Accesorios: ${accessories.length}`);
  console.log(`      • Marcos: ${frames.length}`);
  console.log(`      • Power-ups: ${powerups.length}`);
  console.log(`      • Celebraciones: ${celebrations.length}`);

  return createdItems.length;
}

/**
 * Ejecutar seed si se llama directamente
 */
if (require.main === module) {
  // Este código solo se ejecuta si el archivo se llama directamente
  console.log('⚠️  Este seed debe ejecutarse a través del script de seed principal');
  console.log('   Usa: npm run seed');
}
