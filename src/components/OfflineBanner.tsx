import { useOnline } from "../hooks/useOnline";

export function OfflineBanner() {
  const online = useOnline();

  if (online) return null;

  return (
    <div className="border-b border-amber-700/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        <span>You are offline. Changes will sync when online.</span>
        <span aria-hidden="true">📡</span>
      </div>
    </div>
  );
}
