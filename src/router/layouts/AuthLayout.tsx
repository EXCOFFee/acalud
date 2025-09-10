// ============================================================================
// 🔐 LAYOUT DE AUTENTICACIÓN 
// ============================================================================
import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Layout para páginas de autenticación (login/register)
 * Diseño centrado y estilizado para formularios de auth
 */
export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Outlet />
      </div>
    </div>
  );
};
