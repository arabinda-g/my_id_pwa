import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker() {
  registerSW({
    immediate: true,
    onRegistered(swUrl) {
      if (import.meta.env.DEV) {
        console.info("Service worker registered:", swUrl);
      }
    },
    onRegisterError(error) {
      console.error("Service worker registration error:", error);
    }
  });
}
