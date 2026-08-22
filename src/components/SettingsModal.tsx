import { Component } from 'solid-js';
import { AppSettings } from '../types';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearData: () => void;
  onTestNotification: () => void;
}

export const SettingsModal: Component<SettingsModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div class="modal-backdrop" onClick={props.onClose}>
      <div class="modal-card" onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Messenger Desktop Settings</span>
          </div>
          <button class="close-icon-btn" onClick={props.onClose} title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          {/* Notifications Section */}
          <div class="settings-section">
            <div class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span>Windows Notifications</span>
            </div>
            <div class="settings-group">
              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Native Toast Notifications</span>
                  <span class="setting-desc">Display Windows desktop notification banners for new messages</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    checked={props.settings.enableNativeNotifications}
                    onChange={(e) => props.onUpdateSettings({ enableNativeNotifications: e.currentTarget.checked })}
                  />
                  <span class="slider" />
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Play Notification Sound</span>
                  <span class="setting-desc">Play system notification chime on incoming messages</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    checked={props.settings.enableSound}
                    onChange={(e) => props.onUpdateSettings({ enableSound: e.currentTarget.checked })}
                  />
                  <span class="slider" />
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Message Previews</span>
                  <span class="setting-desc">Show sender name and message preview in notification banner</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    checked={props.settings.enablePreviews}
                    onChange={(e) => props.onUpdateSettings({ enablePreviews: e.currentTarget.checked })}
                  />
                  <span class="slider" />
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Alert on Unread Count Change</span>
                  <span class="setting-desc">Trigger notification when Messenger unread message counter increments</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    checked={props.settings.alertOnBadgeIncrease}
                    onChange={(e) => props.onUpdateSettings({ alertOnBadgeIncrease: e.currentTarget.checked })}
                  />
                  <span class="slider" />
                </label>
              </div>
            </div>
          </div>

          {/* Window & Tray Section */}
          <div class="settings-section">
            <div class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Window & Background Behavior</span>
            </div>
            <div class="settings-group">
              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Start on Windows Boot</span>
                  <span class="setting-desc">Automatically launch Messenger Desktop in tray on system startup</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    checked={props.settings.startOnBoot}
                    onChange={(e) => props.onUpdateSettings({ startOnBoot: e.currentTarget.checked })}
                  />
                  <span class="slider" />
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Close to System Tray</span>
                  <span class="setting-desc">Keep app running in background tray on close so notifications keep arriving</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    checked={props.settings.closeToTray}
                    onChange={(e) => props.onUpdateSettings({ closeToTray: e.currentTarget.checked })}
                  />
                  <span class="slider" />
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Minimize to System Tray</span>
                  <span class="setting-desc">Hide taskbar icon and stay in system tray when minimized</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    checked={props.settings.minimizeToTray}
                    onChange={(e) => props.onUpdateSettings({ minimizeToTray: e.currentTarget.checked })}
                  />
                  <span class="slider" />
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Always on Top</span>
                  <span class="setting-desc">Keep Messenger window floating above other applications</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    checked={props.settings.alwaysOnTop}
                    onChange={(e) => props.onUpdateSettings({ alwaysOnTop: e.currentTarget.checked })}
                  />
                  <span class="slider" />
                </label>
              </div>

              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Theme Mode</span>
                  <span class="setting-desc">Match desktop UI styling with system preference</span>
                </div>
                <select
                  class="select-control"
                  value={props.settings.theme}
                  onChange={(e) => props.onUpdateSettings({ theme: e.currentTarget.value as any })}
                >
                  <option value="system">System Default</option>
                  <option value="dark">Dark Theme</option>
                  <option value="light">Light Theme</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions & Diagnostics */}
          <div class="settings-section">
            <div class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Maintenance & Diagnostic</span>
            </div>
            <div class="settings-group">
              <div class="settings-row">
                <div class="settings-info">
                  <span class="setting-label">Diagnostic Test</span>
                  <span class="setting-desc">Send test Windows Toast notification to verify system integration</span>
                </div>
                <button class="btn-secondary" onClick={props.onTestNotification}>
                  Test Toast
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <span style={{ "font-size": "12px", color: "var(--text-secondary)" }}>
            Messenger Desktop v1.0.0 (Tauri v2 + Rust)
          </span>
          <button class="btn-primary" onClick={props.onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;
