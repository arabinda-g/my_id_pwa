import { useEffect } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div className="relative w-full max-w-lg overflow-visible rounded-[28px] bg-gradient-to-br from-purple-600/30 via-transparent to-pink-400/30 p-[2px] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="relative overflow-visible rounded-[26px] bg-white/95 p-8 text-black shadow-[0_12px_40px_rgba(17,24,39,0.25)] ring-1 ring-black/5">
          <button
            className="absolute right-4 top-4 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-black/70"
            onClick={onClose}
          >
            Close
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
