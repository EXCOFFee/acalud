// ============================================================================
// 🎮 ÍNDICE DE COMPONENTES DE JUEGOS - ACALUD
// ============================================================================
/**
 * 🎯 PROPÓSITO:
 * Archivo de índice para exportar todos los componentes de juegos educativos.
 * Facilita las importaciones y mantiene una interfaz limpia para el resto de la aplicación.
 * 
 * 🔄 USO:
 * import { TriviaGame, CrosswordGame } from './components/Games';
 */

// 🧠 Componente de Trivia
export { TriviaGame, TriviaGameComponent } from './TriviaGame';

// 🧩 Componente de Crucigrama  
export { CrosswordGame, CrosswordGameComponent } from './CrosswordGame';

// 🎭 Componente de Simulación (próximamente)
// export { SimulationGame, SimulationGameComponent } from './SimulationGame';

// 📝 Re-exportar tipos relacionados con props de componentes
export type { 
  // Props de TriviaGame se exportan desde el componente
} from './TriviaGame';

export type {
  // Props de CrosswordGame se exportan desde el componente  
} from './CrosswordGame';

// 🎮 Lista de todos los componentes disponibles
export const AVAILABLE_GAME_COMPONENTS = [
  'TriviaGame',
  'CrosswordGame'
  // 'SimulationGame' // Próximamente
] as const;

// 🎯 Tipo para componentes de juegos disponibles
export type GameComponentType = typeof AVAILABLE_GAME_COMPONENTS[number];

/**
 * 📚 DOCUMENTACIÓN DE COMPONENTES:
 * 
 * 🧠 TriviaGame:
 * - Juegos de preguntas y respuestas educativas
 * - Soporte para múltiple selección y verdadero/falso
 * - Temporizador configurable y sistema de puntuación
 * - Feedback inmediato y explicaciones educativas
 * 
 * 🧩 CrosswordGame:  
 * - Crucigramas educativos interactivos
 * - Navegación por teclado y mouse
 * - Sistema de pistas contextual
 * - Validación en tiempo real
 * 
 * 🎭 SimulationGame (en desarrollo):
 * - Simulaciones históricas y científicas interactivas
 * - Escenarios dinámicos y toma de decisiones
 * - Narrativa educativa inmersiva
 * - Múltiples finales basados en decisiones
 */