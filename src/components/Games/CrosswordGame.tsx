// ============================================================================
// 🧩 COMPONENTE DE JUEGO DE CRUCIGRAMA - ACALUD
// ============================================================================
/**
 * 🎯 PROPÓSITO:
 * Componente React para crucigramas educativos interactivos.
 * Maneja toda la lógica de presentación de pistas, cuadrícula, validación y progreso.
 * 
 * 🏗️ PRINCIPIOS SOLID APLICADOS:
 * - Single Responsibility: Solo maneja la interfaz de crucigramas
 * - Open/Closed: Extensible para nuevos tipos de pistas y temas
 * - Liskov Substitution: Implementa interfaz consistente de componentes
 * - Interface Segregation: Props específicas y bien definidas
 * - Dependency Inversion: Depende de servicios abstraídos
 * 
 * 🎓 PATRONES DE DISEÑO:
 * - State Management: Gestión compleja del estado del crucigrama
 * - Component Composition: Composición modular de elementos interactivos
 * - Event Handling: Manejo de eventos de teclado y mouse
 * - Validation Pattern: Validación en tiempo real de respuestas
 * - Interactive Grid: Cuadrícula interactiva con navegación inteligente
 */

// 📦 IMPORTACIONES NECESARIAS
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { gameService, GameServiceError, GameErrorType } from '../../services/games.service';
import {
  // Tipos específicos de crucigrama
  GameSession, GameStatus,
  
  // Enumeraciones
  DifficultyLevel, Subject,
  
  // Tipos de utilidad
  LoadingState
} from '../../types/games';

// ============================================================================
// 📝 INTERFACES Y TIPOS DEL COMPONENTE
// ============================================================================

/**
 * 🧩 Props del componente CrosswordGame
 * Define todas las propiedades configurables del crucigrama
 */
interface CrosswordGameProps {
  /** 🆔 ID único del crucigrama */
  readonly gameId: string;
  
  /** 📊 Nivel de dificultad específico */
  readonly difficulty?: DifficultyLevel;
  
  /** 📚 Materia específica del crucigrama */
  readonly subject?: Subject;
  
  /** ⏱️ Tiempo límite total en minutos (opcional) */
  readonly timeLimit?: number;
  
  /** 💡 ¿Permitir pistas? (opcional, default: true) */
  readonly allowHints?: boolean;
  
  /** ✅ ¿Mostrar validación inmediata? (opcional, default: true) */
  readonly showImmediateValidation?: boolean;
  
  /** 📊 Callback cuando el crucigrama se completa */
  readonly onGameComplete?: (results: CrosswordResults) => void;
  
  /** 🚪 Callback cuando el usuario quiere salir */
  readonly onGameExit?: () => void;
  
  /** 🎨 Tema visual personalizado */
  readonly theme?: 'default' | 'dark' | 'colorful' | 'minimal';
  
  /** 📱 ¿Optimizado para móvil? */
  readonly mobileOptimized?: boolean;
}

/**
 * 📊 Resultados finales del crucigrama
 * Información completa del rendimiento del estudiante
 */
interface CrosswordResults {
  /** 🏆 Puntuación final obtenida */
  readonly finalScore: number;
  
  /** 📈 Porcentaje de palabras completadas (0-100) */
  readonly percentage: number;
  
  /** ✅ Número de palabras completadas correctamente */
  readonly completedWords: number;
  
  /** 🔢 Total de palabras en el crucigrama */
  readonly totalWords: number;
  
  /** ⏱️ Tiempo total empleado en segundos */
  readonly timeSpent: number;
  
  /** 💡 Número de pistas utilizadas */
  readonly hintsUsed: number;
  
  /** 🏆 Logros desbloqueados */
  readonly achievements: string[];
  
  /** 💬 Feedback personalizado */
  readonly feedback: string;
  
  /** 🎓 Nivel de dominio alcanzado */
  readonly masteryLevel: 'principiante' | 'intermedio' | 'avanzado' | 'experto';
  
  /** 💡 Recomendaciones para mejorar */
  readonly recommendations: string[];
}

