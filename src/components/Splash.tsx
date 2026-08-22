import { Show } from "solid-js";

interface SplashProps {
  isLoading: boolean;
  statusText: string;
}

export default function Splash(props: SplashProps) {
  return (
    <div class={`splash-overlay ${!props.isLoading ? "hidden" : ""}`}>
      <div class="splash-logo-container">
        <div class="splash-glow"></div>
        <img src="/messenger.svg" alt="Messenger Logo" class="splash-logo" />
      </div>
      <div class="splash-title">Messenger</div>
      <Show when={props.isLoading}>
        <div class="splash-status">
          <div class="spinner"></div>
          <span>{props.statusText || "Connecting to Messenger..."}</span>
        </div>
      </Show>
    </div>
  );
}
