// ============================================================================
// 🎮 DEMOSTRACIÓN DE JUEGOS EDUCATIVOS - ACALUD
// ============================================================================
/**
 * 🎯 PROPÓSITO:
 * Componente de demostración que muestra cómo integrar y usar los juegos educativos
 * en la aplicación principal. Sirve como ejemplo y guía de implementación.
 * 
 * 🔄 USO EN LA APLICACIÓN:
 * Este componente puede ser integrado desde:
 * - Dashboard del profesor (para crear actividades de juego)
 * - Dashboard del estudiante (para acceder a juegos asignados)
 * - Sistema de aulas (juegos específicos por clase)
 * - Módulo de gamificación (juegos como recompensas)
 */

import React, { useState } from 'react';
import { TriviaGame, CrosswordGame } from './Games';
import { GameType, Subject, DifficultyLevel } from '../types/games';

// ============================================================================
// 📝 INTERFACES
// ============================================================================

const GAME_THEMES = ['default', 'dark', 'colorful', 'minimal'] as const;
type GameTheme = typeof GAME_THEMES[number];

interface GameConfigState {
  subject: Subject;
  difficulty: DifficultyLevel;
  theme: GameTheme;
}

interface GameDemoProps {
  /** 🎯 Tipo de juego por defecto */
  defaultGameType?: GameType;
  
  /** 📚 Materia por defecto */
  defaultSubject?: Subject;
  
  /** 📊 Dificultad por defecto */
  defaultDifficulty?: DifficultyLevel;
  
  /** 🚪 Callback al salir de un juego */
  onGameExit?: () => void;
  
  /** 🔙 Callback para volver atrás */
  onBack?: () => void;
}

// ============================================================================
// 🎮 COMPONENTE PRINCIPAL
// ============================================================================

