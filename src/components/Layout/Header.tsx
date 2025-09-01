// ============================================================================
// COMPONENTE DE HEADER/NAVEGACIÓN
// ============================================================================
// Header responsivo con navegación adaptada según el rol del usuario

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BookOpen, 
  User, 
  LogOut, 
  Coins, 
  Trophy,
  Menu,
  X,
  Home,
  Users,
  Library,
  Award,
  ShoppingBag
} from 'lucide-react';

/**
 * Props del componente Header
 */
interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

/**
 * Componente Header con navegación responsiva
 * Implementa diferentes menús según el rol del usuario
 */
export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /**
   * Configuración de navegación para docentes
   */
  const teacherNavigation = [
    { name: 'Dashboard', key: 'dashboard', icon: Home },
    { name: 'Mis Aulas', key: 'classrooms', icon: Users },
    { name: 'Repositorio', key: 'repository', icon: Library },
    { name: 'Perfil', key: 'profile', icon: User }
  ];

  /**
   * Configuración de navegación para estudiantes
   */
  const studentNavigation = [
    { name: 'Dashboard', key: 'dashboard', icon: Home },
    { name: 'Mis Aulas', key: 'student-classrooms', icon: Users },
    { name: 'Logros', key: 'achievements', icon: Trophy },
    { name: 'Tienda', key: 'store', icon: ShoppingBag },
    { name: 'Perfil', key: 'profile', icon: User }
  ];

  // Seleccionar navegación según el rol
  const navigation = user?.role === 'teacher' ? teacherNavigation : studentNavigation;

  /**
   * Maneja el cierre del menú móvil al navegar
   */
  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-lg border-b-4 border-indigo-500 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y marca */}
          <div className="flex items-center">
            <div className="flex-shrink-0 cursor-pointer" onClick={() => handleNavigate('dashboard')}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    AcaLud
                  </span>
                  <div className="text-xs text-gray-500 -mt-1">
                    Plataforma Académica Lúdica
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navegación desktop */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigate(item.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 transition-all duration-200 ${
                      currentPage === item.key
                        ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Información del usuario y acciones */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Estadísticas del estudiante */}
            {user?.role === 'student' && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 bg-yellow-100 px-3 py-1.5 rounded-full">
                  <Coins className="w-4 h-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-700">{user.coins}</span>
                </div>
                <div className="flex items-center space-x-1 bg-purple-100 px-3 py-1.5 rounded-full">
                  <Trophy className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-purple-700">Nivel {user.level}</span>
                </div>
              </div>
            )}
            
            {/* Información del usuario */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {user?.role === 'teacher' ? 'Docente' : 'Estudiante'}
                </div>
              </div>
              
              {/* Avatar del usuario */}
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              
              {/* Botón de logout */}
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Botón de menú móvil */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Información del usuario en móvil */}
              <div className="flex items-center space-x-3 px-3 py-3 bg-gray-50 rounded-lg mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {user?.role === 'teacher' ? 'Docente' : 'Estudiante'}
                  </div>
                </div>
              </div>

              {/* Estadísticas del estudiante en móvil */}
              {user?.role === 'student' && (
                <div className="flex items-center justify-center space-x-4 px-3 py-2 mb-3">
                  <div className="flex items-center space-x-1 bg-yellow-100 px-3 py-1.5 rounded-full">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    <span className="font-semibold text-yellow-700">{user.coins}</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-purple-100 px-3 py-1.5 rounded-full">
                    <Trophy className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-purple-700">Nivel {user.level}</span>
                  </div>
                </div>
              )}

              {/* Navegación móvil */}
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigate(item.key)}
                    className={`w-full text-left px-3 py-3 rounded-lg text-base font-medium flex items-center space-x-3 transition-colors ${
                      currentPage === item.key
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
              
              {/* Botón de logout en móvil */}
              <button
                onClick={logout}
                className="w-full text-left px-3 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 flex items-center space-x-3 mt-4 border-t border-gray-200 pt-4"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};