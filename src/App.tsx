import { useCallback, useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import FrontPage from "./screens/FrontPage";
import Home from "./screens/Home";
import NotFound from "./screens/NotFound";
import { getBoolean, setBoolean, storageKeys } from "./utils/storage";
import { getPasskeyStartupRequired, isPasskeyRegistered, verifyPasskey } from "./utils/passkey";
import { PasskeyPromptModal } from "./components/PasskeyPromptModal";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenGetStarted, setHasSeenGetStarted] = useState(false);
  const [isPasskeyRequired, setIsPasskeyRequired] = useState(false);
  const [isPasskeyVerified, setIsPasskeyVerified] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPasskeyPromptOpen, setIsPasskeyPromptOpen] = useState(false);
  const [passkeyPromptStatus, setPasskeyPromptStatus] = useState<"verifying" | "success">("verifying");
  const passkeyAbortRef = useRef<AbortController | null>(null);
  const authenticateWithPasskey = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    const controller = new AbortController();
    passkeyAbortRef.current?.abort();
    passkeyAbortRef.current = controller;
    setIsPasskeyPromptOpen(true);
    setPasskeyPromptStatus("verifying");
    const result = await verifyPasskey(controller.signal);
    // Clear the abort controller reference immediately after use
    passkeyAbortRef.current = null;
    if (result.ok) {
      setIsPasskeyVerified(true);
      setPasskeyPromptStatus("success");
      // Clear any previous auth error on success
      setAuthError(null);
      window.setTimeout(() => setIsPasskeyPromptOpen(false), 450);
    } else {
      setAuthError(result.error ?? "Passkey verification failed.");
      setIsPasskeyPromptOpen(false);
    }
    setIsAuthenticating(false);
  }, []);

  useEffect(() => {
    setHasSeenGetStarted(getBoolean(storageKeys.hasSeenGetStarted, false));
    setIsLoading(false);

    // Cleanup sensitive auth state on unmount
    return () => {
      setAuthError(null);
      setIsPasskeyVerified(false);
      setIsAuthenticating(false);
      setIsPasskeyPromptOpen(false);
      passkeyAbortRef.current?.abort();
      passkeyAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!hasSeenGetStarted) return;
    const requireOnStartup = getPasskeyStartupRequired();
    if (isPasskeyRegistered() && requireOnStartup) {
      setIsPasskeyRequired(true);
      setIsPasskeyVerified(false);
      void authenticateWithPasskey();
      return;
    }
    setIsPasskeyRequired(false);
    setIsPasskeyVerified(true);
  }, [authenticateWithPasskey, hasSeenGetStarted, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3EFEF]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-700 border-t-transparent" />
      </div>
    );
  }

  if (!hasSeenGetStarted) {
    return (
      <FrontPage
        onGetStarted={() => {
          setBoolean(storageKeys.hasSeenGetStarted, true);
          setHasSeenGetStarted(true);
        }}
      />
    );
  }

  if (isPasskeyRequired && !isPasskeyVerified) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-[#F3EFEF] px-6">
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-lg shadow-black/10">
            <h2 className="text-xl font-semibold text-black/90">Unlock with passkey</h2>
            <p className="mt-2 text-sm text-black/50">
              Confirm your identity to continue.
            </p>
            {authError ? (
              <p className="mt-3 text-xs text-rose-600">{authError}</p>
            ) : null}
            <button
              className="mt-5 w-full rounded-2xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => {
                void authenticateWithPasskey();
              }}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? "Waiting for passkey..." : "Unlock"}
            </button>
          </div>
        </div>
        <PasskeyPromptModal
          isOpen={isPasskeyPromptOpen}
          onCancel={() => {
            passkeyAbortRef.current?.abort();
            setIsPasskeyPromptOpen(false);
          }}
          status={passkeyPromptStatus}
          description="Complete the passkey prompt to unlock the app."
        />
      </>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
