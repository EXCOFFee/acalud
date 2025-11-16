export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type NotificationPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface NotificationActionButton {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationActionButton[];
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface NotificationState {
  notifications: Notification[];
  position: NotificationPosition;
  maxNotifications: number;
}

export type NotificationReducerAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_POSITION'; payload: NotificationPosition }
  | { type: 'SET_MAX_NOTIFICATIONS'; payload: number };

export interface ShowNotificationOptions {
  title: string;
  message?: string;
  type?: NotificationType;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationActionButton[];
  metadata?: Record<string, unknown>;
}

export interface NotificationContextType {
  notifications: Notification[];
  position: NotificationPosition;
  showNotification: (options: ShowNotificationOptions) => string;
  showSuccess: (title: string, message?: string, options?: Partial<ShowNotificationOptions>) => string;
  showError: (title: string, message?: string, options?: Partial<ShowNotificationOptions>) => string;
  showWarning: (title: string, message?: string, options?: Partial<ShowNotificationOptions>) => string;
  showInfo: (title: string, message?: string, options?: Partial<ShowNotificationOptions>) => string;
  hideNotification: (id: string) => void;
  clearAll: () => void;
  setPosition: (position: NotificationPosition) => void;
  setMaxNotifications: (max: number) => void;
  handleError: (error: Error, customMessage?: string) => string;
}