/**
 * 🔠 Estructura de una celda del crucigrama
 * Representa cada casilla individual de la cuadrícula
 */
interface CrosswordCell {
  /** 🔢 Posición en fila (0-based) */
  readonly row: number;
  
  /** 🔢 Posición en columna (0-based) */
  readonly col: number;
  
  /** 🔤 Letra correcta para esta celda */
  readonly correctLetter: string;
  
  /** 📝 Letra ingresada por el usuario */
  userLetter: string;
  
  /** 🚫 ¿Es una celda bloqueada (negra)? */
  readonly isBlocked: boolean;
  
  /** 🔢 Número de la palabra (si es inicio de palabra) */
  readonly number?: number;
  
  /** ➡️ ¿Pertenece a una palabra horizontal? */
  readonly isHorizontal: boolean;
  
  /** ⬇️ ¿Pertenece a una palabra vertical? */
  readonly isVertical: boolean;
  
  /** 🎯 ¿Está actualmente seleccionada? */
  isSelected: boolean;
  
  /** 🎯 ¿Está resaltada (parte de palabra activa)? */
  isHighlighted: boolean;
  
  /** ✅ ¿Es correcta la letra ingresada? */
  isCorrect: boolean;
  
  /** 🚨 ¿Hay un error en esta celda? */
  hasError: boolean;
}

/**
 * 💭 Estructura de una pista del crucigrama
 * Información de cada palabra a completar
 */
interface CrosswordClue {
  /** 🆔 ID único de la pista */
  readonly id: string;
  
  /** 🔢 Número de la palabra en el crucigrama */
  readonly number: number;
  
  /** ➡️ Dirección: horizontal o vertical */
  readonly direction: 'horizontal' | 'vertical';
  
  /** 💭 Texto de la pista */
  readonly clue: string;
  
  /** 🔤 Respuesta correcta */
  readonly answer: string;
  
  /** 📍 Posición inicial [fila, columna] */
  readonly startPosition: [number, number];
  
  /** 📏 Longitud de la palabra */
  readonly length: number;
  
  /** ✅ ¿Está completada correctamente? */
  isCompleted: boolean;
  
  /** 📝 Respuesta actual del usuario */
  userAnswer: string;
  
  /** 💡 ¿Se ha usado pista para esta palabra? */
  hintUsed: boolean;
  
  /** 🎯 ¿Está actualmente activa/seleccionada? */
  isActive: boolean;
}

/**
 * 🎮 Estado interno del componente de crucigrama
 * Gestión completa del estado del juego
 */
interface CrosswordState {
  /** 📊 Estado de carga general */
  loadingState: LoadingState;
  
  /** 🎯 Sesión de juego activa */
  session: GameSession | null;
  
  /** 🧩 Cuadrícula completa del crucigrama */
  grid: CrosswordCell[][];
  
  /** 💭 Lista de todas las pistas */
  clues: CrosswordClue[];
  
  /** 🎯 Pista actualmente seleccionada */
  activeClue: CrosswordClue | null;
  
  /** 📍 Celda actualmente seleccionada */
  selectedCell: [number, number] | null;
  
  /** ➡️ Dirección actual de escritura */
  currentDirection: 'horizontal' | 'vertical';
  
  /** ⏱️ Tiempo transcurrido en segundos */
  timeElapsed: number;
  
  /** ▶️ ¿El temporizador está activo? */
  timerActive: boolean;
  
  /** 🏆 Puntuación actual */
  currentScore: number;
  
  /** 💡 Número de pistas utilizadas */
  hintsUsed: number;
  
  /** 🚨 Error actual si existe */
  error: GameServiceError | null;
  
  /** ✅ ¿El crucigrama está completado? */
  isCompleted: boolean;
  
  /** 📊 Resultados finales */
  results: CrosswordResults | null;
  
  /** 🔍 ¿Está mostrando el modal de pista? */
  showingHint: boolean;
  
  /** 💭 Pista actual siendo mostrada */
  currentHint: string | null;
}

// ============================================================================
// 🎨 CONFIGURACIONES DE TEMA
// ============================================================================

/**
 * 🎨 Configuración de tema visual
 * Estilos personalizables para la cuadrícula
 */
