// ============================================================================
// DASHBOARD DEL DOCENTE
// ============================================================================
// Panel principal para docentes con resumen de aulas y actividades

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { ActivityService } from '../../services/implementations/ActivityService';
import { Classroom, Activity } from '../../types';
import { 
  Users, 
  BookOpen, 
  Plus, 
  TrendingUp, 
  Clock,
  Award,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

/**
 * Props del componente TeacherDashboard
 */
interface TeacherDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

/**
 * Componente Dashboard para docentes
 * Muestra resumen de aulas, actividades y estadísticas
 */
export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClassrooms: 0,
    totalStudents: 0,
    totalActivities: 0,
    averageCompletion: 0
  });

  const classroomService = ClassroomService.getInstance();
  const activityService = ActivityService.getInstance();

  /**
   * Carga los datos del dashboard al montar el componente
   */
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Cargar aulas del docente
        const userClassrooms = await classroomService.getClassroomsByTeacher(user.id);
        setClassrooms(userClassrooms);

        // Cargar actividades recientes
        const allActivities: Activity[] = [];
        for (const classroom of userClassrooms) {
          const activities = await activityService.getActivitiesByClassroom(classroom.id);
          allActivities.push(...activities);
        }
        
        // Ordenar por fecha de creación y tomar las 5 más recientes
        const sortedActivities = allActivities
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentActivities(sortedActivities);

        // Calcular estadísticas
        const totalStudents = userClassrooms.reduce((sum, classroom) => sum + classroom.students.length, 0);
        const totalActivities = allActivities.length;
        
        setStats({
          totalClassrooms: userClassrooms.length,
          totalStudents,
          totalActivities,
          averageCompletion: totalActivities > 0 ? 78 : 0 // Valor simulado
        });

      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  /**
   * Maneja la creación de una nueva aula
   */
  const handleCreateClassroom = () => {
    onNavigate('create-classroom');
  };

  /**
   * Maneja la creación de una nueva actividad
   */
  const handleCreateActivity = () => {
    onNavigate('create-activity');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
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
            ¡Bienvenido, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Aquí tienes un resumen de tus aulas y actividades
          </p>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aulas Activas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClassrooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Estudiantes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Actividades</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActivities}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completación</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageCompletion}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sección de Aulas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Mis Aulas</h2>
                <button
                  onClick={handleCreateClassroom}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Aula</span>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {classrooms.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No tienes aulas creadas aún</p>
                  <button
                    onClick={handleCreateClassroom}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Crear tu primera aula
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {classrooms.slice(0, 3).map((classroom) => (
                    <div
                      key={classroom.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => onNavigate('classroom-detail', { classroomId: classroom.id })}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{classroom.name}</h3>
                          <p className="text-sm text-gray-600">
                            {classroom.students.length} estudiantes • {classroom.subject}
                          </p>
                        </div>
                      </div>
                      <Eye className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                  
                  {classrooms.length > 3 && (
                    <button
                      onClick={() => onNavigate('classrooms')}
                      className="w-full text-center py-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Ver todas las aulas ({classrooms.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sección de Actividades Recientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Actividades Recientes</h2>
                <button
                  onClick={handleCreateActivity}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Actividad</span>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No tienes actividades creadas aún</p>
                  <button
                    onClick={handleCreateActivity}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Crear tu primera actividad
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          activity.type === 'quiz' ? 'bg-blue-100' :
                          activity.type === 'game' ? 'bg-green-100' :
                          activity.type === 'memory' ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          {activity.type === 'quiz' ? (
                            <BookOpen className={`w-5 h-5 ${
                              activity.type === 'quiz' ? 'text-blue-600' :
                              activity.type === 'game' ? 'text-green-600' :
                              activity.type === 'memory' ? 'text-purple-600' : 'text-gray-600'
                            }`} />
                          ) : (
                            <Award className={`w-5 h-5 ${
                              activity.type === 'quiz' ? 'text-blue-600' :
                              activity.type === 'game' ? 'text-green-600' :
                              activity.type === 'memory' ? 'text-purple-600' : 'text-gray-600'
                            }`} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                          <p className="text-sm text-gray-600">
                            {activity.subject} • {activity.difficulty}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => onNavigate('repository')}
                    className="w-full text-center py-2 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Ver todas las actividades
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleCreateClassroom}
              className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-left"
            >
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">Crear Aula</h3>
                <p className="text-sm text-indigo-700">Organiza a tus estudiantes</p>
              </div>
            </button>

            <button
              onClick={handleCreateActivity}
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Crear Actividad</h3>
                <p className="text-sm text-purple-700">Diseña contenido lúdico</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('repository')}
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Explorar Repositorio</h3>
                <p className="text-sm text-green-700">Encuentra actividades</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};