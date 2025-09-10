// ============================================================================
// 🧭 COMPONENTES WRAPPER PARA NAVEGACIÓN - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Proporciona wrappers para componentes que necesitan navegación.
 * Evita hardcodear handlers y proporciona navegación real.
 */

import React from 'react';
import { useAppNavigation } from '../../hooks/useAppNavigation';

// Importar componentes que necesitan navegación
import { ClassroomManagement } from '../../components/Classroom/ClassroomManagement';
import { CreateClassroomForm } from '../../components/Classroom/CreateClassroomForm';
import { CreateActivityForm } from '../../components/Activity/CreateActivityForm';
import { StudentClassrooms } from '../../components/Student/StudentClassrooms';
import { JoinClassroom } from '../../components/Classroom/JoinClassroom';
import { Achievements } from '../../components/Gamification/Achievements';
import { Store } from '../../components/Gamification/Store';
import { UserProfile } from '../../components/UserProfile/UserProfile';
import { TeacherDashboard } from '../../components/Dashboard/TeacherDashboard';
import { StudentDashboard } from '../../components/Dashboard/StudentDashboard';

// ============================================================================
// 🏫 WRAPPERS PARA GESTIÓN DE AULAS
// ============================================================================

export const ClassroomManagementWrapper: React.FC = () => {
  const { createNavigationHandler } = useAppNavigation();
  
  return (
    <ClassroomManagement 
      onNavigate={createNavigationHandler('/classrooms')} 
    />
  );
};

export const CreateClassroomFormWrapper: React.FC = () => {
  const { createBackHandler, createSuccessHandler } = useAppNavigation();
  
  return (
    <CreateClassroomForm 
      onBack={createBackHandler('/classrooms')}
      onSuccess={createSuccessHandler('/classrooms')}
    />
  );
};

export const CreateActivityFormWrapper: React.FC = () => {
  const { createBackHandler, createSuccessHandler } = useAppNavigation();
  
  return (
    <CreateActivityForm 
      onBack={createBackHandler()}
      onSuccess={createSuccessHandler('/classrooms')}
    />
  );
};

// ============================================================================
// 🎒 WRAPPERS PARA ESTUDIANTES
// ============================================================================

export const StudentClassroomsWrapper: React.FC = () => {
  const { createNavigationHandler } = useAppNavigation();
  
  return (
    <StudentClassrooms 
      onNavigate={createNavigationHandler('/my-classrooms')} 
    />
  );
};

export const JoinClassroomWrapper: React.FC = () => {
  const { createBackHandler, createSuccessHandler } = useAppNavigation();
  
  return (
    <JoinClassroom 
      onBack={createBackHandler('/my-classrooms')}
      onSuccess={createSuccessHandler('/my-classrooms')}
    />
  );
};

// ============================================================================
// 🏆 WRAPPERS PARA GAMIFICACIÓN
// ============================================================================

export const AchievementsWrapper: React.FC = () => {
  const { createBackHandler } = useAppNavigation();
  
  return (
    <Achievements 
      onBack={createBackHandler('/dashboard')}
    />
  );
};

export const StoreWrapper: React.FC = () => {
  const { createBackHandler } = useAppNavigation();
  
  return (
    <Store 
      onBack={createBackHandler('/dashboard')}
    />
  );
};

// ============================================================================
// 👤 WRAPPERS PARA PERFIL
// ============================================================================

export const UserProfileWrapper: React.FC = () => {
  const { createBackHandler } = useAppNavigation();
  
  return (
    <UserProfile 
      onBack={createBackHandler('/dashboard')}
    />
  );
};

// ============================================================================
// 📊 WRAPPERS PARA DASHBOARDS
// ============================================================================

export const TeacherDashboardWrapper: React.FC = () => {
  const { createNavigationHandler } = useAppNavigation();
  
  return (
    <TeacherDashboard 
      onNavigate={createNavigationHandler('/dashboard')} 
    />
  );
};

export const StudentDashboardWrapper: React.FC = () => {
  const { createNavigationHandler } = useAppNavigation();
  
  return (
    <StudentDashboard 
      onNavigate={createNavigationHandler('/dashboard')} 
    />
  );
};