interface CrosswordThemeConfig {
  /** 🎨 Clases CSS para el contenedor principal */
  containerClasses: string;
  
  /** 🎨 Clases CSS para las celdas normales */
  cellClasses: string;
  
  /** 🎨 Clases CSS para las celdas seleccionadas */
  selectedCellClasses: string;
  
  /** 🎨 Clases CSS para las celdas resaltadas */
  highlightedCellClasses: string;
  
  /** 🎨 Clases CSS para las celdas bloqueadas */
  blockedCellClasses: string;
  
  /** 🎨 Clases CSS para las celdas correctas */
  correctCellClasses: string;
  
  /** 🎨 Clases CSS para las celdas con error */
  errorCellClasses: string;
  
  /** 🎨 Clases CSS para las pistas */
  clueClasses: string;
  
  /** 🎨 Clases CSS para botones */
  buttonClasses: string;
}

/**
 * 🎨 Temas visuales predefinidos para crucigramas
 */
const CROSSWORD_THEMES: Record<string, CrosswordThemeConfig> = {
  // 🌅 Tema por defecto - clásico y elegante
  default: {
    containerClasses: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100',
    cellClasses: 'w-8 h-8 border border-gray-400 bg-white text-center text-sm font-semibold cursor-pointer hover:bg-blue-50 transition-colors',
    selectedCellClasses: 'w-8 h-8 border-2 border-blue-500 bg-blue-100 text-center text-sm font-semibold cursor-pointer',
    highlightedCellClasses: 'w-8 h-8 border border-gray-400 bg-blue-50 text-center text-sm font-semibold cursor-pointer',
    blockedCellClasses: 'w-8 h-8 bg-gray-800',
    correctCellClasses: 'w-8 h-8 border border-green-400 bg-green-50 text-center text-sm font-semibold cursor-pointer',
    errorCellClasses: 'w-8 h-8 border border-red-400 bg-red-50 text-center text-sm font-semibold cursor-pointer',
    clueClasses: 'p-3 bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors',
    buttonClasses: 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors'
  },
  
  // 🌙 Tema oscuro
  dark: {
    containerClasses: 'min-h-screen bg-gradient-to-br from-gray-900 to-black',
    cellClasses: 'w-8 h-8 border border-gray-600 bg-gray-800 text-white text-center text-sm font-semibold cursor-pointer hover:bg-gray-700 transition-colors',
    selectedCellClasses: 'w-8 h-8 border-2 border-purple-400 bg-purple-800 text-white text-center text-sm font-semibold cursor-pointer',
    highlightedCellClasses: 'w-8 h-8 border border-gray-600 bg-gray-700 text-white text-center text-sm font-semibold cursor-pointer',
    blockedCellClasses: 'w-8 h-8 bg-black',
    correctCellClasses: 'w-8 h-8 border border-green-400 bg-green-900 text-white text-center text-sm font-semibold cursor-pointer',
    errorCellClasses: 'w-8 h-8 border border-red-400 bg-red-900 text-white text-center text-sm font-semibold cursor-pointer',
    clueClasses: 'p-3 bg-gray-800 rounded-lg shadow-sm border border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors text-white',
    buttonClasses: 'bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors'
  },
  
  // 🌈 Tema colorido
  colorful: {
    containerClasses: 'min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200',
    cellClasses: 'w-8 h-8 border-2 border-purple-300 bg-white text-center text-sm font-bold cursor-pointer hover:bg-pink-50 transition-colors',
    selectedCellClasses: 'w-8 h-8 border-2 border-pink-500 bg-pink-100 text-center text-sm font-bold cursor-pointer',
    highlightedCellClasses: 'w-8 h-8 border-2 border-purple-300 bg-purple-50 text-center text-sm font-bold cursor-pointer',
    blockedCellClasses: 'w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500',
    correctCellClasses: 'w-8 h-8 border-2 border-green-400 bg-green-100 text-center text-sm font-bold cursor-pointer',
    errorCellClasses: 'w-8 h-8 border-2 border-red-400 bg-red-100 text-center text-sm font-bold cursor-pointer',
    clueClasses: 'p-3 bg-white rounded-lg shadow-md border-2 border-purple-300 cursor-pointer hover:bg-pink-50 transition-colors',
    buttonClasses: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded-lg transition-colors'
  },
  
  // ⚪ Tema minimalista
  minimal: {
    containerClasses: 'min-h-screen bg-gray-50',
    cellClasses: 'w-8 h-8 border border-gray-300 bg-white text-center text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors',
    selectedCellClasses: 'w-8 h-8 border-2 border-black bg-gray-100 text-center text-sm font-medium cursor-pointer',
    highlightedCellClasses: 'w-8 h-8 border border-gray-300 bg-gray-50 text-center text-sm font-medium cursor-pointer',
    blockedCellClasses: 'w-8 h-8 bg-gray-400',
    correctCellClasses: 'w-8 h-8 border border-gray-300 bg-gray-100 text-center text-sm font-medium cursor-pointer',
    errorCellClasses: 'w-8 h-8 border border-gray-300 bg-gray-200 text-center text-sm font-medium cursor-pointer',
    clueClasses: 'p-3 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors',
    buttonClasses: 'bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors'
  }
};

