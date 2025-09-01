// ============================================================================
// 🏠 COMPONENTE PRINCIPAL DE LA APLICACIÓN ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este es el "cerebro principal" de toda la aplicación AcaLud.
 * Es como el director de orquesta que decide qué mostrar en cada momento:
 * - Si no hay usuario logueado → muestra login/registro
 * - Si hay usuario logueado → muestra la app principal
 * - Maneja toda la navegación entre páginas
 * 
 * 🤔 ¿POR QUÉ ES IMPORTANTE?
 * - Es el punto de entrada único de toda la aplicación
 * - Coordina el estado de autenticación con la navegación
 * - Decide qué componente mostrar según el usuario y página actual
 * - Maneja la experiencia de usuario de manera fluida
 * 
 * 🏗️ ARQUITECTURA:
 * - AuthProvider: Proporciona contexto de autenticación a toda la app
 * - AppContent: Lógica principal de navegación y renderizado
 * - Sistema de rutas: Navegación simple basada en estado interno
 * - Componentes modulares: Cada página es un componente independiente
 */

import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// 🔐 COMPONENTES DE AUTENTICACIÓN
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';

// 🎨 COMPONENTES DE LAYOUT
import { Header } from './components/Layout/Header';

// 📊 COMPONENTES DE DASHBOARD (PÁGINA PRINCIPAL)
import { TeacherDashboard } from './components/Dashboard/TeacherDashboard';
import { StudentDashboard } from './components/Dashboard/StudentDashboard';

// 🏫 COMPONENTES DE GESTIÓN DE AULAS
import { CreateClassroomForm } from './components/Classroom/CreateClassroomForm';
import { ClassroomManagement } from './components/Classroom/ClassroomManagement';
import { CreateActivityForm } from './components/Activity/CreateActivityForm';
import { JoinClassroom } from './components/Classroom/JoinClassroom';
import { StudentClassrooms } from './components/Student/StudentClassrooms';

// 🏆 COMPONENTES DE GAMIFICACIÓN
import { Achievements } from './components/Gamification/Achievements';
import { Store } from './components/Gamification/Store';

// 👤 COMPONENTE DE PERFIL
import { UserProfile } from './components/UserProfile/UserProfile';

/**
 * 🧠 COMPONENTE PRINCIPAL DE CONTENIDO
 * 
 * ¿Qué hace?
 * Este componente decide QUÉ mostrar en cada momento basándose en:
 * 1. ¿Hay usuario logueado? → Mostrar app o login
 * 2. ¿Qué página quiere ver? → Mostrar componente correspondiente
 * 3. ¿Qué rol tiene? → Mostrar opciones apropiadas
 * 
 * Estados principales:
 * - Loading: Verificando si hay sesión activa
 * - No autenticado: Formularios de login/registro
 * - Autenticado: Aplicación principal con navegación
 */
