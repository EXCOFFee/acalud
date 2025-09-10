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
  Navigate,
  useNavigate
} from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ClassroomManagementWrapper,
  CreateClassroomFormWrapper,
  CreateActivityFormWrapper,
  StudentClassroomsWrapper,
  JoinClassroomWrapper,
  AchievementsWrapper,
  StoreWrapper,
  UserProfileWrapper,
  TeacherDashboardWrapper,
  StudentDashboardWrapper
} from './components/NavigationWrappers';

// Layouts
import { RootLayout } from './layouts/RootLayout.tsx';
import { AuthLayout } from './layouts/AuthLayout.tsx';
import { ProtectedLayout } from './layouts/ProtectedLayout.tsx';

// Guards
import { AuthGuard } from './guards/AuthGuard.tsx';
import { RoleGuard } from './guards/RoleGuard.tsx';

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

// Páginas especiales
const NotFound = lazy(() => import('./pages/NotFoundPage.tsx'));
const Unauthorized = lazy(() => import('./pages/UnauthorizedPage.tsx'));

// ============================================================================
// 🧭 COMPONENTE ROUTER PARA DASHBOARD SEGÚN ROL
// ============================================================================

const DashboardRouter: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  if (isLoading) return <PageLoader />;
  
  if (!user) {
    navigate('/auth/login');
    return null;
  }
  
  if (user.role === 'teacher') {
    return <TeacherDashboardWrapper />;
  }
  
  return <StudentDashboardWrapper />;
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
                  <ClassroomManagementWrapper />
                </LazyWrapper>
              } />
              <Route path="create" element={
                <LazyWrapper>
                  <CreateClassroomFormWrapper />
                </LazyWrapper>
              } />
              <Route path=":id/activities/create" element={
                <LazyWrapper>
                  <CreateActivityFormWrapper />
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
                  <StudentClassroomsWrapper />
                </LazyWrapper>
              } />
              <Route path="join" element={
                <LazyWrapper>
                  <JoinClassroomWrapper />
                </LazyWrapper>
              } />
            </Route>
          </Route>

          {/* ============================================================================ */}
          {/* 🏆 SISTEMA DE GAMIFICACIÓN */}
          {/* ============================================================================ */}
          <Route path="achievements" element={
            <LazyWrapper>
              <AchievementsWrapper />
            </LazyWrapper>
          } />
          <Route path="store" element={
            <LazyWrapper>
              <StoreWrapper />
            </LazyWrapper>
          } />

          {/* ============================================================================ */}
          {/* 👤 PERFIL DE USUARIO */}
          {/* ============================================================================ */}
          <Route path="profile" element={
            <LazyWrapper>
              <UserProfileWrapper />
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
