import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { Header } from './components/Layout/Header';
import { TeacherDashboard } from './components/Dashboard/TeacherDashboard';
import { StudentDashboard } from './components/Dashboard/StudentDashboard';
import { CreateClassroomForm, EditClassroomForm } from './components/Classroom/CreateClassroomForm';
import { ClassroomManagement } from './components/Classroom/ClassroomManagement';
import { ClassroomDetail } from './components/Classroom/ClassroomDetail';
import { CreateActivityForm } from './components/Activity/CreateActivityForm';
import { ActivityPlayer } from './components/Activity/ActivityPlayer';
import { JoinClassroom } from './components/Classroom/JoinClassroom';
import { StudentClassrooms } from './components/Student/StudentClassrooms';
import { Achievements } from './components/Gamification/Achievements';
import { Store } from './components/Gamification/Store';
import { UserProfile } from './components/UserProfile/UserProfile';
import { GameDemo } from './components/GameDemo';
import { GamesList } from './components/Games/GamesList';
import { TriviaGame } from './components/Games/TriviaGame';
import { CreateGameForm } from './components/Games/CreateGameForm';
import { ActivityRepository } from './components/Activity/ActivityRepository';

type RouteState = {
  classroomId?: string;
  activityId?: string;
  gameId?: string;
  templateActivityId?: string;
  score?: number;
  [key: string]: unknown;
};

const ROUTE_MAP: Record<string, string> = {
  dashboard: '/dashboard',
  classrooms: '/classrooms',
  'create-classroom': '/classrooms/create',
  'edit-classroom': '/classrooms/edit',
  'create-activity': '/activities/create',
  'classroom-detail': '/classrooms/detail',
  'student-classrooms': '/student/classrooms',
  'join-classroom': '/student/classrooms/join',
  'activity-detail': '/activities/detail',
  repository: '/repository',
  achievements: '/achievements',
  store: '/store',
  profile: '/profile',
  games: '/games',
  'create-game': '/games/create',
  'trivia-game': '/games/trivia',
  'game-demo': '/games/demo',
};

const PATH_TO_PAGE_KEY = Object.entries(ROUTE_MAP).reduce<Record<string, string>>((acc, [key, path]) => {
  acc[path] = key;
  return acc;
}, {});

const TEACHER_ALLOWED_PAGES = [
  'dashboard',
  'classrooms',
  'create-classroom',
  'create-activity',
  'edit-classroom',
  'repository',
  'achievements',
  'store',
  'profile',
  'games',
  'create-game',
  'trivia-game',
  'game-demo',
  'activity-detail',
];

