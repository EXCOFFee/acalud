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
import { lazy } from 'react';
import {
  DashboardRouter,
  LazyWrapper,
  RepositoryPage,
} from './RouterComponents';
import { 
  ClassroomManagementWrapper,
  CreateClassroomFormWrapper,
  CreateActivityFormWrapper,
  StudentClassroomsWrapper,
  JoinClassroomWrapper,
  AchievementsWrapper,
  StoreWrapper,
  UserProfileWrapper
} from './components/NavigationWrappers';

// Layouts
import { RootLayout } from './layouts/RootLayout.tsx';
import { AuthLayout } from './layouts/AuthLayout.tsx';
import { ProtectedLayout } from './layouts/ProtectedLayout.tsx';

// Guards
import { AuthGuard } from './guards/AuthGuard.tsx';
import { RoleGuard } from './guards/RoleGuard.tsx';

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
const PasswordRecovery = lazy(() => 
  import('../components/Auth/PasswordRecovery')
);
const AcceptInvitationPage = lazy(() =>
  import('../components/Invitations/AcceptInvitationPage').then(module => ({ default: module.AcceptInvitationPage }))
);

// Páginas especiales
const NotFound = lazy(() => import('./pages/NotFoundPage.tsx'));
const Unauthorized = lazy(() => import('./pages/UnauthorizedPage.tsx'));

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
      {/* 🔄 RECUPERACIÓN DE CONTRASEÑA */}
      {/* ============================================================================ */}
      <Route path="password-recovery" element={
        <LazyWrapper>
          <PasswordRecovery />
        </LazyWrapper>
      } />
      <Route path="reset-password" element={
        <LazyWrapper>
          <PasswordRecovery />
        </LazyWrapper>
      } />
      <Route path="invitations/accept" element={
        <LazyWrapper>
          <AcceptInvitationPage />
        </LazyWrapper>
      } />

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
