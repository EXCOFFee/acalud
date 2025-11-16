/**
 * 🎮 LISTA DE JUEGOS EDUCATIVOS
 * Componente que muestra todos los juegos disponibles en cards atractivas
 */

import React, { useState, useEffect } from 'react';
import { Gamepad2, Clock, Star, Play, Filter, BookOpen, TrendingUp } from 'lucide-react';

interface Game {
  id: string;
  title: string;
  description: string;
  type: 'trivia' | 'crossword' | 'simulation';
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  educationLevel: string;
  maxPoints: number;
  timeLimit: number;
  imageUrl: string;
  tags: string[];
  isActive: boolean;
}

type GamesListNavigationHandler = {
  (page: 'dashboard'): void;
  (page: 'trivia-game', data: { gameId: string }): void;
  (page: 'crossword-game', data: { gameId: string }): void;
  (page: 'simulation-game', data: { gameId: string }): void;
};

interface GamesListProps {
  onNavigate: GamesListNavigationHandler;
}

export const GamesList: React.FC<GamesListProps> = ({ onNavigate }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Cargar juegos desde el backend
  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token') || localStorage.getItem('acalud_token');
      
      const response = await fetch('http://localhost:3001/api/v1/games', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar juegos');
      }

      const data = await response.json() as Game[];
      console.log('📥 Juegos cargados:', data);
      setGames(data.filter((game) => game.isActive));
    } catch (err) {
      console.error('Error loading games:', err);
      setError('No se pudieron cargar los juegos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar juegos según selección
  const filteredGames = games.filter(game => {
    const matchesSubject = selectedSubject === 'all' || game.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || game.difficulty === selectedDifficulty;
    return matchesSubject && matchesDifficulty;
  });

  // Mapeo de tipos de juego a emojis y colores
  const gameTypeConfig = {
    trivia: { emoji: '❓', color: 'blue', name: 'Trivia' },
    crossword: { emoji: '📝', color: 'green', name: 'Crucigrama' },
    simulation: { emoji: '🔬', color: 'purple', name: 'Simulación' },
  };

  // Mapeo de dificultad a colores y textos
  const difficultyConfig = {
    beginner: { color: 'green', text: 'Principiante', stars: 1 },
    intermediate: { color: 'yellow', text: 'Intermedio', stars: 2 },
    advanced: { color: 'red', text: 'Avanzado', stars: 3 },
  };

  // Mapeo de materias
  const subjectNames: Record<string, string> = {
    mathematics: 'Matemáticas',
    history: 'Historia',
    sciences: 'Ciencias',
    literature: 'Literatura',
    geography: 'Geografía',
    language: 'Lenguaje',
  };

  const handlePlayGame = (game: Game) => {
    // Navegar al juego correspondiente según su tipo
    switch (game.type) {
      case 'trivia':
        onNavigate('trivia-game', { gameId: game.id });
        break;
      case 'crossword':
        onNavigate('crossword-game', { gameId: game.id });
        break;
      case 'simulation':
        onNavigate('simulation-game', { gameId: game.id });
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando juegos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center space-x-2"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-2xl">
              <Gamepad2 className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">🎮 Juegos Educativos</h1>
              <p className="text-gray-600 mt-1">Aprende jugando con nuestras trivias, crucigramas y simulaciones</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro de Materia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📚 Materia
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todas las materias</option>
                <option value="mathematics">Matemáticas</option>
                <option value="history">Historia</option>
                <option value="sciences">Ciencias</option>
                <option value="literature">Literatura</option>
                <option value="geography">Geografía</option>
                <option value="language">Lenguaje</option>
              </select>
            </div>

            {/* Filtro de Dificultad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⭐ Dificultad
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los niveles</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadGames}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista de Juegos */}
        {filteredGames.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No hay juegos disponibles</h3>
            <p className="text-gray-500">
              {games.length === 0
                ? 'Aún no se han creado juegos. ¡Vuelve pronto!'
                : 'No hay juegos que coincidan con los filtros seleccionados'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => {
              const typeConfig = gameTypeConfig[game.type];
              const diffConfig = difficultyConfig[game.difficulty];

              return (
                <div
                  key={game.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  {/* Imagen del juego */}
                  <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl}
                        alt={game.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl">{typeConfig.emoji}</span>
                      </div>
                    )}
                    
                    {/* Badge de tipo de juego */}
                    <div className={`absolute top-4 left-4 px-3 py-1 bg-${typeConfig.color}-500 text-white rounded-full text-sm font-semibold shadow-lg`}>
                      {typeConfig.emoji} {typeConfig.name}
                    </div>

                    {/* Badge de dificultad */}
                    <div className={`absolute top-4 right-4 px-3 py-1 bg-${diffConfig.color}-500 text-white rounded-full text-xs font-semibold flex items-center space-x-1`}>
                      {[...Array(diffConfig.stars)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{game.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{game.description}</p>

                    {/* Información adicional */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <BookOpen className="w-4 h-4" />
                        <span>{subjectNames[game.subject] || game.subject}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{game.timeLimit ? `${Math.floor(game.timeLimit / 60)} minutos` : 'Sin límite'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>Hasta {game.maxPoints} puntos</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {game.tags && game.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {game.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Botón de jugar */}
                    <button
                      onClick={() => handlePlayGame(game)}
                      className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Play className="w-5 h-5" />
                      <span>¡Jugar Ahora!</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Estadísticas rápidas */}
        {filteredGames.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-indigo-600">{filteredGames.length}</div>
                <div className="text-sm text-gray-600">Juegos Disponibles</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">
                  {filteredGames.reduce((sum, game) => sum + game.maxPoints, 0)}
                </div>
                <div className="text-sm text-gray-600">Puntos Totales Posibles</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-pink-600">
                  {Math.floor(filteredGames.reduce((sum, game) => sum + (game.timeLimit || 0), 0) / 60)}
                </div>
                <div className="text-sm text-gray-600">Minutos de Diversión</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
