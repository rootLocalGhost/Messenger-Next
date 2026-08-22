import { Component, createSignal, onMount } from 'solid-js';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './TitleBar.css';

interface TitleBarProps {
  currentPath: string;
  unreadCount: number;
  zoomLevel: number;
  onNavigate: (path: string) => void;
  onReload: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onZoomChange: (delta: number) => void;
  onZoomReset: () => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onTestNotification: () => void;
}

export const TitleBar: Component<TitleBarProps> = (props) => {
  const [isMaximized, setIsMaximized] = createSignal(false);
  const appWindow = getCurrentWindow();

  onMount(async () => {
    try {
      setIsMaximized(await appWindow.isMaximized());
      const unlisten = await appWindow.onResized(async () => {
        setIsMaximized(await appWindow.isMaximized());
      });
      return () => unlisten();
    } catch (e) {
      console.warn('Window state listener error:', e);
    }
  });

  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleToggleMaximize = async () => {
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  };

  const handleClose = async () => {
    await appWindow.close();
  };

  return (
    <header class="titlebar-container" data-tauri-drag-region>
      <div class="titlebar-drag-region" data-tauri-drag-region />

      {/* Left section: Logo & Nav History */}
      <div class="titlebar-left">
        <div class="logo-container" onClick={() => props.onNavigate('/')} title="Messenger Home">
          <div class="messenger-glyph">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.477 2 2 6.145 2 11.259c0 2.913 1.455 5.518 3.734 7.209v3.532l3.376-1.854c.913.253 1.884.391 2.89.391 5.523 0 10-4.145 10-9.278C22 6.145 17.523 2 12 2z"
                fill="url(#messenger-grad)"
              />
              <path
                d="M6.5 13.5l3.5-3.7 2.4 2.4 4.1-4.2-3.5 3.7-2.4-2.4-4.1 4.2z"
                fill="#ffffff"
              />
              <defs>
                <linearGradient id="messenger-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#00C6FF" />
                  <stop offset="0.5" stop-color="#0078FF" />
                  <stop offset="1" stop-color="#A033FF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="logo-text">Messenger</span>
        </div>

        <div class="history-nav">
          <button class="nav-btn" onClick={props.onGoBack} title="Back (Alt+Left)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button class="nav-btn" onClick={props.onGoForward} title="Forward (Alt+Right)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button class="nav-btn" onClick={props.onReload} title="Reload (Ctrl+R)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center: Quick navigation links */}
      <div class="titlebar-center">
        <button
          class={`quick-link-btn ${props.currentPath === '/' ? 'active' : ''}`}
          onClick={() => props.onNavigate('/')}
          title="Chats"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chats</span>
          {props.unreadCount > 0 && <span class="unread-pill">{props.unreadCount}</span>}
        </button>
      </div>

      {/* Right: Controls & Window management */}
      <div class="titlebar-right">
        {/* Zoom controls */}
        <div class="zoom-controls">
          <button class="zoom-btn" onClick={() => props.onZoomChange(-0.1)} title="Zoom Out (Ctrl+-)">
            -
          </button>
          <button class="zoom-level" onClick={props.onZoomReset} title="Reset Zoom (Ctrl+0)">
            {Math.round(props.zoomLevel * 100)}%
          </button>
          <button class="zoom-btn" onClick={() => props.onZoomChange(0.1)} title="Zoom In (Ctrl++)">
            +
          </button>
        </div>

        {/* Notifications Drawer Toggle */}
        <button
          class="action-btn"
          onClick={props.onOpenNotifications}
          title="Recent Notifications (Ctrl+N)"
        >
          <div class="icon-with-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {props.unreadCount > 0 && <span class="badge-dot" />}
          </div>
        </button>

        {/* Settings Modal Toggle */}
        <button
          class="action-btn"
          onClick={props.onOpenSettings}
          title="Messenger Settings (Ctrl+,)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Windows Standard Controls */}
        <div class="window-controls">
          <button class="win-btn win-min" onClick={handleMinimize} title="Minimize">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M0,5 L10,5" stroke="currentColor" stroke-width="1.2" />
            </svg>
          </button>
          <button class="win-btn win-max" onClick={handleToggleMaximize} title={isMaximized() ? "Restore" : "Maximize"}>
            {isMaximized() ? (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2,0 L8,0 L8,6 L2,6 Z M0,2 L0,10 L6,10 L6,8 L2,8 L2,2 Z" fill="none" stroke="currentColor" stroke-width="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1" />
              </svg>
            )}
          </button>
          <button class="win-btn win-close" onClick={handleClose} title="Close (Minimize to Tray)">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M0,0 L10,10 M10,0 L0,10" stroke="currentColor" stroke-width="1.2" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
export default TitleBar;
