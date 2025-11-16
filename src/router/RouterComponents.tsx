import { Suspense, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import {
  TeacherDashboardWrapper,
  StudentDashboardWrapper,
} from './components/NavigationWrappers';

export function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

export function DashboardRouter() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    navigate('/auth/login');
    return null;
  }

  if (user.role === 'teacher') {
    return <TeacherDashboardWrapper />;
  }

  return <StudentDashboardWrapper />;
}

export function RepositoryPage() {
  return (
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
}

interface LazyWrapperProps {
  children: ReactNode;
}

export function LazyWrapper({ children }: LazyWrapperProps) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}
