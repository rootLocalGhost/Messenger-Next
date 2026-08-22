import { Component, For, Show } from 'solid-js';
import { InterceptedNotification } from '../types';
import './NotificationDrawer.css';

interface NotificationDrawerProps {
  isOpen: boolean;
  notifications: InterceptedNotification[];
  onClose: () => void;
  onClear: () => void;
  onSelectNotification: (notif: InterceptedNotification) => void;
}

export const NotificationDrawer: Component<NotificationDrawerProps> = (props) => {
  if (!props.isOpen) return null;

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div class="drawer-backdrop" onClick={props.onClose}>
      <aside class="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div class="drawer-header">
          <div class="drawer-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Recent Notifications</span>
            <span class="drawer-count">{props.notifications.length}</span>
          </div>
          <div class="drawer-actions">
            <Show when={props.notifications.length > 0}>
              <button class="drawer-btn-text" onClick={props.onClear} title="Clear all notifications">
                Clear all
              </button>
            </Show>
            <button class="drawer-btn-icon" onClick={props.onClose} title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div class="drawer-body">
          <Show
            when={props.notifications.length > 0}
            fallback={
              <div class="drawer-empty">
                <div class="empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <span class="empty-text">No recent notifications</span>
                <span class="empty-subtext">Incoming Messenger messages and toasts will appear here</span>
              </div>
            }
          >
            <div class="notification-list">
              <For each={props.notifications}>
                {(notif) => (
                  <div
                    class="notification-item"
                    onClick={() => props.onSelectNotification(notif)}
                  >
                    <div class="notif-avatar">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2C6.477 2 2 6.145 2 11.259c0 2.913 1.455 5.518 3.734 7.209v3.532l3.376-1.854c.913.253 1.884.391 2.89.391 5.523 0 10-4.145 10-9.278C22 6.145 17.523 2 12 2z"
                          fill="#0078FF"
                        />
                        <path
                          d="M6.5 13.5l3.5-3.7 2.4 2.4 4.1-4.2-3.5 3.7-2.4-2.4-4.1 4.2z"
                          fill="#ffffff"
                        />
                      </svg>
                    </div>
                    <div class="notif-content">
                      <div class="notif-top">
                        <span class="notif-title">{notif.title}</span>
                        <span class="notif-time">{formatTime(notif.timestamp)}</span>
                      </div>
                      <p class="notif-body">{notif.body || 'New message received'}</p>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </aside>
    </div>
  );
};
export default NotificationDrawer;
