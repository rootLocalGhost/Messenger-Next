import { createSignal, onMount, Show } from "solid-js";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

interface TitleBarProps {
  unreadCount: number;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export default function TitleBar(props: TitleBarProps) {
  const [isMaximized, setIsMaximized] = createSignal(false);
  let appWindow: any = null;

  onMount(async () => {
    try {
      appWindow = getCurrentWebviewWindow();
      if (appWindow) {
        setIsMaximized(await appWindow.isMaximized());
        appWindow.onResized(async () => {
          setIsMaximized(await appWindow.isMaximized());
        });
      }
    } catch (e) {
      console.warn("Tauri window API not available in browser mode:", e);
    }
  });

  const handleMinimize = async () => {
    if (appWindow) await appWindow.minimize();
  };

  const handleMaximize = async () => {
    if (appWindow) {
      await appWindow.toggleMaximize();
      setIsMaximized(await appWindow.isMaximized());
    }
  };

  const handleClose = async () => {
    if (appWindow) {
      // By default, trigger close (which Rust backend intercepts if close-to-tray is enabled)
      await appWindow.close();
    }
  };

  return (
    <div class="titlebar" data-tauri-drag-region>
      <div class="titlebar-drag-region" data-tauri-drag-region>
        <div class="titlebar-brand" data-tauri-drag-region>
          <img src="/messenger.svg" alt="Messenger" class="titlebar-logo" />
          <span>Messenger</span>
          <Show when={props.unreadCount > 0}>
            <span class="titlebar-badge">{props.unreadCount}</span>
          </Show>
        </div>
      </div>

      <div class="titlebar-actions">
        <button 
          class="titlebar-btn" 
          title="Reload Messenger (Ctrl+R)"
          onClick={props.onRefresh}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </button>

        <button 
          class="titlebar-btn" 
          title="Settings"
          onClick={props.onOpenSettings}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        <button 
          class="titlebar-btn" 
          title="Minimize"
          onClick={handleMinimize}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <button 
          class="titlebar-btn" 
          title={isMaximized() ? "Restore" : "Maximize"}
          onClick={handleMaximize}
        >
          <Show when={!isMaximized()} fallback={
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="3" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2" rx="1"/>
              <path d="M1 4v6a1 1 0 0 0 1 1h6" fill="none" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          }>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.4" rx="1"/>
            </svg>
          </Show>
        </button>

        <button 
          class="titlebar-btn close-btn" 
          title="Close (Closes to Tray)"
          onClick={handleClose}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
