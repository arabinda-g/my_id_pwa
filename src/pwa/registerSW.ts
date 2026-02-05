import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker() {
  registerSW({
    immediate: true,
    onRegistered() {
      // Service worker registered successfully
    },
    onRegisterError() {
      // Service worker registration failed - user will still have basic functionality
    }
  });
}
