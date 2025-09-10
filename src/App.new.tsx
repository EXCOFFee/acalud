// ============================================================================
// 🏠 NUEVA APP PRINCIPAL CON REACT ROUTER - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Nueva versión del App principal que usa React Router para navegación.
 * Reemplaza el sistema de navegación manual con URLs amigables.
 * 
 * 🏗️ MEJORAS IMPLEMENTADAS:
 * ✅ React Router para URLs amigables
 * ✅ Lazy loading automático de componentes
 * ✅ Code splitting para mejor rendimiento
 * ✅ Guards de ruta para seguridad
 * ✅ Layouts reutilizables
 */

import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * 🎯 COMPONENTE APP PRINCIPAL CON ROUTER
 * 
 * ¿Qué cambió?
 * - Reemplaza el sistema de navegación manual
 * - Usa React Router para manejo de rutas
 * - Implementa lazy loading automático
 * - Mejor manejo de errores con ErrorBoundary
 */
function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