const STUDENT_ALLOWED_PAGES = [
  'dashboard',
  'student-classrooms',
  'join-classroom',
  'classroom-detail',
  'activity-detail',
  'repository',
  'achievements',
  'store',
  'profile',
  'games',
  'trivia-game',
  'game-demo',
];

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function resolvePageKey(pathname: string): string {
  const normalized = normalizePath(pathname);

  if (PATH_TO_PAGE_KEY[normalized]) {
    return PATH_TO_PAGE_KEY[normalized];
  }

  if (normalized.startsWith('/activities/detail')) {
    return 'activity-detail';
  }

  return 'dashboard';
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Cargando AcaLud...</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredPathRef = useRef(false);
  const routeState = (location.state as RouteState) ?? {};

  const currentPage = useMemo(() => resolvePageKey(location.pathname), [location.pathname]);

  const handleNavigate = useCallback(
    (page: string, data?: RouteState) => {
      const targetPath = ROUTE_MAP[page] ?? ROUTE_MAP.dashboard;

      navigate(targetPath, { state: data });

      try {
        sessionStorage.setItem('acalud_current_page', targetPath);
      } catch (error) {
        console.warn('No fue posible guardar la ruta seleccionada', error);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!user || restoredPathRef.current) {
      return;
    }

    try {
      const storedPath = sessionStorage.getItem('acalud_current_page');

      if (storedPath && storedPath !== location.pathname) {
        navigate(storedPath, { replace: true });
      }
    } catch (error) {
      console.warn('No fue posible restaurar la última ruta visitada', error);
    } finally {
      restoredPathRef.current = true;
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const allowedPages = user.role === 'teacher' ? TEACHER_ALLOWED_PAGES : STUDENT_ALLOWED_PAGES;

    if (!allowedPages.includes(currentPage)) {
      navigate(ROUTE_MAP.dashboard, { replace: true });
    }
  }, [currentPage, navigate, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    try {
      sessionStorage.setItem('acalud_current_page', normalizePath(location.pathname));
    } catch (error) {
      console.warn('No fue posible persistir la ruta actual', error);
    }
  }, [location.pathname, user]);

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={handleNavigate} currentPage={currentPage} />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              user.role === 'teacher' ? (
                <TeacherDashboard onNavigate={handleNavigate} />
              ) : (
                <StudentDashboard onNavigate={handleNavigate} />
              )
            }
          />
          <Route path="/classrooms" element={<ClassroomManagement onNavigate={handleNavigate} />} />
          <Route
            path="/classrooms/create"
            element={
              <CreateClassroomForm
                onBack={() => handleNavigate('classrooms')}
                onSuccess={(classroomId) => handleNavigate('classrooms', { created: classroomId })}
              />
            }
          />
          <Route
            path="/classrooms/edit"
            element={
              typeof routeState.classroomId === 'string' ? (
                <EditClassroomForm
                  classroomId={routeState.classroomId}
                  onBack={() => handleNavigate('classrooms')}
                  onSuccess={(updatedId) => handleNavigate('classrooms', { updated: updatedId })}
                />
              ) : (
                <Navigate to="/classrooms" replace />
              )
            }
          />
          <Route
            path="/classrooms/detail"
            element={
              typeof routeState.classroomId === 'string' ? (
                <ClassroomDetail
                  classroomId={routeState.classroomId}
                  onBack={() => handleNavigate('classrooms')}
                  onEdit={(id) => handleNavigate('edit-classroom', { classroomId: id })}
                  onCreateActivity={(id) => handleNavigate('create-activity', { classroomId: id })}
                />
              ) : (
                <Navigate to="/classrooms" replace />
              )
            }
          />
          <Route
            path="/activities/create"
            element={
              <CreateActivityForm
                onBack={() => handleNavigate('classrooms')}
                onSuccess={(activityId) => handleNavigate('classrooms', { activityCreated: activityId })}
                classroomId={typeof routeState.classroomId === 'string' ? routeState.classroomId : undefined}
              />
            }
          />
          <Route
            path="/student/classrooms"
            element={
              <StudentClassrooms
                onNavigate={handleNavigate}
                initialClassroomId={typeof routeState.classroomId === 'string' ? routeState.classroomId : undefined}
              />
            }
          />
          <Route
            path="/student/classrooms/join"
            element={
              <JoinClassroom
                onBack={() => handleNavigate('student-classrooms')}
                onSuccess={(classroomId) => handleNavigate('student-classrooms', { joined: classroomId })}
              />
            }
          />
          <Route
            path="/activities/detail"
            element={
              typeof routeState.activityId === 'string' && typeof routeState.classroomId === 'string' ? (
                <ActivityPlayer
                  activityId={routeState.activityId}
                  classroomId={routeState.classroomId}
                  onBack={() => handleNavigate('student-classrooms')}
                  onComplete={(score: number) => handleNavigate('student-classrooms', { activityCompleted: true, score })}
                />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/repository"
            element={<ActivityRepository onNavigate={handleNavigate} onBack={() => handleNavigate('dashboard')} />}
          />
          <Route path="/achievements" element={<Achievements onBack={() => handleNavigate('dashboard')} />} />
          <Route path="/store" element={<Store onBack={() => handleNavigate('dashboard')} />} />
          <Route path="/profile" element={<UserProfile onBack={() => handleNavigate('dashboard')} />} />
          <Route path="/games" element={<GamesList onNavigate={handleNavigate} />} />
          <Route path="/games/create" element={<CreateGameForm onNavigate={handleNavigate} />} />
          <Route
            path="/games/trivia"
            element={
              typeof routeState.gameId === 'string' ? (
                <TriviaGame gameId={routeState.gameId} />
              ) : (
                <GamesList onNavigate={handleNavigate} />
              )
            }
          />
          <Route path="/games/demo" element={<GameDemo onBack={() => handleNavigate('dashboard')} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function UnauthenticatedApp() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      sessionStorage.removeItem('acalud_current_page');
    } catch (error) {
      console.warn('No fue posible limpiar la ruta almacenada', error);
    }
  }, []);

  return (
    <Routes>
      <Route
        path="/auth/login"
        element={<LoginForm onSwitchToRegister={() => navigate('/auth/register')} />}
      />
      <Route
        path="/auth/register"
        element={<RegisterForm onSwitchToLogin={() => navigate('/auth/login')} />}
      />
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user && !location.pathname.startsWith('/auth/')) {
      navigate('/auth/login', { replace: true });
    }
  }, [isLoading, location.pathname, navigate, user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <UnauthenticatedApp />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;