function AppContent() {
  // 📡 OBTENER ESTADO DE AUTENTICACIÓN
  // useAuth() nos conecta con el contexto global de autenticación
  const { user, isLoading } = useAuth();
  
  // 🧭 ESTADO DE NAVEGACIÓN
  const [currentPage, setCurrentPage] = useState('dashboard');  // Página actual
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');  // Modo de auth
  const [navigationData, setNavigationData] = useState<any>(null);  // Datos entre páginas

  /**
   * 🧭 FUNCIÓN DE NAVEGACIÓN
   * 
   * ¿Para qué sirve?
   * Permite que cualquier componente pueda cambiar de página.
   * Es como tener un "control remoto" para la navegación.
   * 
   * @param page - A qué página queremos ir (ej: 'dashboard', 'profile')
   * @param data - Información extra para pasar a la página (opcional)
   * 
   * Ejemplo de uso:
   * handleNavigate('profile') → Va al perfil
   * handleNavigate('classrooms', { created: '123' }) → Va a aulas con datos
   */
  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page);        // Cambiar la página actual
    setNavigationData(data);     // Guardar datos para la nueva página
  };

  /**
   * 🎭 FUNCIÓN PRINCIPAL DE RENDERIZADO
   * 
   * ¿Qué hace?
   * Decide qué mostrar basándose en el estado actual:
   * 1. Si isLoading = true → Spinner de carga
   * 2. Si user = null → Formularios de login/registro
   * 3. Si user existe → Aplicación principal
   */
  const renderMainContent = () => {
    // 🔄 ESTADO DE CARGA
    // Mientras verificamos si hay sesión activa, mostramos un spinner bonito
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            {/* 🎡 Spinner animado con CSS */}
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Cargando AcaLud...</p>
          </div>
        </div>
      );
    }

    // 🔐 USUARIO NO AUTENTICADO
    // Si no hay usuario logueado, mostramos los formularios de entrada
    if (!user) {
      if (authMode === 'login') {
        return (
          <LoginForm 
            onSwitchToRegister={() => setAuthMode('register')}  // Cambiar a registro
          />
        );
      } else {
        return (
          <RegisterForm 
            onSwitchToLogin={() => setAuthMode('login')}  // Cambiar a login
          />
        );
      }
    }

    // ✅ USUARIO AUTENTICADO
    // Si hay usuario logueado, mostramos la aplicación principal
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 🎨 HEADER SIEMPRE VISIBLE */}
        <Header 
          onNavigate={handleNavigate}   // Función para navegar desde el header
          currentPage={currentPage}     // Página actual para destacar en menu
        />
        
        {/* 📄 CONTENIDO PRINCIPAL */}
        <main>
          {renderPageContent()}  {/* Aquí se muestra el contenido de cada página */}
        </main>
      </div>
    );
  };

  /**
   * Renderiza el contenido de la página actual
   */
  const renderPageContent = () => {
    if (!user) return null;

    switch (currentPage) {
      case 'dashboard':
        // Mostrar dashboard según el rol del usuario
        if (user.role === 'teacher') {
          return <TeacherDashboard onNavigate={handleNavigate} />;
        } else {
          return <StudentDashboard onNavigate={handleNavigate} />;
        }

      // Gestión de aulas para profesores
      case 'classrooms':
        return <ClassroomManagement onNavigate={handleNavigate} />;

      case 'create-classroom':
        return <CreateClassroomForm 
          onBack={() => handleNavigate('classrooms')} 
          onSuccess={(classroomId) => handleNavigate('classrooms', { created: classroomId })}
        />;

      case 'create-activity':
        return <CreateActivityForm 
          onBack={() => handleNavigate('classrooms')} 
          onSuccess={(activityId) => handleNavigate('classrooms', { activityCreated: activityId })}
          classroomId={navigationData?.classroomId} 
        />;

      // Gestión de aulas para estudiantes
      case 'student-classrooms':
        return <StudentClassrooms onNavigate={handleNavigate} />;

      case 'join-classroom':
        return <JoinClassroom 
          onBack={() => handleNavigate('student-classrooms')} 
          onSuccess={(classroomId) => handleNavigate('student-classrooms', { joined: classroomId })}
        />;

      // Sistema de repositorio
      case 'repository':
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Repositorio de Actividades</h1>
              <p className="text-gray-600">Explora y comparte actividades educativas</p>
              <div className="mt-8 p-8 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500">Funcionalidad en desarrollo...</p>
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Volver al Dashboard
                </button>
              </div>
            </div>
          </div>
        );

      // Sistema de gamificación
      case 'achievements':
        return <Achievements onBack={() => handleNavigate('dashboard')} />;

      case 'store':
        return <Store onBack={() => handleNavigate('dashboard')} />;

      // Perfil de usuario
      case 'profile':
        return <UserProfile onBack={() => handleNavigate('dashboard')} />;

      default:
        // Página no encontrada - redirigir al dashboard
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Página no encontrada</h1>
              <p className="text-gray-600 mb-8">La página que buscas no existe.</p>
              <button
                onClick={() => handleNavigate('dashboard')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return renderMainContent();
}

/**
 * 🎯 COMPONENTE APP PRINCIPAL CON PROVEEDOR DE CONTEXTO
 * 
 * ¿Por qué está separado de AppContent?
 * El componente App actúa como un "envoltorio" que proporciona el contexto
 * de autenticación a toda la aplicación. AppContent puede usar useAuth()
 * porque está dentro del AuthProvider.
 * 
 * Es como una caja que contiene toda la aplicación y le da acceso
 * a la información de autenticación.
 */
function App() {
  return (
    <AuthProvider>
      {/* 🎁 AuthProvider envuelve toda la app */}
      {/* Esto permite que cualquier componente use useAuth() */}
      <AppContent />
    </AuthProvider>
  );
}

export default App;

/**
 * 📝 RESUMEN COMPLETO DE ESTE ARCHIVO:
 * 
 * 🎯 PROPÓSITO PRINCIPAL:
 * Este archivo es el "director de orquesta" de AcaLud. Coordina:
 * - Estado de autenticación (¿quién está logueado?)
 * - Navegación entre páginas (¿qué quiere ver?)
 * - Experiencia de usuario (transiciones fluidas)
 * 
 * 🏗️ ARQUITECTURA:
 * 
 * 1. 📦 CAPA DE CONTEXTO (App):
 *    - AuthProvider: Da acceso global al estado de auth
 *    - Envuelve toda la aplicación
 * 
 * 2. 🧠 CAPA DE LÓGICA (AppContent):
 *    - Maneja navegación y estado de páginas
 *    - Decide qué componente renderizar
 *    - Coordina paso de datos entre páginas
 * 
 * 3. 🎨 CAPA DE PRESENTACIÓN (Componentes):
 *    - Cada página es un componente independiente
 *    - Sistema de props para comunicación
 *    - UI consistente con Tailwind CSS
 * 
 * 🔄 FLUJO DE NAVEGACIÓN:
 * 
 * 1. Usuario hace clic en algo
 * 2. Componente llama handleNavigate('nueva-pagina', datos)
 * 3. App.tsx actualiza currentPage y navigationData
 * 4. renderPageContent() ve el cambio y muestra nueva página
 * 5. Nueva página recibe datos via navigationData
 * 
 * 📋 PÁGINAS DISPONIBLES:
 * 
 * 🏠 COMUNES:
 * - dashboard: Página principal (diferente según rol)
 * - profile: Perfil del usuario
 * 
 * 👨‍🏫 PARA PROFESORES:
 * - classrooms: Gestión de aulas
 * - create-classroom: Crear nueva aula
 * - create-activity: Crear actividad para aula
 * 
 * 🎒 PARA ESTUDIANTES:
 * - student-classrooms: Ver aulas donde está inscrito
 * - join-classroom: Unirse a nueva aula
 * 
 * 🏆 GAMIFICACIÓN:
 * - achievements: Ver logros obtenidos
 * - store: Tienda virtual de items
 * 
 * 📚 FUTURAS:
 * - repository: Repositorio público de actividades
 * 
 * 💡 VENTAJAS DE ESTA ARQUITECTURA:
 * 
 * ✅ SIMPLICIDAD:
 * - No necesitamos React Router para un SPA simple
 * - Estado de navegación centralizado y predecible
 * 
 * ✅ FLEXIBILIDAD:
 * - Fácil pasar datos entre páginas
 * - Control total sobre transiciones
 * 
 * ✅ RENDIMIENTO:
 * - No hay recargas de página
 * - Componentes se montan/desmontan según necesidad
 * 
 * ✅ MANTENIBILIDAD:
 * - Toda la lógica de navegación en un lugar
 * - Fácil agregar nuevas páginas
 * 
 * 🚀 EJEMPLO DE USO DESDE OTRO COMPONENTE:
 * 
 * ```tsx
 * // En cualquier componente
 * function MiComponente({ onNavigate }) {
 *   const handleClick = () => {
 *     // Navegar a perfil
 *     onNavigate('profile');
 *     
 *     // Navegar con datos
 *     onNavigate('create-activity', { classroomId: '123' });
 *   };
 * }
 * ```
 * 
 * 🔮 POSIBLES MEJORAS FUTURAS:
 * - Implementar React Router para URLs amigables
 * - Añadir animaciones entre transiciones de página
 * - Implementar lazy loading de componentes
 * - Añadir breadcrumbs para navegación compleja
 * - Historial de navegación (botón atrás)
 */