export const GameDemo: React.FC<GameDemoProps> = ({
  defaultGameType: _defaultGameType = GameType.TRIVIA, // TODO: Usar para selección inicial
  defaultSubject = Subject.MATHEMATICS,
  defaultDifficulty = DifficultyLevel.INTERMEDIATE,
  onGameExit,
  onBack
}) => {
  
  // 🎯 Estado del selector de juegos
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfigState>({
    subject: defaultSubject,
    difficulty: defaultDifficulty,
    theme: 'default'
  });

  const isGameTheme = (value: string): value is GameTheme =>
    GAME_THEMES.some((theme) => theme === value);

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (isGameTheme(value)) {
      setGameConfig((prev) => ({ ...prev, theme: value }));
    }
  };
  
  // 🎮 Función para iniciar un juego
  const startGame = (gameType: GameType) => {
    setSelectedGame(gameType);
  };
  
  // 🚪 Función para salir de un juego
  const exitGame = () => {
    setSelectedGame(null);
    if (onGameExit) {
      onGameExit();
    }
  };
  
  // 🎨 Renderizar selector de juegos
  const renderGameSelector = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* 📋 Encabezado */}
        <div className="text-center mb-8">
          {/* 🔙 Botón de volver */}
          {onBack && (
            <div className="flex justify-start mb-4">
              <button
                onClick={onBack}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver al Dashboard
              </button>
            </div>
          )}
          
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🎮 Juegos Educativos AcaLud
          </h1>
          <p className="text-lg text-gray-600">
            Selecciona un juego para comenzar tu aventura de aprendizaje
          </p>
        </div>
        
        {/* ⚙️ Configuración de juego */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">⚙️ Configuración</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 📚 Selector de materia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📚 Materia
              </label>
              <select
                value={gameConfig.subject}
                onChange={(e) => setGameConfig(prev => ({ ...prev, subject: e.target.value as Subject }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={Subject.MATHEMATICS}>🔢 Matemáticas</option>
                <option value={Subject.SCIENCE}>🔬 Ciencias</option>
                <option value={Subject.HISTORY}>📜 Historia</option>
                <option value={Subject.LITERATURE}>📖 Literatura</option>
                <option value={Subject.GEOGRAPHY}>🌍 Geografía</option>
                <option value={Subject.SPANISH}>🇪🇸 Español</option>
                <option value={Subject.ENGLISH}>🇺🇸 Inglés</option>
              </select>
            </div>
            
            {/* 📊 Selector de dificultad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Dificultad
              </label>
              <select
                value={gameConfig.difficulty}
                onChange={(e) => setGameConfig(prev => ({ ...prev, difficulty: e.target.value as DifficultyLevel }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={DifficultyLevel.BEGINNER}>🌱 Principiante</option>
                <option value={DifficultyLevel.INTERMEDIATE}>🌿 Intermedio</option>
                <option value={DifficultyLevel.ADVANCED}>🌳 Avanzado</option>
                <option value={DifficultyLevel.EXPERT}>🏆 Experto</option>
              </select>
            </div>
            
            {/* 🎨 Selector de tema */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎨 Tema visual
              </label>
              <select
                value={gameConfig.theme}
                onChange={handleThemeChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="default">🌅 Por defecto</option>
                <option value="dark">🌙 Oscuro</option>
                <option value="colorful">🌈 Colorido</option>
                <option value="minimal">⚪ Minimalista</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* 🎯 Selector de tipo de juego */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 🧠 Trivia */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="text-6xl mb-4">🧠</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Trivia Educativa</h3>
              <p className="text-gray-600 mb-6">
                Pon a prueba tus conocimientos con preguntas de selección múltiple,
                verdadero/falso y más. Incluye temporizador y feedback inmediato.
              </p>
              
              <div className="space-y-2 mb-6 text-sm text-gray-500">
                <div>✅ Preguntas interactivas</div>
                <div>⏱️ Temporizador configurable</div>
                <div>🏆 Sistema de puntuación</div>
                <div>💡 Pistas y explicaciones</div>
              </div>
              
              <button
                onClick={() => startGame(GameType.TRIVIA)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                🚀 Comenzar Trivia
              </button>
            </div>
          </div>
          
          {/* 🧩 Crucigrama */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="text-6xl mb-4">🧩</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Crucigrama</h3>
              <p className="text-gray-600 mb-6">
                Resuelve crucigramas educativos con pistas relacionadas a la materia.
                Navegación intuitiva y validación en tiempo real.
              </p>
              
              <div className="space-y-2 mb-6 text-sm text-gray-500">
                <div>🔤 Cuadrícula interactiva</div>
                <div>⌨️ Navegación por teclado</div>
                <div>💡 Sistema de pistas</div>
                <div>✅ Validación inmediata</div>
              </div>
              
              <button
                onClick={() => startGame(GameType.CROSSWORD)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                🚀 Comenzar Crucigrama
              </button>
            </div>
          </div>
        </div>
        
        {/* 🔮 Próximamente */}
        <div className="mt-8 bg-gray-100 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎭</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Simulaciones</h3>
          <p className="text-gray-500">Próximamente: Simulaciones históricas y científicas interactivas</p>
        </div>
      </div>
    </div>
  );
  
  // 🎮 Renderizar juego activo
  const renderActiveGame = () => {
    switch (selectedGame) {
      case GameType.TRIVIA:
        return (
          <TriviaGame
            gameId={`demo-trivia-${gameConfig.subject}-${gameConfig.difficulty}`}
            difficulty={gameConfig.difficulty}
            questionCount={10}
            timeLimit={30}
            allowHints={true}
            showImmediateFeedback={true}
            theme={gameConfig.theme}
            onGameComplete={(results) => {
              console.log('Trivia completada:', results);
              // Aquí puedes agregar lógica para guardar resultados
            }}
            onGameExit={exitGame}
          />
        );
        
      case GameType.CROSSWORD:
        return (
          <CrosswordGame
            gameId={`demo-crossword-${gameConfig.subject}-${gameConfig.difficulty}`}
            difficulty={gameConfig.difficulty}
            subject={gameConfig.subject}
            allowHints={true}
            showImmediateValidation={true}
            theme={gameConfig.theme}
            onGameComplete={(results) => {
              console.log('Crucigrama completado:', results);
              // Aquí puedes agregar lógica para guardar resultados
            }}
            onGameExit={exitGame}
          />
        );
        
      default:
        return renderGameSelector();
    }
  };
  
  return renderActiveGame();
};

// ============================================================================
// 📚 DOCUMENTACIÓN DE INTEGRACIÓN
// ============================================================================

/**
 * 🔧 CÓMO INTEGRAR EN TU APLICACIÓN:
 * 
 * 1. Importar en tu componente:
 * ```tsx
 * import { GameDemo } from './components/GameDemo';
 * ```
 * 
 * 2. Usar en el JSX:
 * ```tsx
 * <GameDemo 
 *   defaultSubject={Subject.MATHEMATICS}
 *   onGameExit={() => navigate('/dashboard')}
 * />
 * ```
 * 
 * 3. Para integración con dashboard del profesor:
 * ```tsx
 * // En TeacherDashboard.tsx
 * const [showGames, setShowGames] = useState(false);
 * 
 * return (
 *   <div>
 *     {showGames ? (
 *       <GameDemo onGameExit={() => setShowGames(false)} />
 *     ) : (
 *       // Dashboard normal con botón para activar juegos
 *       <button onClick={() => setShowGames(true)}>
 *         🎮 Abrir Juegos Educativos
 *       </button>
 *     )}
 *   </div>
 * );
 * ```
 * 
 * 4. Para integración con sistema de aulas:
 * ```tsx
 * // En ClassroomManagement.tsx
 * <GameDemo 
 *   defaultSubject={classroom.subject}
 *   defaultDifficulty={classroom.level}
 *   onGameExit={() => navigate(`/classroom/${classroom.id}`)}
 * />
 * ```
 */

export default GameDemo;