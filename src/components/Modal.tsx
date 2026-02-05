import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  chromeless?: boolean;
};

export function Modal({ isOpen, onClose, children, chromeless = false }: ModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const closeTimerRef = useRef<number | null>(null);
  const previousOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setShouldRender(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    if (!shouldRender) return;
    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      closeTimerRef.current = null;
    }, 260);
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen, shouldRender]);

  // Memoize onClose reference to prevent effect re-runs
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const stableOnClose = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    if (!shouldRender) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stableOnClose();
    };
    // Only capture overflow when modal first opens
    if (previousOverflowRef.current === null) {
      previousOverflowRef.current = document.body.style.overflow;
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflowRef.current ?? "";
      previousOverflowRef.current = null;
      document.removeEventListener("keydown", handleKey);
    };
  }, [shouldRender, stableOnClose]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? "bg-black/70 opacity-100" : "bg-black/0 opacity-0"
      }`}
    >
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close dialog"
      />
      {chromeless ? (
        <div
          className={`relative w-full max-w-3xl overflow-visible transition-all duration-300 ${
            isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {children}
        </div>
      ) : (
        <div
          className={`relative w-full max-w-lg overflow-visible rounded-[28px] bg-gradient-to-br from-purple-600/30 via-transparent to-pink-400/30 p-[2px] shadow-[0_30px_80px_rgba(0,0,0,0.45)] transition-all duration-300 ${
            isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
          }`}
        >
          <div className="relative overflow-visible rounded-[26px] bg-white/95 p-8 text-black shadow-[0_12px_40px_rgba(17,24,39,0.25)] ring-1 ring-black/5">
            <button
              className="absolute right-4 top-4 rounded-full p-1 text-black/70 hover:text-black"
              onClick={onClose}
              aria-label="Close"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
            {children}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
