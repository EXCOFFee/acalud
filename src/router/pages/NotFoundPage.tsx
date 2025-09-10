// ============================================================================
// 404 - PÁGINA NO ENCONTRADA
// ============================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <Search className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Página no encontrada
          </h2>
          <p className="text-gray-600 mb-8">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Ir al Dashboard</span>
          </Link>
          
          <div className="text-sm text-gray-500">
            <button
              onClick={() => window.history.back()}
              className="text-indigo-600 hover:text-indigo-700"
            >
              ← Volver atrás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
