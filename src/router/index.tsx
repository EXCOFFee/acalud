// ============================================================================
// 🧭 SISTEMA DE RUTAS CON REACT ROUTER - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Define todas las rutas de la aplicación con React Router.
 * Reemplaza el sistema de navegación anterior con URLs amigables.
 * 
 * 🏗️ ARQUITECTURA:
 * - Rutas públicas: Login/Register (sin autenticación)
 * - Rutas privadas: Dashboard, aulas, etc. (requieren login)
 * - Guards de ruta: Verifican permisos según el rol
 * - Lazy loading: Carga componentes bajo demanda
 */

import { 
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate
} from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import { RootLayout } from './layouts/RootLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedLayout } from './layouts/ProtectedLayout';

// Guards
import { AuthGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';

// Componentes de carga
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
);

// ============================================================================
// 🔐 COMPONENTES LAZY (CARGA BAJO DEMANDA)
// ============================================================================

// Autenticación
const LoginForm = lazy(() => 
  import('../components/Auth/LoginForm').then(module => ({ default: module.LoginForm }))
);
const RegisterForm = lazy(() => 
  import('../components/Auth/RegisterForm').then(module => ({ default: module.RegisterForm }))
);

// Dashboards
const TeacherDashboard = lazy(() => 
  import('../components/Dashboard/TeacherDashboard').then(module => ({ default: module.TeacherDashboard }))
);
const StudentDashboard = lazy(() => 
  import('../components/Dashboard/StudentDashboard').then(module => ({ default: module.StudentDashboard }))
);

// Aulas - Profesor
const ClassroomManagement = lazy(() => 
  import('../components/Classroom/ClassroomManagement').then(module => ({ default: module.ClassroomManagement }))
);
const CreateClassroomForm = lazy(() => 
  import('../components/Classroom/CreateClassroomForm').then(module => ({ default: module.CreateClassroomForm }))
);

// Aulas - Estudiante  
const StudentClassrooms = lazy(() => 
  import('../components/Student/StudentClassrooms').then(module => ({ default: module.StudentClassrooms }))
);
const JoinClassroom = lazy(() => 
  import('../components/Classroom/JoinClassroom').then(module => ({ default: module.JoinClassroom }))
);

// Actividades
const CreateActivityForm = lazy(() => 
  import('../components/Activity/CreateActivityForm').then(module => ({ default: module.CreateActivityForm }))
);

// Gamificación
const Achievements = lazy(() => 
  import('../components/Gamification/Achievements').then(module => ({ default: module.Achievements }))
);
const Store = lazy(() => 
  import('../components/Gamification/Store').then(module => ({ default: module.Store }))
);

// Perfil
const UserProfile = lazy(() => 
  import('../components/UserProfile/UserProfile').then(module => ({ default: module.UserProfile }))
);

// Páginas especiales
const NotFound = lazy(() => import('./pages/NotFoundPage'));
const Unauthorized = lazy(() => import('./pages/UnauthorizedPage'));

// ============================================================================
// 🛡️ COMPONENTE WRAPPER PARA LAZY LOADING
// ============================================================================

interface LazyWrapperProps {
  children: React.ReactNode;
}

const LazyWrapper: React.FC<LazyWrapperProps> = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

