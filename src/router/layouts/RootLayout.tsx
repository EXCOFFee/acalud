// ============================================================================
// 🏗️ LAYOUT RAÍZ - CONFIGURACIÓN GLOBAL
// ============================================================================
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';

/**
 * Layout raíz que envuelve toda la aplicación
 * Proporciona el contexto de autenticación global
 */
export const RootLayout: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Outlet />
      </div>
    </AuthProvider>
  );
};