// ============================================================================
// 🧩 COMPONENTE PRINCIPAL DE CRUCIGRAMA
// ============================================================================

/**
 * 🧩 Componente principal del juego de crucigrama
 * Implementa toda la lógica de crucigrama siguiendo principios SOLID
 */
export const CrosswordGameComponent: React.FC<CrosswordGameProps> = ({
  gameId,
  difficulty,
  subject,
  timeLimit: _timeLimit, // TODO: Implementar límite de tiempo
  allowHints = true,
  showImmediateValidation = true,
  onGameComplete: _onGameComplete, // TODO: Implementar callback de finalización
  onGameExit,
  theme = 'default',
  mobileOptimized: _mobileOptimized = false
}) => {
  
  // 🔐 Obtener información del usuario autenticado
  const { user } = useAuth();
  
  // 📊 Estado principal del componente
  const [state, setState] = useState<CrosswordState>({
    loadingState: 'idle',
    session: null,
    grid: [],
    clues: [],
    activeClue: null,
    selectedCell: null,
    currentDirection: 'horizontal',
    timeElapsed: 0,
    timerActive: false,
    currentScore: 0,
    hintsUsed: 0,
    error: null,
    isCompleted: false,
    results: null,
    showingHint: false,
    currentHint: null
  });
  
  // ⏱️ Referencia para el temporizador
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 📱 Referencia para manejar eventos de teclado
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 🎨 Configuración de tema memoizada
  const themeConfig = useMemo(() => CROSSWORD_THEMES[theme] || CROSSWORD_THEMES.default, [theme]);
  
  // ============================================================================
  // 🔄 EFECTOS Y CICLO DE VIDA
  // ============================================================================
  
  /**
   * 🎬 Efecto de inicialización del crucigrama
   */
  useEffect(() => {
    initializeCrossword();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameId]);
  
  /**
   * ⏱️ Efecto del temporizador
   */
  useEffect(() => {
    if (state.timerActive) {
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeElapsed: prev.timeElapsed + 1
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.timerActive]);
  
  /**
   * ⌨️ Efecto para manejar eventos de teclado
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (state.loadingState !== 'success' || state.isCompleted) return;
      
      handleKeyboardInput(event);
    };
    
    if (containerRef.current) {
      containerRef.current.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [state.selectedCell, state.currentDirection, state.grid]);
  
  // ============================================================================
  // 🎮 FUNCIONES PRINCIPALES DEL JUEGO
  // ============================================================================
  
  /**
   * 🚀 Inicializar el crucigrama
   */
  const initializeCrossword = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loadingState: 'loading' }));
      
      // 🌐 Cargar datos del crucigrama desde el backend
      // TODO: Implementar método loadCrosswordGame en el servicio
      const crosswordData = await gameService.getCrosswordData(gameId, difficulty, subject);
      
      // 🧩 Crear cuadrícula inicial
      const initialGrid = createGrid(crosswordData.grid);
      
      // 💭 Procesar pistas
      const processedClues = crosswordData.clues.map((clue: any) => ({
        ...clue,
        isCompleted: false,
        userAnswer: '',
        hintUsed: false,
        isActive: false
      }));
      
      // 🎯 Crear sesión de juego
      const session: GameSession = {
        id: crosswordData.sessionId,
        gameId,
        playerId: user?.id || 'anonymous',
        status: GameStatus.IN_PROGRESS,
        startedAt: new Date(),
        currentProgress: {
          currentStep: 0,
          totalSteps: processedClues.length,
          percentage: 0,
          checkpoints: [],
          achievements: []
        },
        responses: [],
        score: 0,
        timeSpent: 0,
        hintsUsed: 0,
        metadata: {
          deviceType: 'desktop',
          browserInfo: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          connectionQuality: 'good',
          interruptions: 0,
          pauseDuration: 0
        }
      };
      
      setState(prev => ({
        ...prev,
        loadingState: 'success',
        session,
        grid: initialGrid,
        clues: processedClues,
        timerActive: true
      }));
      
    } catch (error) {
      const gameError = error instanceof GameServiceError ? error : 
        new GameServiceError(GameErrorType.UNKNOWN_ERROR, 'Error al cargar el crucigrama');
      
      setState(prev => ({
        ...prev,
        loadingState: 'error',
        error: gameError
      }));
    }
  }, [gameId, difficulty, subject, user?.id]);
  
  /**
   * 🧩 Crear cuadrícula inicial
   */
  const createGrid = useCallback((gridData: any[][]): CrosswordCell[][] => {
    return gridData.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        correctLetter: cell.letter || '',
        userLetter: '',
        isBlocked: cell.isBlocked || false,
        number: cell.number,
        isHorizontal: cell.isHorizontal || false,
        isVertical: cell.isVertical || false,
        isSelected: false,
        isHighlighted: false,
        isCorrect: false,
        hasError: false
      }))
    );
  }, []);
  
  /**
   * 🖱️ Manejar clic en celda
   */
  const handleCellClick = useCallback((row: number, col: number) => {
    if (state.grid[row][col].isBlocked) return;
    
    setState(prev => {
      const newGrid = prev.grid.map((gridRow, r) =>
        gridRow.map((cell, c) => ({
          ...cell,
          isSelected: r === row && c === col,
          isHighlighted: false
        }))
      );
      
      // 🎯 Encontrar pista activa
      const clueForCell = findClueForCell(row, col, prev.currentDirection);
      let activeClue = clueForCell;
      let currentDirection = prev.currentDirection;
      
      // 🔄 Si ya estaba seleccionada, cambiar dirección
      if (prev.selectedCell && prev.selectedCell[0] === row && prev.selectedCell[1] === col) {
        currentDirection = currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
        activeClue = findClueForCell(row, col, currentDirection);
      }
      
      // 🎨 Resaltar palabra activa
      if (activeClue) {
        highlightWord(newGrid, activeClue);
      }
      
      return {
        ...prev,
        grid: newGrid,
        selectedCell: [row, col],
        currentDirection,
        activeClue
      };
    });
  }, [state.grid, state.currentDirection]);
  
  /**
   * 🔍 Encontrar pista para una celda específica
   */
  const findClueForCell = useCallback((row: number, col: number, direction: 'horizontal' | 'vertical'): CrosswordClue | null => {
    return state.clues.find(clue => {
      if (clue.direction !== direction) return false;
      
      const [startRow, startCol] = clue.startPosition;
      
      if (direction === 'horizontal') {
        return row === startRow && col >= startCol && col < startCol + clue.length;
      } else {
        return col === startCol && row >= startRow && row < startRow + clue.length;
      }
    }) || null;
  }, [state.clues]);
  
  /**
   * 🎨 Resaltar palabra activa
   */
  const highlightWord = useCallback((grid: CrosswordCell[][], clue: CrosswordClue) => {
    const [startRow, startCol] = clue.startPosition;
    
    for (let i = 0; i < clue.length; i++) {
      const row = clue.direction === 'horizontal' ? startRow : startRow + i;
      const col = clue.direction === 'horizontal' ? startCol + i : startCol;
      
      if (grid[row] && grid[row][col]) {
        grid[row][col].isHighlighted = true;
      }
    }
  }, []);
  
  /**
   * ⌨️ Manejar entrada de teclado
   */
  const handleKeyboardInput = useCallback((event: KeyboardEvent) => {
    if (!state.selectedCell) return;
    
    const key = event.key.toUpperCase();
    
    // 🔤 Letras
    if (/^[A-ZÑ]$/.test(key)) {
      event.preventDefault();
      handleLetterInput(key);
    }
    // ⌫ Backspace
    else if (event.key === 'Backspace') {
      event.preventDefault();
      handleBackspace();
    }
    // ⭐ Space para cambiar dirección
    else if (event.key === ' ') {
      event.preventDefault();
      toggleDirection();
    }
    // 🏹 Flechas de navegación
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      handleArrowNavigation(event.key);
    }
  }, [state.selectedCell, state.currentDirection]);
  
  /**
   * 🔤 Manejar entrada de letra
   */
  const handleLetterInput = useCallback((letter: string) => {
    if (!state.selectedCell) return;
    
    const [row, col] = state.selectedCell;
    
    setState(prev => {
      const newGrid = [...prev.grid];
      newGrid[row][col] = {
        ...newGrid[row][col],
        userLetter: letter,
        hasError: false
      };
      
      // ✅ Validar inmediatamente si está habilitado
      if (showImmediateValidation) {
        newGrid[row][col].isCorrect = letter === newGrid[row][col].correctLetter;
        if (!newGrid[row][col].isCorrect) {
          newGrid[row][col].hasError = true;
        }
      }
      
      return {
        ...prev,
        grid: newGrid
      };
    });
    
    // ⏭️ Avanzar a la siguiente celda
    moveToNextCell();
  }, [state.selectedCell, showImmediateValidation]);
  
  /**
   * ⌫ Manejar borrado
   */
  const handleBackspace = useCallback(() => {
    if (!state.selectedCell) return;
    
    const [row, col] = state.selectedCell;
    
    setState(prev => {
      const newGrid = [...prev.grid];
      newGrid[row][col] = {
        ...newGrid[row][col],
        userLetter: '',
        isCorrect: false,
        hasError: false
      };
      
      return {
        ...prev,
        grid: newGrid
      };
    });
    
    // ⏪ Retroceder a la celda anterior
    moveToPreviousCell();
  }, [state.selectedCell]);
  
  /**
   * 🔄 Cambiar dirección de escritura
   */
  const toggleDirection = useCallback(() => {
    if (!state.selectedCell) return;
    
    const [row, col] = state.selectedCell;
    const newDirection = state.currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
    const newActiveClue = findClueForCell(row, col, newDirection);
    
    setState(prev => {
      const newGrid = prev.grid.map(gridRow =>
        gridRow.map(cell => ({
          ...cell,
          isHighlighted: false
        }))
      );
      
      if (newActiveClue) {
        highlightWord(newGrid, newActiveClue);
      }
      
      return {
        ...prev,
        currentDirection: newDirection,
        activeClue: newActiveClue,
        grid: newGrid
      };
    });
  }, [state.selectedCell, state.currentDirection, findClueForCell, highlightWord]);
  
  /**
   * ⏭️ Mover a la siguiente celda
   */
  const moveToNextCell = useCallback(() => {
    if (!state.selectedCell || !state.activeClue) return;
    
    const [currentRow, currentCol] = state.selectedCell;
    const [startRow, startCol] = state.activeClue.startPosition;
    
    let nextRow = currentRow;
    let nextCol = currentCol;
    
    if (state.currentDirection === 'horizontal') {
      nextCol++;
      if (nextCol >= startCol + state.activeClue.length) {
        return; // Final de la palabra
      }
    } else {
      nextRow++;
      if (nextRow >= startRow + state.activeClue.length) {
        return; // Final de la palabra
      }
    }
    
    // 🚫 Verificar que la celda no esté bloqueada
    if (state.grid[nextRow][nextCol].isBlocked) return;
    
    handleCellClick(nextRow, nextCol);
  }, [state.selectedCell, state.activeClue, state.currentDirection, state.grid, handleCellClick]);
  
  /**
   * ⏪ Mover a la celda anterior
   */
  const moveToPreviousCell = useCallback(() => {
    if (!state.selectedCell || !state.activeClue) return;
    
    const [currentRow, currentCol] = state.selectedCell;
    const [startRow, startCol] = state.activeClue.startPosition;
    
    let prevRow = currentRow;
    let prevCol = currentCol;
    
    if (state.currentDirection === 'horizontal') {
      prevCol--;
      if (prevCol < startCol) {
        return; // Inicio de la palabra
      }
    } else {
      prevRow--;
      if (prevRow < startRow) {
        return; // Inicio de la palabra
      }
    }
    
    handleCellClick(prevRow, prevCol);
  }, [state.selectedCell, state.activeClue, state.currentDirection, handleCellClick]);
  
  /**
   * 🏹 Manejar navegación con flechas
   */
  const handleArrowNavigation = useCallback((key: string) => {
    if (!state.selectedCell) return;
    
    const [row, col] = state.selectedCell;
    let newRow = row;
    let newCol = col;
    
    switch (key) {
      case 'ArrowUp':
        newRow = Math.max(0, row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(state.grid.length - 1, row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(state.grid[0].length - 1, col + 1);
        break;
    }
    
    if (!state.grid[newRow][newCol].isBlocked) {
      handleCellClick(newRow, newCol);
    }
  }, [state.selectedCell, state.grid, handleCellClick]);
  
  /**
   * 💡 Solicitar pista
   */
  const handleHintRequest = useCallback(async () => {
    if (!allowHints || !state.activeClue || !state.session) return;
    
    try {
      // 🌐 Solicitar pista al backend
      const hint = await gameService.getCrosswordHint(state.session.id, state.activeClue.id, 1);
      
      setState(prev => ({
        ...prev,
        showingHint: true,
        currentHint: hint.hint,
        hintsUsed: prev.hintsUsed + 1
      }));
      
    } catch (error) {
      console.error('Error al solicitar pista:', error);
    }
  }, [allowHints, state.activeClue, state.session]);
  
  /**
   * ❌ Cerrar modal de pista
   */
  const closeHint = useCallback(() => {
    setState(prev => ({
      ...prev,
      showingHint: false,
      currentHint: null
    }));
  }, []);
  
  /**
   * 🚪 Manejar salida del juego
   */
  const handleGameExit = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres salir? Tu progreso se perderá.')) {
      if (onGameExit) {
        onGameExit();
      }
    }
  }, [onGameExit]);
  
  // ============================================================================
  // 🔧 FUNCIONES AUXILIARES
  // ============================================================================
  
  /**
   * 📊 Calcular progreso actual
   */
  const calculateProgress = useCallback((): number => {
    const completedWords = state.clues.filter(clue => clue.isCompleted).length;
    return Math.round((completedWords / state.clues.length) * 100);
  }, [state.clues]);
  
  /**
   * ⏱️ Formatear tiempo
   */
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);
  
  // ============================================================================
  // 🎨 RENDERIZADO CONDICIONAL
  // ============================================================================
  
  /**
   * ⏳ Renderizar estado de carga
   */
  if (state.loadingState === 'loading') {
    return (
      <div className={`${themeConfig.containerClasses} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Preparando tu crucigrama...
          </h2>
          <p className="text-gray-600">
            Estamos generando la cuadrícula perfecta para ti
          </p>
        </div>
      </div>
    );
  }
  
  /**
   * 🚨 Renderizar estado de error
   */
  if (state.loadingState === 'error' || state.error) {
    return (
      <div className={`${themeConfig.containerClasses} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="text-red-500 text-5xl mb-4">😞</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            ¡Ups! Algo salió mal
          </h2>
          <p className="text-gray-600 mb-6">
            {state.error?.message || 'Error al cargar el crucigrama'}
          </p>
          <div className="space-y-3">
            <button
              onClick={initializeCrossword}
              className={themeConfig.buttonClasses}
            >
              🔄 Intentar de nuevo
            </button>
            <button
              onClick={handleGameExit}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              🚪 Salir
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  /**
   * 🎮 Renderizar juego principal
   */
  return (
    <div 
      ref={containerRef}
      className={`${themeConfig.containerClasses} min-h-screen p-4`}
      tabIndex={0}
    >
      <div className="max-w-7xl mx-auto">
        
        {/* 📊 Barra de información superior */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">🧩 Crucigrama</h1>
              <div className="text-sm text-gray-600">
                Progreso: {calculateProgress()}%
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-gray-700">
                ⏱️ {formatTime(state.timeElapsed)}
              </div>
              <div className="text-sm font-medium text-gray-700">
                🏆 {state.currentScore} puntos
              </div>
              <button
                onClick={handleGameExit}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ❌
              </button>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 🧩 Cuadrícula del crucigrama */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-center">
                <div className="inline-block">
                  {state.grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                      {row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={
                            cell.isBlocked
                              ? themeConfig.blockedCellClasses
                              : cell.isSelected
                              ? themeConfig.selectedCellClasses
                              : cell.isHighlighted
                              ? themeConfig.highlightedCellClasses
                              : cell.hasError
                              ? themeConfig.errorCellClasses
                              : cell.isCorrect
                              ? themeConfig.correctCellClasses
                              : themeConfig.cellClasses
                          }
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                        >
                          {!cell.isBlocked && (
                            <>
                              {cell.number && (
                                <div className="absolute text-xs font-bold text-gray-600 -mt-1 -ml-1">
                                  {cell.number}
                                </div>
                              )}
                              <div className="w-full h-full flex items-center justify-center">
                                {cell.userLetter}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 🎮 Controles del juego */}
              <div className="mt-6 flex justify-center space-x-4">
                {allowHints && state.activeClue && (
                  <button
                    onClick={handleHintRequest}
                    className={themeConfig.buttonClasses}
                    disabled={state.hintsUsed >= 3}
                  >
                    💡 Pista ({3 - state.hintsUsed} restantes)
                  </button>
                )}
                <button
                  onClick={toggleDirection}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  🔄 {state.currentDirection === 'horizontal' ? '➡️ Horizontal' : '⬇️ Vertical'}
                </button>
              </div>
            </div>
          </div>
          
          {/* 💭 Panel de pistas */}
          <div className="space-y-6">
            
            {/* Pistas horizontales */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">➡️ Horizontales</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {state.clues
                  .filter(clue => clue.direction === 'horizontal')
                  .map(clue => (
                    <div
                      key={clue.id}
                      className={`${themeConfig.clueClasses} ${
                        clue.id === state.activeClue?.id ? 'ring-2 ring-indigo-500' : ''
                      }`}
                      onClick={() => {
                        const [row, col] = clue.startPosition;
                        handleCellClick(row, col);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-700">{clue.number}.</span>
                          <span className="ml-2 text-gray-600">{clue.clue}</span>
                        </div>
                        {clue.isCompleted && (
                          <span className="text-green-500 ml-2">✅</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Pistas verticales */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">⬇️ Verticales</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {state.clues
                  .filter(clue => clue.direction === 'vertical')
                  .map(clue => (
                    <div
                      key={clue.id}
                      className={`${themeConfig.clueClasses} ${
                        clue.id === state.activeClue?.id ? 'ring-2 ring-indigo-500' : ''
                      }`}
                      onClick={() => {
                        const [row, col] = clue.startPosition;
                        handleCellClick(row, col);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-700">{clue.number}.</span>
                          <span className="ml-2 text-gray-600">{clue.clue}</span>
                        </div>
                        {clue.isCompleted && (
                          <span className="text-green-500 ml-2">✅</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 💡 Modal de pista */}
      {state.showingHint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">💡 Pista</h3>
              <button
                onClick={closeHint}
                className="text-gray-500 hover:text-gray-700"
              >
                ❌
              </button>
            </div>
            <p className="text-gray-600 mb-6">{state.currentHint}</p>
            <button
              onClick={closeHint}
              className={themeConfig.buttonClasses}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Export del componente
export const CrosswordGame = CrosswordGameComponent;
export default CrosswordGame;