// ============================================================================
// 🗺️ DEFINICIÓN DE RUTAS
// ============================================================================

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<RootLayout />}>
      {/* ============================================================================ */}
      {/* 🏠 RUTA RAÍZ - REDIRIGE SEGÚN AUTENTICACIÓN */}
      {/* ============================================================================ */}
      <Route index element={<Navigate to="/dashboard" replace />} />

      {/* ============================================================================ */}
      {/* 🔐 RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN) */}
      {/* ============================================================================ */}
      <Route path="auth" element={<AuthLayout />}>
        <Route path="login" element={
          <LazyWrapper>
            <LoginForm onSwitchToRegister={() => window.location.href = '/auth/register'} />
          </LazyWrapper>
        } />
        <Route path="register" element={
          <LazyWrapper>
            <RegisterForm onSwitchToLogin={() => window.location.href = '/auth/login'} />
          </LazyWrapper>
        } />
        {/* Redirigir /auth a /auth/login */}
        <Route index element={<Navigate to="login" replace />} />
      </Route>

      {/* ============================================================================ */}
      {/* 🛡️ RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN) */}
      {/* ============================================================================ */}
      <Route element={<AuthGuard />}>
        <Route element={<ProtectedLayout />}>
          
          {/* ============================================================================ */}
          {/* 📊 DASHBOARD PRINCIPAL */}
          {/* ============================================================================ */}
          <Route path="dashboard" element={
            <LazyWrapper>
              <DashboardRouter />
            </LazyWrapper>
          } />

          {/* ============================================================================ */}
          {/* 🏫 GESTIÓN DE AULAS - SOLO PROFESORES */}
          {/* ============================================================================ */}
          <Route element={<RoleGuard allowedRoles={['teacher']} />}>
            <Route path="classrooms">
              <Route index element={
                <LazyWrapper>
                  <ClassroomManagement />
                </LazyWrapper>
              } />
              <Route path="create" element={
                <LazyWrapper>
                  <CreateClassroomForm />
                </LazyWrapper>
              } />
              <Route path=":id/activities/create" element={
                <LazyWrapper>
                  <CreateActivityForm />
                </LazyWrapper>
              } />
            </Route>
          </Route>

          {/* ============================================================================ */}
          {/* 🎒 AULAS PARA ESTUDIANTES */}
          {/* ============================================================================ */}
          <Route element={<RoleGuard allowedRoles={['student']} />}>
            <Route path="my-classrooms">
              <Route index element={
                <LazyWrapper>
                  <StudentClassrooms />
                </LazyWrapper>
              } />
              <Route path="join" element={
                <LazyWrapper>
                  <JoinClassroom />
                </LazyWrapper>
              } />
            </Route>
          </Route>

          {/* ============================================================================ */}
          {/* 🏆 SISTEMA DE GAMIFICACIÓN */}
          {/* ============================================================================ */}
          <Route path="achievements" element={
            <LazyWrapper>
              <Achievements />
            </LazyWrapper>
          } />
          <Route path="store" element={
            <LazyWrapper>
              <Store />
            </LazyWrapper>
          } />

          {/* ============================================================================ */}
          {/* 👤 PERFIL DE USUARIO */}
          {/* ============================================================================ */}
          <Route path="profile" element={
            <LazyWrapper>
              <UserProfile />
            </LazyWrapper>
          } />

          {/* ============================================================================ */}
          {/* 📚 REPOSITORIO DE ACTIVIDADES */}
          {/* ============================================================================ */}
          <Route path="repository" element={
            <LazyWrapper>
              <RepositoryPage />
            </LazyWrapper>
          } />

        </Route>
      </Route>

      {/* ============================================================================ */}
      {/* ❌ PÁGINAS DE ERROR */}
      {/* ============================================================================ */}
      <Route path="unauthorized" element={
        <LazyWrapper>
          <Unauthorized />
        </LazyWrapper>
      } />
      <Route path="*" element={
        <LazyWrapper>
          <NotFound />
        </LazyWrapper>
      } />
    </Route>
  )
);

// ============================================================================
// 🧭 COMPONENTE ROUTER PARA DASHBOARD SEGÚN ROL
// ============================================================================

const DashboardRouter: React.FC = () => {
  // Este componente se reemplazará por el hook useAuth
  const user = null; // Placeholder
  
  if (!user) return <PageLoader />;
  
  if (user.role === 'teacher') {
    return <TeacherDashboard />;
  }
  
  return <StudentDashboard />;
};

// ============================================================================
// 📄 PÁGINA TEMPORAL PARA REPOSITORIO
// ============================================================================

const RepositoryPage: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Repositorio de Actividades</h1>
      <p className="text-gray-600">Explora y comparte actividades educativas</p>
      <div className="mt-8 p-8 bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-500">Funcionalidad en desarrollo...</p>
      </div>
    </div>
  </div>
);

/**
 * 📝 RESUMEN DE ESTE ARCHIVO:
 * 
 * 🎯 CARACTERÍSTICAS PRINCIPALES:
 * ✅ URLs amigables y navegables
 * ✅ Lazy loading para mejor rendimiento
 * ✅ Guards de ruta para seguridad
 * ✅ Separación por roles (teacher/student)
 * ✅ Manejo de errores 404/401
 * ✅ Layouts reutilizables
 * 
 * 🚀 BENEFICIOS:
 * ✅ SEO friendly con URLs descriptivas
 * ✅ Navegación del navegador (back/forward)
 * ✅ Bookmarkeable URLs
 * ✅ Mejor UX con carga progresiva
 * ✅ Código más organizado y mantenible
 * 
 * 🔗 EJEMPLOS DE URLs:
 * - /auth/login → Página de login
 * - /dashboard → Dashboard según rol
 * - /classrooms → Gestión de aulas (profesores)
 * - /my-classrooms → Aulas del estudiante
 * - /classrooms/create → Crear nueva aula
 * - /achievements → Ver logros
 * - /store → Tienda virtual
 * - /profile → Perfil del usuario
 */
