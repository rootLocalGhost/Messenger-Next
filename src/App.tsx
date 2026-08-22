import { createSignal, onMount, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import TitleBar from "./components/TitleBar";
import SettingsModal from "./components/SettingsModal";
import Splash from "./components/Splash";

export default function App() {
  const [unreadCount, setUnreadCount] = createSignal(0);
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [statusText, setStatusText] = createSignal("Initializing Messenger Desktop...");

  let unlistenBadge: (() => void) | null = null;

  onMount(async () => {
    try {
      unlistenBadge = await listen<{ count: number }>("unread-count-changed", (event) => {
        setUnreadCount(event.payload.count || 0);
      });
    } catch (e) {
      console.warn("Event listener not ready in browser mode:", e);
    }

    // Hide splash after a brief initialization
    setTimeout(() => {
      setIsLoading(false);
    }, 1200);
  });

  onCleanup(() => {
    if (unlistenBadge) unlistenBadge();
  });

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div class="app-container">
      <TitleBar 
        unreadCount={unreadCount()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={handleRefresh}
      />

      <Splash 
        isLoading={isLoading()}
        statusText={statusText()}
      />

      <SettingsModal 
        isOpen={isSettingsOpen()}
        onClose={() => setIsSettingsOpen(false)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
