// ============================================================================
// 👥 GUARD DE ROLES - CONTROLA ACCESO POR ROL DE USUARIO
// ============================================================================
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  allowedRoles: string[];
}

/**
 * Guard que protege rutas según el rol del usuario
 * Redirige a página no autorizada si el rol no coincide
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { user } = useAuth();

  // Si no hay usuario (no debería pasar por AuthGuard), redirigir
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Verificar si el rol del usuario está permitido
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Usuario con rol correcto, renderizar contenido
  return <Outlet />;
};
