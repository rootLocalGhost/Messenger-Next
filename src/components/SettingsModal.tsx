import { createSignal, onMount, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function SettingsModal(props: SettingsModalProps) {
  const [autostart, setAutostart] = createSignal(false);
  const [closeToTray, setCloseToTray] = createSignal(true);
  const [notificationsEnabled, setNotificationsEnabled] = createSignal(true);
  const [soundEnabled, setSoundEnabled] = createSignal(true);
  const [testStatus, setTestStatus] = createSignal("");

  onMount(async () => {
    try {
      // Load autostart status
      const auto = await isEnabled();
      setAutostart(auto);
    } catch (e) {
      console.warn("Autostart plugin status check skipped in dev:", e);
    }

    try {
      // Load close to tray preference from backend or localStorage
      const savedCloseToTray = localStorage.getItem("messenger_close_to_tray");
      if (savedCloseToTray !== null) {
        setCloseToTray(savedCloseToTray === "true");
      }
      const savedNotifs = localStorage.getItem("messenger_native_notifications");
      if (savedNotifs !== null) {
        setNotificationsEnabled(savedNotifs === "true");
      }
      const savedSound = localStorage.getItem("messenger_sound_enabled");
      if (savedSound !== null) {
        setSoundEnabled(savedSound === "true");
      }
    } catch (e) {
      console.error(e);
    }
  });

  const handleToggleAutostart = async (checked: boolean) => {
    setAutostart(checked);
    try {
      if (checked) {
        await enable();
      } else {
        await disable();
      }
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
    }
  };

  const handleToggleCloseToTray = async (checked: boolean) => {
    setCloseToTray(checked);
    localStorage.setItem("messenger_close_to_tray", String(checked));
    try {
      await invoke("set_close_to_tray", { enabled: checked });
    } catch (e) {
      console.warn("set_close_to_tray IPC error:", e);
    }
  };

  const handleToggleNotifications = (checked: boolean) => {
    setNotificationsEnabled(checked);
    localStorage.setItem("messenger_native_notifications", String(checked));
    try {
      invoke("set_notifications_enabled", { enabled: checked });
    } catch (e) {}
  };

  const handleToggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
    localStorage.setItem("messenger_sound_enabled", String(checked));
  };

  const handleTestNotification = async () => {
    setTestStatus("Sending notification...");
    try {
      await invoke("emit_native_notification", {
        title: "Messenger Notification Test",
        body: "👋 Test notification from Messenger Desktop! Notifications are working perfectly.",
        icon: "",
        tag: "test"
      });
      setTestStatus("✅ Notification sent!");
      setTimeout(() => setTestStatus(""), 3000);
    } catch (e) {
      console.error("Test notification failed:", e);
      setTestStatus("⚠️ Notification error: " + String(e));
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="modal-backdrop" onClick={props.onClose}>
        <div class="modal-content" onClick={(e) => e.stopPropagation()}>
          <div class="modal-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Preferences
            </h2>
            <button class="titlebar-btn" onClick={props.onClose}>
              ✕
            </button>
          </div>

          <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-title">Launch at Startup</span>
                <span class="setting-desc">Automatically start Messenger when your computer boots</span>
              </div>
              <label class="switch">
                <input 
                  type="checkbox" 
                  checked={autostart()} 
                  onChange={(e) => handleToggleAutostart(e.currentTarget.checked)} 
                />
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-title">Close to System Tray</span>
                <span class="setting-desc">Keep running in the background when window is closed</span>
              </div>
              <label class="switch">
                <input 
                  type="checkbox" 
                  checked={closeToTray()} 
                  onChange={(e) => handleToggleCloseToTray(e.currentTarget.checked)} 
                />
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-title">Native Desktop Notifications</span>
                <span class="setting-desc">Display OS-level banner and audio alerts for incoming messages</span>
              </div>
              <label class="switch">
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled()} 
                  onChange={(e) => handleToggleNotifications(e.currentTarget.checked)} 
                />
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-title">Notification Sound</span>
                <span class="setting-desc">Play a chime when new messages arrive</span>
              </div>
              <label class="switch">
                <input 
                  type="checkbox" 
                  checked={soundEnabled()} 
                  onChange={(e) => handleToggleSound(e.currentTarget.checked)} 
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", "margin-top": "4px" }}>
            <button class="btn-secondary" onClick={handleTestNotification}>
              🔔 Test Notification
            </button>
            <Show when={testStatus()}>
              <span style={{ "font-size": "12px", color: "var(--text-secondary)" }}>{testStatus()}</span>
            </Show>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" onClick={() => { props.onRefresh(); props.onClose(); }}>
              🔄 Reload App
            </button>
            <button class="btn-primary" onClick={props.onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
