// ============================================================================
// 🛡️ LAYOUT PROTEGIDO - CON HEADER Y NAVEGACIÓN
// ============================================================================
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../../components/Layout/Header';

/**
 * Layout para páginas que requieren autenticación
 * Incluye el header de navegación y el área de contenido principal
 */
export const ProtectedLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onNavigate={(page) => console.log('Navigate to:', page)} 
        currentPage="dashboard" 
      />
      <main>
        <Outlet />
      </main>
    </div>
  );
};
