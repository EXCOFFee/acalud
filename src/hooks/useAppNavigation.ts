// ============================================================================
// 🧭 HOOK DE NAVEGACIÓN - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE HOOK?
 * Proporciona funciones de navegación reutilizables para toda la app.
 * Reemplaza las funciones hardcodeadas con navegación real.
 */

import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export const useAppNavigation = () => {
  const navigate = useNavigate();

  // ============================================================================
  // 🏠 NAVEGACIÓN PRINCIPAL
  // ============================================================================
  
  const navigateTo = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goToHome = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  // ============================================================================
  // 🔐 NAVEGACIÓN DE AUTENTICACIÓN
  // ============================================================================
  
  const goToLogin = useCallback(() => {
    navigate('/auth/login');
  }, [navigate]);

  const goToRegister = useCallback(() => {
    navigate('/auth/register');
  }, [navigate]);

  // ============================================================================
  // 🏫 NAVEGACIÓN DE AULAS
  // ============================================================================
  
  const goToClassrooms = useCallback(() => {
    navigate('/classrooms');
  }, [navigate]);

  const goToCreateClassroom = useCallback(() => {
    navigate('/classrooms/create');
  }, [navigate]);

  const goToClassroom = useCallback((id: string) => {
    navigate(`/classrooms/${id}`);
  }, [navigate]);

  const goToMyClassrooms = useCallback(() => {
    navigate('/my-classrooms');
  }, [navigate]);

  const goToJoinClassroom = useCallback(() => {
    navigate('/my-classrooms/join');
  }, [navigate]);

  // ============================================================================
  // 📚 NAVEGACIÓN DE ACTIVIDADES
  // ============================================================================
  
  const goToCreateActivity = useCallback((classroomId: string) => {
    navigate(`/classrooms/${classroomId}/activities/create`);
  }, [navigate]);

  const goToActivity = useCallback((id: string) => {
    navigate(`/activities/${id}`);
  }, [navigate]);

  const goToRepository = useCallback(() => {
    navigate('/repository');
  }, [navigate]);

  // ============================================================================
  // 🎮 NAVEGACIÓN DE GAMIFICACIÓN
  // ============================================================================
  
  const goToAchievements = useCallback(() => {
    navigate('/achievements');
  }, [navigate]);

  const goToStore = useCallback(() => {
    navigate('/store');
  }, [navigate]);

  // ============================================================================
  // 👤 NAVEGACIÓN DE PERFIL
  // ============================================================================
  
  const goToProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  // ============================================================================
  // 📊 NAVEGACIÓN ESPECÍFICA POR ROL
  // ============================================================================
  
  const getNavigationHandler = useCallback((page: string) => {
    const handlers: Record<string, () => void> = {
      'dashboard': goToHome,
      'classrooms': goToClassrooms,
      'my-classrooms': goToMyClassrooms,
      'create-classroom': goToCreateClassroom,
      'join-classroom': goToJoinClassroom,
      'repository': goToRepository,
      'achievements': goToAchievements,
      'store': goToStore,
      'profile': goToProfile,
      'login': goToLogin,
      'register': goToRegister,
    };

    return handlers[page] || (() => navigateTo(`/${page}`));
  }, [
    goToHome, goToClassrooms, goToMyClassrooms, goToCreateClassroom,
    goToJoinClassroom, goToRepository, goToAchievements, goToStore,
    goToProfile, goToLogin, goToRegister, navigateTo
  ]);

  // ============================================================================
  // 🎯 FUNCIONES DE CALLBACK PARA COMPONENTES
  // ============================================================================
  
  const createNavigationHandler = useCallback((defaultPath?: string) => {
    return (page?: string) => {
      if (page) {
        const handler = getNavigationHandler(page);
        handler();
      } else if (defaultPath) {
        navigateTo(defaultPath);
      } else {
        goBack();
      }
    };
  }, [getNavigationHandler, navigateTo, goBack]);

  const createSuccessHandler = useCallback((successPath: string) => {
    return () => navigateTo(successPath);
  }, [navigateTo]);

  const createBackHandler = useCallback((backPath?: string) => {
    return () => {
      if (backPath) {
        navigateTo(backPath);
      } else {
        goBack();
      }
    };
  }, [navigateTo, goBack]);

  return {
    // Navegación básica
    navigateTo,
    goBack,
    goToHome,
    
    // Navegación específica
    goToLogin,
    goToRegister,
    goToClassrooms,
    goToCreateClassroom,
    goToClassroom,
    goToMyClassrooms,
    goToJoinClassroom,
    goToCreateActivity,
    goToActivity,
    goToRepository,
    goToAchievements,
    goToStore,
    goToProfile,
    
    // Handlers para componentes
    createNavigationHandler,
    createSuccessHandler,
    createBackHandler,
    getNavigationHandler,
  };
};
