import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(nav.standalone)
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  if (isStandalone()) {
    return null;
  }

  if (isIos()) {
    return (
      <div className="relative">
        <button
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
          onClick={() => setShowIosHelp((prev) => !prev)}
          aria-expanded={showIosHelp}
          aria-controls="ios-install-help"
        >
          Install on iPhone
        </button>
        {showIosHelp ? (
          <div
            id="ios-install-help"
            className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 shadow-soft"
          >
            <p className="font-semibold text-slate-100">Add to Home Screen</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-slate-300">
              <li>Tap the Share icon in Safari.</li>
              <li>Choose "Add to Home Screen".</li>
              <li>Confirm the name and tap Add.</li>
            </ol>
          </div>
        ) : null}
      </div>
    );
  }

  if (!deferredPrompt) {
    return null;
  }

  return (
    <button
      className="rounded-full bg-sky-400 px-3 py-1 text-xs font-semibold text-slate-950"
      onClick={async () => {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
      }}
    >
      Install App
    </button>
  );
}
