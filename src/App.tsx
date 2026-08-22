import { Component, createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { enable as enableAutostart, disable as disableAutostart, isEnabled as isAutostartEnabled } from '@tauri-apps/plugin-autostart';
import { TitleBar } from './components/TitleBar';
import { SettingsModal } from './components/SettingsModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AppSettings, InterceptedNotification } from './types';
import './App.css';

const DEFAULT_SETTINGS: AppSettings = {
  enableNativeNotifications: true,
  enableSound: true,
  enablePreviews: true,
  alertOnBadgeIncrease: true,
  startOnBoot: false,
  closeToTray: true,
  minimizeToTray: false,
  alwaysOnTop: false,
  zoomLevel: 1.0,
  userAgent: 'desktop-chrome',
  theme: 'dark'
};

const App: Component = () => {
  // Application State
  const [currentPath, setCurrentPath] = createSignal('/');
  const [unreadCount, setUnreadCount] = createSignal(0);
  const [zoomLevel, setZoomLevel] = createSignal(1.0);
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = createSignal(false);
  const [notifications, setNotifications] = createSignal<InterceptedNotification[]>([]);

  const getInitialSettings = (): AppSettings => {
    try {
      const saved = localStorage.getItem('messenger_desktop_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  };

  // Load settings from storage
  const [settings, setSettings] = createSignal<AppSettings>(getInitialSettings());

  // Apply theme effect
  createEffect(() => {
    const theme = settings().theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  });

  // Save settings when changed
  const updateSettings = async (partial: Partial<AppSettings>) => {
    const next = { ...settings(), ...partial };
    setSettings(next);

    try {
      localStorage.setItem('messenger_desktop_settings', JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }

    if (partial.alwaysOnTop !== undefined) {
      invoke('set_always_on_top', { enabled: partial.alwaysOnTop }).catch(console.warn);
    }

    if (partial.closeToTray !== undefined) {
      invoke('set_close_to_tray', { enabled: partial.closeToTray }).catch(console.warn);
    }

    if (partial.enableNativeNotifications !== undefined) {
      invoke('set_notifications_enabled', { enabled: partial.enableNativeNotifications }).catch(console.warn);
    }

    if (partial.startOnBoot !== undefined) {
      try {
        if (partial.startOnBoot) {
          await enableAutostart();
        } else {
          await disableAutostart();
        }
      } catch (e) {
        console.warn('Autostart toggle error:', e);
      }
    }
  };

  onMount(async () => {
    const unlisteners: UnlistenFn[] = [];

    // Sync autostart status on startup
    try {
      const autostartState = await isAutostartEnabled();
      if (autostartState !== settings().startOnBoot) {
        setSettings(prev => ({ ...prev, startOnBoot: autostartState }));
      }
    } catch (e) {
      console.warn('Could not check autostart state:', e);
    }

    // Sync initial Rust settings
    invoke('set_close_to_tray', { enabled: settings().closeToTray }).catch(console.warn);
    invoke('set_notifications_enabled', { enabled: settings().enableNativeNotifications }).catch(console.warn);
    invoke('set_always_on_top', { enabled: settings().alwaysOnTop }).catch(console.warn);

    try {
      // 1. Listen for notification events from Rust / Injected script
      const unlistenNotif = await listen<any>('notification-received', (event) => {
        const payload = event.payload;
        console.log('[App] Notification received event:', payload);
        const newNotif: InterceptedNotification = {
          id: Math.random().toString(36).substring(2, 9),
          title: payload.title || 'Messenger',
          body: payload.body || '',
          icon: payload.icon,
          tag: payload.tag,
          url: payload.url || 'https://www.messenger.com',
          timestamp: Date.now()
        };
        setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      });
      unlisteners.push(unlistenNotif);

      // 2. Listen for unread badge count updates
      const unlistenUnread = await listen<number>('unread-count-updated', (event) => {
        setUnreadCount(event.payload);
      });
      unlisteners.push(unlistenUnread);

      // Initial unread count fetch
      const initialCount = await invoke<number>('get_unread_count').catch(() => 0);
      setUnreadCount(initialCount);
    } catch (e) {
      console.warn('Error setting up Tauri event listeners:', e);
    }

    // 3. Global Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleReload();
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomChange(0.1);
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomChange(-0.1);
        } else if (e.key === '0') {
          e.preventDefault();
          handleZoomReset();
        } else if (e.key === ',') {
          e.preventDefault();
          setIsSettingsOpen(true);
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          handleNavigate('/');
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          setIsNotificationsOpen(prev => !prev);
        }
      } else if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleGoBack();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleGoForward();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
      unlisteners.forEach(fn => fn());
    });
  });

  // Navigation handlers
  const handleNavigate = async (path: string) => {
    setCurrentPath(path);
    try {
      await invoke('navigate_messenger', { path });
    } catch (e) {
      console.warn('Navigation error:', e);
    }
  };

  const handleReload = async () => {
    try {
      await invoke('reload_messenger');
    } catch (e) {
      console.warn('Reload error:', e);
    }
  };

  const handleGoBack = async () => {
    try {
      await invoke('go_back_messenger');
    } catch (e) {
      console.warn('Go back error:', e);
    }
  };

  const handleGoForward = async () => {
    try {
      await invoke('go_forward_messenger');
    } catch (e) {
      console.warn('Go forward error:', e);
    }
  };

  const handleZoomChange = async (delta: number) => {
    const newZoom = Math.min(Math.max(Number((zoomLevel() + delta).toFixed(1)), 0.6), 2.0);
    setZoomLevel(newZoom);
    try {
      await invoke('set_messenger_zoom', { zoomFactor: newZoom });
    } catch (e) {
      console.warn('Zoom error:', e);
    }
  };

  const handleZoomReset = async () => {
    setZoomLevel(1.0);
    try {
      await invoke('set_messenger_zoom', { zoomFactor: 1.0 });
    } catch (e) {
      console.warn('Zoom reset error:', e);
    }
  };

  const handleTestNotification = async () => {
    try {
      await invoke('trigger_native_notification', {
        title: 'Messenger',
        body: 'New message from Alex: "Hey! Real-time notifications are working! 🚀"',
        icon: null,
        tag: 'test',
        url: 'https://www.messenger.com'
      });
    } catch (e) {
      console.warn('Test notification error:', e);
    }
  };

  const handleSelectNotification = (notif: InterceptedNotification) => {
    if (notif.url) {
      handleNavigate(notif.url);
    } else {
      handleNavigate('/');
    }
    setIsNotificationsOpen(false);
  };

  return (
    <div class="app-container">
      {/* Title Bar & Top Nav */}
      <TitleBar
        currentPath={currentPath()}
        unreadCount={unreadCount()}
        zoomLevel={zoomLevel()}
        onNavigate={handleNavigate}
        onReload={handleReload}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onZoomChange={handleZoomChange}
        onZoomReset={handleZoomReset}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(prev => !prev)}
        onTestNotification={handleTestNotification}
      />

      {/* Webview area under TitleBar (handled natively by Tauri child webview) */}
      <main class="webview-placeholder" id="webview-container" />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen()}
        settings={settings()}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={updateSettings}
        onClearData={() => {
          localStorage.clear();
          handleReload();
        }}
        onTestNotification={handleTestNotification}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen()}
        notifications={notifications()}
        onClose={() => setIsNotificationsOpen(false)}
        onClear={() => setNotifications([])}
        onSelectNotification={handleSelectNotification}
      />
    </div>
  );
};

export default App;
