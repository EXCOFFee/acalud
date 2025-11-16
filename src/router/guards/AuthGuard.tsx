// ============================================================================
// 🛡️ GUARD DE AUTENTICACIÓN - PROTEGE RUTAS PRIVADAS
// ============================================================================
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

/**
 * Guard que protege rutas que requieren autenticación
 * Redirige a login si el usuario no está autenticado
 */
export const AuthGuard: React.FC = () => {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se inicializa la autenticación
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Redirigir a login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Usuario autenticado, renderizar contenido protegido
  return <Outlet />;
};
