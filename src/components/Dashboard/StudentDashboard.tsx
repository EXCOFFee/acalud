// ============================================================================
// DASHBOARD DEL ESTUDIANTE
// ============================================================================
// Panel principal para estudiantes con progreso y actividades

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { ActivityService } from '../../services/implementations/ActivityService';
import { UserService } from '../../services/implementations/UserService';
import { Classroom, ActivityCompletion, UserStats } from '../../types';
import { 
  BookOpen, 
  Trophy, 
  Coins, 
  TrendingUp, 
  Clock,
  Star,
  Play,
  CheckCircle,
  Target
} from 'lucide-react';

/**
 * Props del componente StudentDashboard
 */
interface StudentDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

/**
 * Componente Dashboard para estudiantes
 * Muestra progreso, estadísticas y actividades disponibles
 */
export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<ActivityCompletion[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const classroomService = ClassroomService.getInstance();
  const activityService = ActivityService.getInstance();
  const userService = UserService.getInstance();

  /**
   * Carga los datos del dashboard al montar el componente
   */
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Cargar aulas del estudiante
        const userClassrooms = await classroomService.getClassroomsByStudent(user.id);
        setClassrooms(userClassrooms);

        // Cargar completaciones recientes
        const completions = await activityService.getStudentCompletions(user.id);
        const sortedCompletions = completions
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
          .slice(0, 5);
        setRecentCompletions(sortedCompletions);

        // Cargar estadísticas del usuario
        try {
          const stats = await userService.getUserStats(user.id);
          setUserStats(stats);
        } catch (error) {
          console.log('Estadísticas no disponibles para este usuario');
        }

      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  /**
   * Calcula el progreso hacia el siguiente nivel
   */
  const getProgressToNextLevel = () => {
    if (!user) return 0;
    const currentLevelExp = Math.pow(user.level - 1, 2) * 100;
    const nextLevelExp = Math.pow(user.level, 2) * 100;
    const progress = ((user.experience - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tu progreso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado de bienvenida */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Hola, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Continúa aprendiendo y divirtiéndote con nuestras actividades
          </p>
        </div>

        {/* Tarjetas de progreso */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Nivel actual */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Nivel Actual</p>
                <p className="text-3xl font-bold">{user?.level}</p>
              </div>
              <div className="p-3 bg-purple-400 bg-opacity-30 rounded-lg">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-purple-100 mb-1">
                <span>Progreso</span>
                <span>{Math.round(getProgressToNextLevel())}%</span>
              </div>
              <div className="w-full bg-purple-400 bg-opacity-30 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${getProgressToNextLevel()}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Monedas */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Monedas</p>
                <p className="text-3xl font-bold">{user?.coins}</p>
              </div>
              <div className="p-3 bg-yellow-400 bg-opacity-30 rounded-lg">
                <Coins className="w-6 h-6" />
              </div>
            </div>
            <button
              onClick={() => onNavigate('store')}
              className="mt-4 text-sm text-yellow-100 hover:text-white transition-colors"
            >
              Ir a la tienda →
            </button>
          </div>

          {/* Actividades completadas */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Completadas</p>
                <p className="text-3xl font-bold">{userStats?.totalActivitiesCompleted || 0}</p>
              </div>
              <div className="p-3 bg-green-400 bg-opacity-30 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-4 text-sm text-green-100">
              Promedio: {userStats?.averageScore || 0}%
            </p>
          </div>

          {/* Racha de días */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Racha</p>
                <p className="text-3xl font-bold">{userStats?.streakDays || 0}</p>
              </div>
              <div className="p-3 bg-blue-400 bg-opacity-30 rounded-lg">
                <Target className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-4 text-sm text-blue-100">
              días consecutivos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mis Aulas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Mis Aulas</h2>
            </div>
            
            <div className="p-6">
              {classrooms.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No estás inscrito en ninguna aula aún</p>
                  <button
                    onClick={() => onNavigate('join-classroom')}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Únete a un aula
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {classrooms.slice(0, 3).map((classroom) => (
                    <div
                      key={classroom.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => onNavigate('classroom-activities', { classroomId: classroom.id })}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{classroom.name}</h3>
                          <p className="text-sm text-gray-600">
                            {classroom.subject} • {classroom.teacher.name}
                          </p>
                        </div>
                      </div>
                      <Play className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                  
                  {classrooms.length > 3 && (
                    <button
                      onClick={() => onNavigate('student-classrooms')}
                      className="w-full text-center py-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Ver todas las aulas ({classrooms.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actividades Recientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Actividades Recientes</h2>
            </div>
            
            <div className="p-6">
              {recentCompletions.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No has completado actividades aún</p>
                  <button
                    onClick={() => onNavigate('student-classrooms')}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Explorar actividades
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCompletions.map((completion) => (
                    <div
                      key={completion.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          completion.score >= completion.maxScore * 0.9 ? 'bg-green-100' :
                          completion.score >= completion.maxScore * 0.7 ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          <Star className={`w-5 h-5 ${
                            completion.score >= completion.maxScore * 0.9 ? 'text-green-600' :
                            completion.score >= completion.maxScore * 0.7 ? 'text-yellow-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Actividad Completada</h3>
                          <p className="text-sm text-gray-600">
                            {Math.round((completion.score / completion.maxScore) * 100)}% • {
                              new Date(completion.completedAt).toLocaleDateString()
                            }
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {completion.score}/{completion.maxScore}
                        </p>
                        <p className="text-xs text-gray-500">puntos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">¿Qué quieres hacer hoy?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => onNavigate('student-classrooms')}
              className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-left"
            >
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">Estudiar</h3>
                <p className="text-sm text-indigo-700">Hacer actividades</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('achievements')}
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Logros</h3>
                <p className="text-sm text-purple-700">Ver progreso</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('store')}
              className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors text-left"
            >
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Coins className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-900">Tienda</h3>
                <p className="text-sm text-yellow-700">Gastar monedas</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Perfil</h3>
                <p className="text-sm text-green-700">Ver estadísticas</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};