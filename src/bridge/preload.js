/**
 * Messenger Desktop Webview Preload Script (Production Grade)
 * 
 * Intercepts Web Notifications, ServiceWorker Notifications, Permissions API,
 * DOM Activity & Chats, and bridges them natively to Windows System Notifications.
 * Also handles external link routing to default system browser.
 */

(function () {
  console.log('[Messenger Desktop] Initializing Injected Native Bridge...');

  // Helper to safely invoke Tauri commands
  function invokeTauri(command, payload = {}) {
    try {
      if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
        return window.__TAURI_INTERNALS__.invoke(command, payload);
      } else if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
        return window.__TAURI__.core.invoke(command, payload);
      }
    } catch (err) {
      console.warn('[Messenger Desktop] Tauri IPC invoke error:', command, err);
    }
    return Promise.resolve();
  }

  // Helper to send native desktop notification
  function sendNativeNotification(title, body = '', icon = '', tag = '', url = '') {
    console.log('[Messenger Desktop] Triggering native notification:', { title, body, icon, tag, url });
    invokeTauri('trigger_native_notification', {
      title: String(title || 'Messenger'),
      body: body ? String(body) : null,
      icon: icon ? String(icon) : null,
      tag: tag ? String(tag) : null,
      url: url ? String(url) : window.location.href
    });
  }

  // -------------------------------------------------------------
  // 1. NAVIGATOR PERMISSIONS QUERY SPOOFING
  // -------------------------------------------------------------
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const origQuery = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = function (param) {
        if (param && (param.name === 'notifications' || param.name === 'push')) {
          return Promise.resolve({
            state: 'granted',
            name: param.name,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false
          });
        }
        return origQuery(param);
      };
    }
  } catch (err) {
    console.warn('[Messenger Desktop] Error spoofing navigator.permissions.query:', err);
  }

  // -------------------------------------------------------------
  // 2. WEB NOTIFICATION API INTERCEPTION & PERMISSION SPOOFING
  // -------------------------------------------------------------
  try {
    const OriginalNotification = window.Notification;

    function TauriMockNotification(title, options = {}) {
      const opt = options || {};
      const body = opt.body || '';
      const icon = opt.icon || '';
      const tag = opt.tag || '';
      const url = (opt.data && opt.data.url) ? opt.data.url : window.location.href;

      sendNativeNotification(title, body, icon, tag, url);

      const instance = {
        title: title,
        body: body,
        icon: icon,
        tag: tag,
        data: opt.data || null,
        onclick: null,
        onclose: null,
        onerror: null,
        onshow: null,
        close: function () {
          if (typeof this.onclose === 'function') this.onclose();
        },
        addEventListener: function (type, listener) {
          if (type === 'click' && typeof listener === 'function') {
            this.onclick = listener;
          }
        },
        removeEventListener: function () {},
        dispatchEvent: function () { return true; }
      };

      setTimeout(() => {
        if (typeof instance.onshow === 'function') instance.onshow();
      }, 50);

      return instance;
    }

    Object.defineProperty(TauriMockNotification, 'permission', {
      get: () => 'granted',
      set: () => {},
      configurable: true
    });

    TauriMockNotification.requestPermission = async function (callback) {
      if (typeof callback === 'function') {
        callback('granted');
      }
      return Promise.resolve('granted');
    };

    TauriMockNotification.maxActions = 2;

    try {
      Object.defineProperty(window, 'Notification', {
        get: () => TauriMockNotification,
        set: () => {},
        configurable: true
      });
    } catch (e) {
      window.Notification = TauriMockNotification;
    }
    console.log('[Messenger Desktop] window.Notification proxy installed.');
  } catch (err) {
    console.error('[Messenger Desktop] Error shimming Notification:', err);
  }

  // -------------------------------------------------------------
  // 3. SERVICE WORKER NOTIFICATION SHIM
  // -------------------------------------------------------------
  try {
    if (typeof ServiceWorkerRegistration !== 'undefined' && ServiceWorkerRegistration.prototype) {
      const originalShowNotification = ServiceWorkerRegistration.prototype.showNotification;
      ServiceWorkerRegistration.prototype.showNotification = function (title, options = {}) {
        const opt = options || {};
        const body = opt.body || '';
        const icon = opt.icon || '';
        const tag = opt.tag || '';
        const url = (opt.data && opt.data.url) ? opt.data.url : window.location.href;

        sendNativeNotification(title, body, icon, tag, url);

        if (typeof originalShowNotification === 'function') {
          try {
            return originalShowNotification.call(this, title, options);
          } catch (e) {
            return Promise.resolve();
          }
        }
        return Promise.resolve();
      };
    }
  } catch (err) {
    console.warn('[Messenger Desktop] Error shimming ServiceWorker showNotification:', err);
  }

  // -------------------------------------------------------------
  // 4. UNREAD COUNT & TITLE MUTATION OBSERVER
  // -------------------------------------------------------------
  let lastUnreadCount = 0;
  let lastTitle = document.title;

  function parseUnreadFromTitle(title) {
    // Matches patterns like "(1) Messenger", "(3) Chats", "(12) Messages"
    const match = (title || '').match(/^\((\d+)\)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return 0;
  }

  function handleTitleChange() {
    const currentTitle = document.title || '';
    if (currentTitle === lastTitle) return;
    lastTitle = currentTitle;

    const count = parseUnreadFromTitle(currentTitle);
    if (count !== lastUnreadCount) {
      console.log(`[Messenger Desktop] Unread count changed: ${lastUnreadCount} -> ${count}`);
      invokeTauri('update_unread_count', { count });

      // If count increased, trigger a notification if document is hidden or inactive
      if (count > lastUnreadCount && (document.hidden || !document.hasFocus())) {
        sendNativeNotification(
          'Messenger',
          `You have ${count} unread ${count === 1 ? 'message' : 'messages'}`,
          null,
          'unread-badge',
          'https://www.messenger.com'
        );
      }
      lastUnreadCount = count;
    }
  }

  const titleElem = document.querySelector('title');
  if (titleElem) {
    const titleObserver = new MutationObserver(handleTitleChange);
    titleObserver.observe(titleElem, { childList: true, characterData: true, subtree: true });
  }
  setInterval(handleTitleChange, 1500);

  // -------------------------------------------------------------
  // 5. DOM MUTATION OBSERVER FOR IN-APP MESSAGE TOASTS & BADGES
  // -------------------------------------------------------------
  const processedNotifications = new Set();

  function scanForInAppNotifications() {
    try {
      // 1. Check for unread message indicator badges in conversation list
      const badges = document.querySelectorAll(
        '[aria-label*="unread"], ' +
        '[aria-label*="Unread"], ' +
        '[role="gridcell"] [aria-label*="unread"], ' +
        'div[aria-label*="unread message"], ' +
        'span[data-testid*="badge"]'
      );
      if (badges.length > 0) {
        let count = 0;
        for (const badge of badges) {
          const text = badge.textContent || badge.getAttribute('aria-label') || '';
          const countMatch = text.match(/(\d+)/);
          if (countMatch) {
            count = Math.max(count, parseInt(countMatch[1], 10));
          } else {
            count++;
          }
        }
        if (count > 0 && count !== lastUnreadCount) {
          invokeTauri('update_unread_count', { count });
        }
      }

      // 2. Check for in-app Toast popups and incoming call alerts
      const toastContainers = document.querySelectorAll(
        'div[role="alert"], ' +
        'div[role="dialog"] div[tabindex="-1"], ' +
        'div[data-testid="toast"], ' +
        'div[class*="toast"]'
      );
      toastContainers.forEach(toast => {
        const text = (toast.textContent || '').trim();
        if (text && text.length > 3 && !processedNotifications.has(text)) {
          const isNotificationToast = text.includes('sent a message') ||
                                     text.includes('reacted to your') ||
                                     text.includes('is calling') ||
                                     text.includes('sent a photo') ||
                                     text.includes('sent a video') ||
                                     text.includes('sent an audio message') ||
                                     text.includes('sent an attachment');

          if (isNotificationToast) {
            processedNotifications.add(text);
            if (processedNotifications.size > 100) {
              const first = processedNotifications.values().next().value;
              processedNotifications.delete(first);
            }

            console.log('[Messenger Desktop] In-app toast detected:', text);
            sendNativeNotification('Messenger', text, null, 'msg-toast', 'https://www.messenger.com');
          }
        }
      });
    } catch (e) {
      // DOM scan safety catch
    }
  }

  const bodyObserver = new MutationObserver(() => {
    scanForInAppNotifications();
  });

  if (document.body) {
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // -------------------------------------------------------------
  // 6. EXTERNAL LINK INTERCEPTOR
  // -------------------------------------------------------------
  document.addEventListener('click', function (e) {
    const target = e.target.closest('a');
    if (!target || !target.href) return;

    const href = target.href;
    try {
      const url = new URL(href);
      const isInternalHost = url.hostname.includes('messenger.com') ||
                              url.hostname.includes('facebook.com') ||
                              url.hostname.includes('fbcdn.net');

      // If it's an external link or target="_blank" or facebook redirect (l.facebook.com)
      if (!isInternalHost || target.target === '_blank' || href.includes('l.facebook.com/l.php')) {
        e.preventDefault();
        e.stopPropagation();

        let targetUrl = href;
        if (href.includes('l.facebook.com/l.php') && url.searchParams.has('u')) {
          targetUrl = decodeURIComponent(url.searchParams.get('u'));
        }

        console.log('[Messenger Desktop] Routing external link to default browser:', targetUrl);
        invokeTauri('open_external_url', { url: targetUrl });
      }
    } catch (err) {
      console.warn('[Messenger Desktop] Link routing error:', err);
    }
  }, true);

  // -------------------------------------------------------------
  // 7. GLOBAL HELPER API FOR DESKTOP SHELL
  // -------------------------------------------------------------
  window.__MESSENGER_DESKTOP__ = {
    navigate: function (path) {
      if (!path) return;
      if (path.startsWith('http')) {
        window.location.href = path;
      } else {
        const target = path.startsWith('/') ? path : '/' + path;
        window.location.href = 'https://www.messenger.com' + target;
      }
    },
    reload: function () {
      window.location.reload();
    },
    goBack: function () {
      window.history.back();
    },
    goForward: function () {
      window.history.forward();
    },
    getUnreadCount: function () {
      return lastUnreadCount;
    },
    testNotification: function () {
      sendNativeNotification('Messenger', 'Test message: "Hey there! Real-time notifications are working! 🚀"', null, 'test', 'https://www.messenger.com');
    }
  };

  // -------------------------------------------------------------
  // 8. DESKTOP POLISHING CSS
  // -------------------------------------------------------------
  const style = document.createElement('style');
  style.id = 'messenger-desktop-custom-styles';
  style.textContent = `
    /* Sleek Desktop Scrollbars */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(150, 150, 150, 0.3);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(150, 150, 150, 0.5);
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  console.log('[Messenger Desktop] Injected Native Bridge initialized successfully.');
})();
