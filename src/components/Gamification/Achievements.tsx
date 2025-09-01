// ============================================================================
// SISTEMA DE LOGROS
// ============================================================================
// Muestra los logros obtenidos y disponibles para estudiantes

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Trophy, 
  Award, 
  Star,
  Target,
  Crown,
  Medal,
  Clock,
  TrendingUp,
  Users,
  BookOpen,
  CheckCircle,
  Lock,
  ArrowLeft,
  Sparkles,
  Zap,
  Heart,
  Flame
} from 'lucide-react';

/**
 * Props del componente Achievements
 */
interface AchievementsProps {
  onBack: () => void;
}

/**
 * Tipos de logros disponibles
 */
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  category: 'progress' | 'social' | 'special' | 'time';
  points: number;
  requirement: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

/**
 * Categorías de logros
 */
interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
}

/**
 * Estado del usuario
 */
interface UserProgress {
  totalPoints: number;
  level: number;
  unlockedAchievements: string[];
  streakDays: number;
  activitiesCompleted: number;
  perfectScores: number;
  totalTimeStudied: number; // en minutos
}

/**
 * Componente del sistema de logros
 * Muestra progreso, logros desbloqueados y objetivos pendientes
 */
export const Achievements: React.FC<AchievementsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Categorías de logros
   */
  const categories: AchievementCategory[] = [
    {
      id: 'all',
      name: 'Todos los Logros',
      description: 'Ver todos los logros disponibles',
      icon: Trophy,
      color: 'indigo'
    },
    {
      id: 'progress',
      name: 'Progreso',
      description: 'Logros por completar actividades',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      id: 'social',
      name: 'Social',
      description: 'Logros por interacción y participación',
      icon: Users,
      color: 'green'
    },
    {
      id: 'special',
      name: 'Especiales',
      description: 'Logros únicos y desafíos especiales',
      icon: Star,
      color: 'purple'
    },
    {
      id: 'time',
      name: 'Tiempo',
      description: 'Logros por constancia y dedicación',
      icon: Clock,
      color: 'yellow'
    }
  ];

  /**
   * Definir logros del sistema
   */
  const defineAchievements = (progress: UserProgress): Achievement[] => {
    return [
      // Logros de Progreso
      {
        id: 'first_activity',
        title: 'Primer Paso',
        description: 'Completa tu primera actividad',
        icon: BookOpen,
        color: 'blue',
        category: 'progress',
        points: 10,
        requirement: 'Completa 1 actividad',
        isUnlocked: progress.activitiesCompleted >= 1,
        progress: Math.min(progress.activitiesCompleted, 1),
        maxProgress: 1
      },
      {
        id: 'five_activities',
        title: 'Estudioso',
        description: 'Completa 5 actividades',
        icon: Target,
        color: 'blue',
        category: 'progress',
        points: 25,
        requirement: 'Completa 5 actividades',
        isUnlocked: progress.activitiesCompleted >= 5,
        progress: Math.min(progress.activitiesCompleted, 5),
        maxProgress: 5
      },
      {
        id: 'ten_activities',
        title: 'Dedicado',
        description: 'Completa 10 actividades',
        icon: Award,
        color: 'blue',
        category: 'progress',
        points: 50,
        requirement: 'Completa 10 actividades',
        isUnlocked: progress.activitiesCompleted >= 10,
        progress: Math.min(progress.activitiesCompleted, 10),
        maxProgress: 10
      },
      {
        id: 'fifty_activities',
        title: 'Maestro del Aprendizaje',
        description: 'Completa 50 actividades',
        icon: Crown,
        color: 'blue',
        category: 'progress',
        points: 200,
        requirement: 'Completa 50 actividades',
        isUnlocked: progress.activitiesCompleted >= 50,
        progress: Math.min(progress.activitiesCompleted, 50),
        maxProgress: 50
      },

      // Logros de Puntuación Perfecta
      {
        id: 'first_perfect',
        title: 'Perfeccionista',
        description: 'Obtén tu primera puntuación perfecta',
        icon: Star,
        color: 'yellow',
        category: 'special',
        points: 30,
        requirement: 'Obtén 100% en una actividad',
        isUnlocked: progress.perfectScores >= 1,
        progress: Math.min(progress.perfectScores, 1),
        maxProgress: 1
      },
      {
        id: 'five_perfect',
        title: 'Experto',
        description: 'Obtén 5 puntuaciones perfectas',
        icon: Medal,
        color: 'yellow',
        category: 'special',
        points: 100,
        requirement: 'Obtén 100% en 5 actividades',
        isUnlocked: progress.perfectScores >= 5,
        progress: Math.min(progress.perfectScores, 5),
        maxProgress: 5
      },

      // Logros de Tiempo y Constancia
      {
        id: 'streak_3',
        title: 'Constante',
        description: 'Estudia 3 días consecutivos',
        icon: Flame,
        color: 'orange',
        category: 'time',
        points: 20,
        requirement: 'Racha de 3 días',
        isUnlocked: progress.streakDays >= 3,
        progress: Math.min(progress.streakDays, 3),
        maxProgress: 3
      },
      {
        id: 'streak_7',
        title: 'Disciplinado',
        description: 'Estudia 7 días consecutivos',
        icon: Trophy,
        color: 'orange',
        category: 'time',
        points: 50,
        requirement: 'Racha de 7 días',
        isUnlocked: progress.streakDays >= 7,
        progress: Math.min(progress.streakDays, 7),
        maxProgress: 7
      },
      {
        id: 'streak_30',
        title: 'Leyenda',
        description: 'Estudia 30 días consecutivos',
        icon: Crown,
        color: 'orange',
        category: 'time',
        points: 200,
        requirement: 'Racha de 30 días',
        isUnlocked: progress.streakDays >= 30,
        progress: Math.min(progress.streakDays, 30),
        maxProgress: 30
      },

      // Logros Especiales
      {
        id: 'night_owl',
        title: 'Búho Nocturno',
        description: 'Completa una actividad después de las 10 PM',
        icon: Sparkles,
        color: 'purple',
        category: 'special',
        points: 15,
        requirement: 'Actividad nocturna',
        isUnlocked: false, // Se determinaría con datos de timestamp
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'speed_runner',
        title: 'Velocista',
        description: 'Completa una actividad en menos del 50% del tiempo límite',
        icon: Zap,
        color: 'purple',
        category: 'special',
        points: 25,
        requirement: 'Velocidad excepcional',
        isUnlocked: false, // Se determinaría con datos de tiempo
        progress: 0,
        maxProgress: 1
      },

      // Logros Sociales (para futuras funcionalidades)
      {
        id: 'helpful',
        title: 'Colaborador',
        description: 'Ayuda a un compañero (próximamente)',
        icon: Heart,
        color: 'green',
        category: 'social',
        points: 20,
        requirement: 'Función de ayuda',
        isUnlocked: false,
        progress: 0,
        maxProgress: 1
      }
    ];
  };

  /**
   * Cargar progreso del usuario
   */
  useEffect(() => {
    const loadUserProgress = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        // En un escenario real, estos datos vendrían del backend
        // Por ahora simulamos datos
        const mockProgress: UserProgress = {
          totalPoints: 150,
          level: 3,
          unlockedAchievements: ['first_activity', 'five_activities', 'first_perfect', 'streak_3'],
          streakDays: 5,
          activitiesCompleted: 8,
          perfectScores: 2,
          totalTimeStudied: 240
        };

        setUserProgress(mockProgress);
        
        // Generar logros con progreso actual
        const allAchievements = defineAchievements(mockProgress);
        
        // Agregar fecha de desbloqueo para logros obtenidos
        const achievementsWithDates = allAchievements.map(achievement => ({
          ...achievement,
          unlockedAt: achievement.isUnlocked 
            ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Fecha aleatoria última semana
            : undefined
        }));

        setAchievements(achievementsWithDates);

      } catch (error) {
        console.error('Error al cargar progreso:', error);
        setError('Error al cargar los logros. Intenta recargar la página.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProgress();
  }, [user]);

  /**
   * Filtrar logros por categoría
   */
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  /**
   * Obtener estadísticas de logros
   */
  const achievementStats = {
    total: achievements.length,
    unlocked: achievements.filter(a => a.isUnlocked).length,
    points: achievements.filter(a => a.isUnlocked).reduce((sum, a) => sum + a.points, 0)
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando logros...</p>
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
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Logros</h1>
              <p className="text-gray-600 mt-1">
                Descubre qué has conseguido y qué objetivos puedes alcanzar
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <Trophy className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Estadísticas generales */}
        {userProgress && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Logros Desbloqueados</p>
                  <p className="text-3xl font-bold">{achievementStats.unlocked}</p>
                  <p className="text-sm text-purple-100">de {achievementStats.total}</p>
                </div>
                <div className="p-3 bg-purple-400 bg-opacity-30 rounded-lg">
                  <Trophy className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Puntos de Logros</p>
                  <p className="text-3xl font-bold">{achievementStats.points}</p>
                  <p className="text-sm text-yellow-100">puntos ganados</p>
                </div>
                <div className="p-3 bg-yellow-400 bg-opacity-30 rounded-lg">
                  <Star className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Nivel Actual</p>
                  <p className="text-3xl font-bold">{userProgress.level}</p>
                  <p className="text-sm text-blue-100">estudiante</p>
                </div>
                <div className="p-3 bg-blue-400 bg-opacity-30 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Racha Actual</p>
                  <p className="text-3xl font-bold">{userProgress.streakDays}</p>
                  <p className="text-sm text-green-100">días consecutivos</p>
                </div>
                <div className="p-3 bg-green-400 bg-opacity-30 rounded-lg">
                  <Flame className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros por categoría */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Categorías de Logros</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {categories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;
                
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
                      {filteredAchievements.filter(a => 
                        category.id === 'all' || a.category === category.id
                      ).filter(a => a.isUnlocked).length} desbloqueados
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lista de logros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((achievement) => {
            const Icon = achievement.icon;
            const progressPercentage = achievement.maxProgress 
              ? Math.round(((achievement.progress || 0) / achievement.maxProgress) * 100)
              : 0;

            return (
              <div
                key={achievement.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                  achievement.isUnlocked 
                    ? 'border-green-200 ring-2 ring-green-100' 
                    : 'border-gray-100'
                }`}
              >
                {/* Header */}
                <div className={`p-6 ${
                  achievement.isUnlocked 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        achievement.isUnlocked 
                          ? `bg-${achievement.color}-100` 
                          : 'bg-gray-200'
                      }`}>
                        {achievement.isUnlocked ? (
                          <Icon className={`w-6 h-6 text-${achievement.color}-600`} />
                        ) : (
                          <Lock className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${
                          achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {achievement.title}
                        </h3>
                        <p className={`text-sm ${
                          achievement.isUnlocked ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                    
                    {achievement.isUnlocked && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  {/* Puntos y requisito */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Star className={`w-4 h-4 ${
                        achievement.isUnlocked ? 'text-yellow-500' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {achievement.points} puntos
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      achievement.isUnlocked 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {achievement.requirement}
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  {achievement.maxProgress && achievement.maxProgress > 1 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Progreso</span>
                        <span className="text-gray-900 font-medium">
                          {achievement.progress || 0}/{achievement.maxProgress}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            achievement.isUnlocked 
                              ? 'bg-green-500' 
                              : `bg-${achievement.color}-400`
                          }`}
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {progressPercentage}% completado
                      </p>
                    </div>
                  )}

                  {/* Fecha de desbloqueo */}
                  {achievement.isUnlocked && achievement.unlockedAt && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800 font-medium">
                        ¡Logro desbloqueado!
                      </p>
                      <p className="text-xs text-green-600">
                        {achievement.unlockedAt.toLocaleDateString()} a las{' '}
                        {achievement.unlockedAt.toLocaleTimeString()}
                      </p>
                    </div>
                  )}

                  {/* Próximo objetivo */}
                  {!achievement.isUnlocked && achievement.maxProgress && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800 font-medium">
                        Próximo objetivo
                      </p>
                      <p className="text-xs text-blue-600">
                        {achievement.maxProgress - (achievement.progress || 0)} más para desbloquear
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mensaje si no hay logros en la categoría */}
        {filteredAchievements.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay logros en esta categoría
            </h3>
            <p className="text-gray-600">
              Selecciona otra categoría para ver más logros disponibles
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
