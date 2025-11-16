import { useContext } from 'react';
import { NotificationContext } from './NotificationContext';
import { NotificationContextType } from './notification-types';

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications debe ser usado dentro de un NotificationProvider');
  }

  return context;
}
