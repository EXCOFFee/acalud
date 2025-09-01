// ============================================================================
// GESTIÓN DE AULAS
// ============================================================================
// Permite a los docentes gestionar sus aulas virtuales

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { Classroom } from '../../types';
import { 
  Users, 
  BookOpen, 
  Plus, 
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  Copy
} from 'lucide-react';

/**
 * Props del componente ClassroomManagement
 */
interface ClassroomManagementProps {
  onNavigate: (page: string, data?: any) => void;
}

/**
 * Estado de filtros para las aulas
 */
interface ClassroomFilters {
  search: string;
  subject: string;
  isActive: boolean | null;
}

/**
 * Componente para gestionar aulas virtuales
 * Incluye listado, búsqueda, filtros y acciones CRUD
 */
export const ClassroomManagement: React.FC<ClassroomManagementProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState<ClassroomFilters>({
    search: '',
    subject: '',
    isActive: null
  });

  const classroomService = ClassroomService.getInstance();

  /**
   * Cargar aulas del docente
   */
  useEffect(() => {
    const loadClassrooms = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const userClassrooms = await classroomService.getClassroomsByTeacher(user.id);
        setClassrooms(userClassrooms);
        setFilteredClassrooms(userClassrooms);
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
   * Aplicar filtros a las aulas
   */
  useEffect(() => {
    let filtered = [...classrooms];

    // Filtro por búsqueda
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(classroom =>
        classroom.name.toLowerCase().includes(searchTerm) ||
        classroom.description.toLowerCase().includes(searchTerm) ||
        classroom.subject.toLowerCase().includes(searchTerm) ||
        classroom.grade.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por materia
    if (filters.subject) {
      filtered = filtered.filter(classroom => classroom.subject === filters.subject);
    }

    // Filtro por estado activo
    if (filters.isActive !== null) {
      filtered = filtered.filter(classroom => classroom.isActive === filters.isActive);
    }

    setFilteredClassrooms(filtered);
  }, [classrooms, filters]);

  /**
   * Actualizar filtros
   */
  const updateFilter = (key: keyof ClassroomFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Obtener materias únicas para el filtro
   */
  const getUniqueSubjects = () => {
    return [...new Set(classrooms.map(c => c.subject))].sort();
  };

  /**
   * Copiar código de invitación
   */
  const copyInviteCode = async (code: string, classroomName: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(classroomName);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Error al copiar código:', error);
    }
  };

  /**
   * Eliminar aula
   */
  const handleDeleteClassroom = async (classroomId: string) => {
    try {
      setIsDeleting(true);
      await classroomService.deleteClassroom(classroomId);
      
      // Actualizar lista local
      setClassrooms(prev => prev.filter(c => c.id !== classroomId));
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Error al eliminar aula:', error);
      setError('Error al eliminar el aula. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Cambiar estado activo de un aula
   */
  const toggleClassroomStatus = async (classroomId: string) => {
    try {
      const classroom = classrooms.find(c => c.id === classroomId);
      if (!classroom) return;

      await classroomService.updateClassroom(classroomId, {
        isActive: !classroom.isActive
      });

      // Actualizar lista local
      setClassrooms(prev => 
        prev.map(c => 
          c.id === classroomId 
            ? { ...c, isActive: !c.isActive }
            : c
        )
      );
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      setError('Error al cambiar el estado del aula.');
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Aulas</h1>
                <p className="text-gray-600 mt-1">
                  Administra tus aulas virtuales y estudiantes
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onNavigate('create-classroom')}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Aula
            </button>
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

        {/* Filtros y Búsqueda */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar aulas por nombre, descripción o materia..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none focus:ring-2"
                />
              </div>
            </div>

            {/* Filtro por materia */}
            <div>
              <select
                value={filters.subject}
                onChange={(e) => updateFilter('subject', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none focus:ring-2"
              >
                <option value="">Todas las materias</option>
                {getUniqueSubjects().map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* Filtro por estado */}
            <div>
              <select
                value={filters.isActive === null ? '' : filters.isActive.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  updateFilter('isActive', value === '' ? null : value === 'true');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none focus:ring-2"
              >
                <option value="">Todos los estados</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </div>
          </div>

          {/* Resultados */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {filteredClassrooms.length} de {classrooms.length} aulas
            </p>
            {(filters.search || filters.subject || filters.isActive !== null) && (
              <button
                onClick={() => setFilters({ search: '', subject: '', isActive: null })}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista de Aulas */}
        {filteredClassrooms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            {classrooms.length === 0 ? (
              <>
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No tienes aulas creadas
                </h3>
                <p className="text-gray-600 mb-6">
                  Crea tu primera aula virtual para empezar a organizar a tus estudiantes
                </p>
                <button
                  onClick={() => onNavigate('create-classroom')}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Crear Primera Aula
                </button>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No se encontraron aulas
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClassrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header de la tarjeta */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        classroom.isActive ? 'bg-indigo-100' : 'bg-gray-100'
                      }`}>
                        <BookOpen className={`w-6 h-6 ${
                          classroom.isActive ? 'text-indigo-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {classroom.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {classroom.subject} • {classroom.grade}
                        </p>
                        <div className="flex items-center mt-2">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            classroom.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span className={`text-xs font-medium ${
                            classroom.isActive ? 'text-green-700' : 'text-gray-500'
                          }`}>
                            {classroom.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menú de acciones */}
                    <div className="relative">
                      <button
                        onClick={() => setShowActionMenu(
                          showActionMenu === classroom.id ? null : classroom.id
                        )}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {showActionMenu === classroom.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-10">
                          <button
                            onClick={() => {
                              onNavigate('classroom-detail', { classroomId: classroom.id });
                              setShowActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-3" />
                            Ver Detalles
                          </button>
                          
                          <button
                            onClick={() => {
                              onNavigate('edit-classroom', { classroomId: classroom.id });
                              setShowActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-3" />
                            Editar Aula
                          </button>

                          <button
                            onClick={() => {
                              copyInviteCode(classroom.inviteCode, classroom.name);
                              setShowActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Copy className="w-4 h-4 mr-3" />
                            Copiar Código
                          </button>

                          <button
                            onClick={() => {
                              toggleClassroomStatus(classroom.id);
                              setShowActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Settings className="w-4 h-4 mr-3" />
                            {classroom.isActive ? 'Desactivar' : 'Activar'}
                          </button>

                          <div className="border-t border-gray-100 my-1"></div>
                          
                          <button
                            onClick={() => {
                              setShowDeleteModal(classroom.id);
                              setSelectedClassroom(classroom);
                              setShowActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Eliminar Aula
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contenido de la tarjeta */}
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {classroom.description}
                  </p>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {classroom.students?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Estudiantes</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {classroom.activities?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Actividades</div>
                    </div>
                  </div>

                  {/* Código de invitación */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-800">Código de Invitación</p>
                        <p className="text-sm font-mono text-blue-900">
                          {classroom.inviteCode}
                        </p>
                      </div>
                      <button
                        onClick={() => copyInviteCode(classroom.inviteCode, classroom.name)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Copiar código"
                      >
                        {copySuccess === classroom.name ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => onNavigate('classroom-detail', { classroomId: classroom.id })}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Aula
                    </button>
                    <button
                      onClick={() => onNavigate('create-activity', { classroomId: classroom.id })}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Actividad
                    </button>
                  </div>
                </div>

                {/* Fecha de creación */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Creada el {new Date(classroom.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteModal && selectedClassroom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Eliminar Aula
                  </h3>
                  <p className="text-sm text-gray-600">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700">
                  ¿Estás seguro de que quieres eliminar el aula{' '}
                  <span className="font-semibold">"{selectedClassroom.name}"</span>?
                </p>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    • Se eliminarán todas las actividades asociadas<br/>
                    • Los estudiantes perderán acceso al aula<br/>
                    • Se perderán todos los datos de progreso
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(null);
                    setSelectedClassroom(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteClassroom(showDeleteModal)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Aula
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de éxito al copiar código */}
        {copySuccess && (
          <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 rounded-lg p-4 flex items-center space-x-3 z-50">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">
              Código de "{copySuccess}" copiado al portapapeles
            </p>
          </div>
        )}
      </div>

      {/* Overlay para cerrar menús */}
      {showActionMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActionMenu(null)}
        ></div>
      )}
    </div>
  );
};
