import { useEffect } from "react";
import QRCode from "react-qr-code";

type QrModalProps = {
  isOpen: boolean;
  onClose: () => void;
  qrData: string;
  size?: number;
};

export function QrModal({ isOpen, onClose, qrData, size = 220 }: QrModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="rounded-2xl bg-white p-4 shadow-lg" onClick={(event) => event.stopPropagation()}>
        <QRCode value={qrData} size={size} />
      </div>
    </div>
  );
}
