// ============================================================================
// AULAS Y ACTIVIDADES PARA ESTUDIANTES
// ============================================================================
// Vista de aulas disponibles y actividades para estudiantes

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { ActivityService } from '../../services/implementations/ActivityService';
import { Classroom, Activity, ActivityCompletion } from '../../types';
import { 
  BookOpen, 
  Users, 
  Play,
  Search,
  Trophy,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  Target,
  Award,
  Eye,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';

/**
 * Props del componente StudentClassrooms
 */
interface StudentClassroomsProps {
  onNavigate: (page: string, data?: any) => void;
}

/**
 * Filtros para actividades
 */
interface ActivityFilters {
  search: string;
  type: string;
  difficulty: string;
  completed: string; // 'all' | 'completed' | 'pending'
  classroomId: string;
}

/**
 * Actividad con información de progreso
 */
interface ActivityWithProgress extends Activity {
  completion?: ActivityCompletion;
  isCompleted: boolean;
  bestScore?: number;
  attempts?: number;
}

/**
 * Componente para que estudiantes vean sus aulas y actividades
 * Incluye filtros, búsqueda y seguimiento de progreso
 */
export const StudentClassrooms: React.FC<StudentClassroomsProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [activities, setActivities] = useState<ActivityWithProgress[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'classrooms' | 'activities'>('classrooms');
  
  // Filtros
  const [filters, setFilters] = useState<ActivityFilters>({
    search: '',
    type: '',
    difficulty: '',
    completed: 'all',
    classroomId: ''
  });

  const classroomService = ClassroomService.getInstance();
  const activityService = ActivityService.getInstance();

  /**
   * Cargar aulas del estudiante
   */
  useEffect(() => {
    const loadClassrooms = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const userClassrooms = await classroomService.getClassroomsByStudent(user.id);
        setClassrooms(userClassrooms);
        
        // Si solo hay una aula, mostrarla automáticamente
        if (userClassrooms.length === 1) {
          setSelectedClassroom(userClassrooms[0]);
          setView('activities');
        }
      } catch (error) {
        console.error('Error al cargar aulas:', error);
        setError('Error al cargar las aulas. Intenta recargar la página.');
      } finally {
        setIsLoading(false);
      }
    };

    loadClassrooms();
  }, [user]);

  /**
   * Cargar actividades cuando se selecciona un aula
   */
  useEffect(() => {
    const loadActivities = async () => {
      if (!selectedClassroom || !user) return;

      try {
        setIsLoadingActivities(true);
        setError(null);
        
        // Cargar actividades del aula
        const classroomActivities = await activityService.getActivitiesByClassroom(selectedClassroom.id);
        
        // Cargar progreso del estudiante
        const studentCompletions = await activityService.getStudentCompletions(user.id);
        
        // Combinar actividades con progreso
        const activitiesWithProgress: ActivityWithProgress[] = classroomActivities.map(activity => {
          const completion = studentCompletions.find(c => c.activityId === activity.id);
          
          return {
            ...activity,
            completion,
            isCompleted: !!completion,
            bestScore: completion?.score,
            attempts: completion?.attempts || 0
          };
        });

        setActivities(activitiesWithProgress);
        setFilteredActivities(activitiesWithProgress);
      } catch (error) {
        console.error('Error al cargar actividades:', error);
        setError('Error al cargar las actividades. Intenta nuevamente.');
      } finally {
        setIsLoadingActivities(false);
      }
    };

    if (view === 'activities') {
      loadActivities();
    }
  }, [selectedClassroom, user, view]);

  /**
   * Aplicar filtros a las actividades
   */
  useEffect(() => {
    let filtered = [...activities];

    // Filtro por búsqueda
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchTerm) ||
        activity.description.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por tipo
    if (filters.type) {
      filtered = filtered.filter(activity => activity.type === filters.type);
    }

    // Filtro por dificultad
    if (filters.difficulty) {
      filtered = filtered.filter(activity => activity.difficulty === filters.difficulty);
    }

    // Filtro por estado de completado
    if (filters.completed !== 'all') {
      if (filters.completed === 'completed') {
        filtered = filtered.filter(activity => activity.isCompleted);
      } else if (filters.completed === 'pending') {
        filtered = filtered.filter(activity => !activity.isCompleted);
      }
    }

    setFilteredActivities(filtered);
  }, [activities, filters]);

  /**
   * Actualizar filtros
   */
  const updateFilter = (key: keyof ActivityFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Seleccionar aula y cargar actividades
   */
  const selectClassroom = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setView('activities');
    setFilters(prev => ({ ...prev, classroomId: classroom.id }));
  };

  /**
   * Volver a la lista de aulas
   */
  const backToClassrooms = () => {
    setView('classrooms');
    setSelectedClassroom(null);
    setActivities([]);
    setFilteredActivities([]);
  };

  /**
   * Obtener icono por tipo de actividad
   */
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz': return BookOpen;
      case 'game': return Target;
      case 'memory': return Star;
      case 'puzzle': return Award;
      default: return BookOpen;
    }
  };

  /**
   * Obtener color por dificultad
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  /**
   * Obtener etiqueta de dificultad
   */
  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Medio';
      case 'hard': return 'Difícil';
      default: return difficulty;
    }
  };

  /**
   * Obtener etiqueta de tipo
   */
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz': return 'Quiz';
      case 'game': return 'Juego';
      case 'memory': return 'Memoria';
      case 'puzzle': return 'Rompecabezas';
      default: return type;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aulas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vista de Aulas */}
        {view === 'classrooms' && (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Mis Aulas</h1>
                  <p className="text-gray-600 mt-1">
                    Selecciona un aula para ver las actividades disponibles
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Lista de Aulas */}
            {classrooms.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No estás inscrito en ninguna aula
                </h3>
                <p className="text-gray-600 mb-6">
                  Usa un código de invitación para unirte a un aula virtual
                </p>
                <button
                  onClick={() => onNavigate('join-classroom')}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Unirse a un Aula
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classrooms.map((classroom) => (
                  <div
                    key={classroom.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer"
                    onClick={() => selectClassroom(classroom)}
                  >
                    {/* Header de la tarjeta */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {classroom.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {classroom.subject} • {classroom.grade}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6">
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {classroom.description}
                      </p>

                      {/* Estadísticas */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">
                            {classroom.activities?.length || 0}
                          </div>
                          <div className="text-xs text-gray-600">Actividades</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">
                            {classroom.students?.length || 0}
                          </div>
                          <div className="text-xs text-gray-600">Estudiantes</div>
                        </div>
                      </div>

                      {/* Docente */}
                      <div className="flex items-center space-x-2 mb-4">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {classroom.teacher.firstName} {classroom.teacher.lastName}
                        </span>
                      </div>

                      {/* Botón de acción */}
                      <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Actividades
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Ingresaste el {new Date(classroom.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Vista de Actividades */}
        {view === 'activities' && selectedClassroom && (
          <>
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={backToClassrooms}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                Volver a Aulas
              </button>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{selectedClassroom.name}</h1>
                    <p className="text-gray-600 mt-1">
                      {selectedClassroom.subject} • {selectedClassroom.grade}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Actividades</p>
                    <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completadas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {activities.filter(a => a.isCompleted).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pendientes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {activities.filter(a => !a.isCompleted).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Promedio</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {activities.filter(a => a.isCompleted).length > 0
                        ? Math.round(
                            activities.filter(a => a.isCompleted)
                              .reduce((sum, a) => sum + (a.bestScore || 0), 0) /
                            activities.filter(a => a.isCompleted).length
                          )
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros y Búsqueda */}
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Búsqueda */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar actividades..."
                      value={filters.search}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-200 focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>

                {/* Filtro por tipo */}
                <div>
                  <select
                    value={filters.type}
                    onChange={(e) => updateFilter('type', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-200 focus:outline-none focus:ring-2"
                  >
                    <option value="">Todos los tipos</option>
                    <option value="quiz">Quiz</option>
                    <option value="game">Juego</option>
                    <option value="memory">Memoria</option>
                    <option value="puzzle">Rompecabezas</option>
                  </select>
                </div>

                {/* Filtro por estado */}
                <div>
                  <select
                    value={filters.completed}
                    onChange={(e) => updateFilter('completed', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-200 focus:outline-none focus:ring-2"
                  >
                    <option value="all">Todas las actividades</option>
                    <option value="pending">Pendientes</option>
                    <option value="completed">Completadas</option>
                  </select>
                </div>
              </div>

              {/* Resultados */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {filteredActivities.length} de {activities.length} actividades
                </p>
                {(filters.search || filters.type || filters.completed !== 'all') && (
                  <button
                    onClick={() => setFilters({
                      search: '',
                      type: '',
                      difficulty: '',
                      completed: 'all',
                      classroomId: selectedClassroom.id
                    })}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Loading de actividades */}
            {isLoadingActivities && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando actividades...</p>
              </div>
            )}

            {/* Lista de Actividades */}
            {!isLoadingActivities && (
              <>
                {filteredActivities.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    {activities.length === 0 ? (
                      <>
                        <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          No hay actividades disponibles
                        </h3>
                        <p className="text-gray-600">
                          Tu docente aún no ha creado actividades para esta aula
                        </p>
                      </>
                    ) : (
                      <>
                        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          No se encontraron actividades
                        </h3>
                        <p className="text-gray-600">
                          Intenta ajustar los filtros de búsqueda
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredActivities.map((activity) => {
                      const Icon = getActivityIcon(activity.type);
                      
                      return (
                        <div
                          key={activity.id}
                          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                        >
                          {/* Header */}
                          <div className="p-6 border-b border-gray-100">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                  activity.isCompleted ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                  <Icon className={`w-6 h-6 ${
                                    activity.isCompleted ? 'text-green-600' : 'text-gray-600'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                                    {activity.title}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {getTypeLabel(activity.type)}
                                  </p>
                                  <div className="flex items-center mt-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(activity.difficulty)}`}>
                                      {getDifficultyLabel(activity.difficulty)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {activity.isCompleted && (
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              )}
                            </div>
                          </div>

                          {/* Contenido */}
                          <div className="p-6">
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {activity.description}
                            </p>

                            {/* Estadísticas */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-lg font-bold text-gray-900">
                                  {activity.estimatedTime}
                                </div>
                                <div className="text-xs text-gray-600">min</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-lg font-bold text-gray-900">
                                  {activity.rewards.coins}
                                </div>
                                <div className="text-xs text-gray-600">pts</div>
                              </div>
                            </div>

                            {/* Progreso */}
                            {activity.isCompleted ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-green-800">
                                      Completada
                                    </p>
                                    <p className="text-xs text-green-600">
                                      Mejor puntuación: {activity.bestScore}/{activity.rewards.coins}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-green-700">
                                      {Math.round(((activity.bestScore || 0) / activity.rewards.coins) * 100)}%
                                    </p>
                                    <p className="text-xs text-green-600">
                                      {activity.attempts} intento{activity.attempts !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <p className="text-sm font-medium text-blue-800">
                                  ¡Actividad disponible!
                                </p>
                                <p className="text-xs text-blue-600">
                                  Completa esta actividad para ganar puntos
                                </p>
                              </div>
                            )}

                            {/* Botón de acción */}
                            <button
                              onClick={() => onNavigate('activity-detail', { 
                                activityId: activity.id,
                                classroomId: selectedClassroom.id
                              })}
                              className={`w-full px-4 py-3 rounded-lg transition-colors flex items-center justify-center font-medium ${
                                activity.isCompleted
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-purple-600 text-white hover:bg-purple-700'
                              }`}
                            >
                              {activity.isCompleted ? (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Resultados
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Comenzar Actividad
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
