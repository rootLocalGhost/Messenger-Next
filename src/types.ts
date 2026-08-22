export interface AppSettings {
  enableNativeNotifications: boolean;
  enableSound: boolean;
  enablePreviews: boolean;
  alertOnBadgeIncrease: boolean;
  startOnBoot: boolean;
  closeToTray: boolean;
  minimizeToTray: boolean;
  alwaysOnTop: boolean;
  zoomLevel: number;
  userAgent: string;
  theme: 'system' | 'dark' | 'light';
}

export interface InterceptedNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  timestamp: number;
}
