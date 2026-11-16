import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";

export default function ConfirmResetDialog({ onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  // Start on the safe button so Enter does not reset by accident.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        aria-describedby="reset-desc"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <RotateCcw size={18} />
          </span>
          <div>
            <h3 id="reset-title" className="text-base font-semibold">Reset all preferences?</h3>
            <p id="reset-desc" className="mt-1 text-sm text-muted">
              Theme, date format and default period go back to their defaults. Your electricity bills are not affected.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-base transition hover:brightness-110">
            <RotateCcw size={16} /> Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}