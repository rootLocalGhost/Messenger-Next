// Messenger Webview Bridge & Native Notification Proxy
(function () {
  console.log("[Messenger Desktop] Initializing Native Webview Bridge...");

  // 1. Hook navigator.permissions.query to always report notification permission as granted
  if (navigator.permissions && navigator.permissions.query) {
    const origQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = function (param) {
      if (param && param.name === "notifications") {
        return Promise.resolve({
          state: "granted",
          name: "notifications",
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        });
      }
      return origQuery(param);
    };
  }

  // 2. Hook and Override Web Notifications
  const OriginalNotification = window.Notification;

  class TauriProxyNotification {
    static permission = "granted";
    static maxActions = 2;

    static async requestPermission(callback) {
      const perm = "granted";
      if (typeof callback === "function") {
        callback(perm);
      }
      return Promise.resolve(perm);
    }

    constructor(title, options = {}) {
      this.title = title;
      this.options = options;
      this.onclick = null;
      this.onclose = null;
      this.onerror = null;
      this.onshow = null;

      const body = options.body || "";
      const icon = options.icon || "";
      const tag = options.tag || "";

      console.log(`[Messenger Desktop] Intercepted Notification: "${title}" - "${body}"`);

      // Invoke Tauri Native Backend
      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        window.__TAURI_INTERNALS__.invoke("emit_native_notification", {
          title: String(title),
          body: String(body),
          icon: String(icon),
          tag: String(tag)
        }).catch(err => {
          console.error("[Messenger Desktop] Error emitting native notification:", err);
        });
      } else {
        console.warn("[Messenger Desktop] Tauri internals not ready for notification.");
      }

      if (typeof this.onshow === "function") {
        setTimeout(() => this.onshow(), 50);
      }
    }

    close() {
      if (typeof this.onclose === "function") {
        this.onclose();
      }
    }
  }

  // Assign Proxy to window
  try {
    Object.defineProperty(window, "Notification", {
      get: () => TauriProxyNotification,
      set: () => {},
      configurable: true
    });
  } catch (e) {
    window.Notification = TauriProxyNotification;
  }

  // 3. Hook ServiceWorker showNotification
  if (typeof ServiceWorkerRegistration !== "undefined" && ServiceWorkerRegistration.prototype) {
    const originalShowNotification = ServiceWorkerRegistration.prototype.showNotification;
    ServiceWorkerRegistration.prototype.showNotification = function (title, options = {}) {
      console.log(`[Messenger Desktop] SW Intercepted Notification: "${title}"`);
      const body = (options && options.body) || "";
      const icon = (options && options.icon) || "";
      const tag = (options && options.tag) || "";

      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        window.__TAURI_INTERNALS__.invoke("emit_native_notification", {
          title: String(title),
          body: String(body),
          icon: String(icon),
          tag: String(tag)
        }).catch(() => {});
      }

      if (typeof originalShowNotification === "function") {
        try {
          return originalShowNotification.call(this, title, options);
        } catch (e) {
          return Promise.resolve();
        }
      }
      return Promise.resolve();
    };
  }

  // 4. Track Unread Message Count from Title & DOM
  let lastUnreadCount = 0;

  function checkUnreadCount() {
    try {
      const title = document.title || "";
      // Match patterns like "(3) Messenger" or "(12) Chats"
      const match = title.match(/^\((\d+)\)/);
      let count = 0;
      if (match && match[1]) {
        count = parseInt(match[1], 10);
      } else {
        // Fallback: check DOM elements for unread badges
        const badges = document.querySelectorAll('[aria-label*="unread"], [role="gridcell"] [aria-label*="unread"]');
        if (badges.length > 0) {
          count = badges.length;
        }
      }

      if (count !== lastUnreadCount) {
        lastUnreadCount = count;
        console.log(`[Messenger Desktop] Unread count updated: ${count}`);
        if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
          window.__TAURI_INTERNALS__.invoke("update_unread_badge", { count }).catch(() => {});
        }
      }
    } catch (err) {
      // ignore DOM race conditions during initial load
    }
  }

  // Observe title changes
  const titleEl = document.querySelector("title");
  if (titleEl) {
    const observer = new MutationObserver(() => checkUnreadCount());
    observer.observe(titleEl, { subtree: true, characterData: true, childList: true });
  } else {
    setInterval(checkUnreadCount, 1500);
  }

  setInterval(checkUnreadCount, 2500);

  // 5. Intercept External Links to Open in Default System Browser
  document.addEventListener("click", function (e) {
    const target = e.target.closest("a");
    if (!target || !target.href) return;

    const href = target.href;
    try {
      const url = new URL(href);
      const isMessengerHost = url.hostname.includes("messenger.com") || 
                              url.hostname.includes("facebook.com") ||
                              url.hostname.includes("fbcdn.net");

      // If it's an external link or target="_blank", open externally
      if (!isMessengerHost || target.target === "_blank" || href.includes("l.facebook.com/l.php")) {
        e.preventDefault();
        e.stopPropagation();

        let targetUrl = href;
        // Parse facebook redirect if present
        if (href.includes("l.facebook.com/l.php") && url.searchParams.has("u")) {
          targetUrl = decodeURIComponent(url.searchParams.get("u"));
        }

        console.log(`[Messenger Desktop] Opening external link in default browser: ${targetUrl}`);
        if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
          window.__TAURI_INTERNALS__.invoke("open_external_url", { url: targetUrl }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[Messenger Desktop] Link parsing error:", err);
    }
  }, true);

  console.log("[Messenger Desktop] Webview Bridge initialized successfully.");
})();
