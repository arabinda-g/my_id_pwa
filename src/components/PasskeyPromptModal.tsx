import { MdCheckCircle, MdFingerprint } from "react-icons/md";
import { Modal } from "./Modal";

type PasskeyPromptModalProps = {
  isOpen: boolean;
  onCancel: () => void;
  status?: "verifying" | "success";
  title?: string;
  description?: string;
};

export function PasskeyPromptModal({
  isOpen,
  onCancel,
  status = "verifying",
  title = "Verifying passkey",
  description = "Complete the passkey prompt to continue."
}: PasskeyPromptModalProps) {
  const isSuccess = status === "success";
  return (
    <Modal isOpen={isOpen} onClose={onCancel} chromeless>
      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-white/60 bg-white/95 px-6 py-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
        <div
          className={`absolute inset-0 ${
            isSuccess
              ? "bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-400/10"
              : "bg-gradient-to-br from-purple-600/10 via-transparent to-pink-500/10"
          }`}
        />
        <div className="relative flex flex-col items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${
              isSuccess ? "bg-emerald-500 shadow-emerald-500/30" : "bg-purple-600 shadow-purple-500/30"
            }`}
          >
            {isSuccess ? <MdCheckCircle className="text-2xl" /> : <MdFingerprint className="text-2xl" />}
          </div>
          <div>
            <p className="text-base font-semibold text-black/90">
              {isSuccess ? "Passkey verified" : title}
            </p>
            <p className="mt-1 text-sm text-black/60">
              {isSuccess ? "Access granted." : description}
            </p>
          </div>
          {isSuccess ? null : (
            <>
              <div className="flex w-full items-center justify-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-600 [animation-delay:-0.2s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-600 [animation-delay:-0.1s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-600" />
              </div>
              <button
                type="button"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/70 hover:bg-black/[0.02]"
                onClick={onCancel}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
