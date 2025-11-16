import { createContext } from 'react';
import { NotificationContextType } from './notification-types';

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
