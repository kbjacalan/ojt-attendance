import { AlertTriangle } from "lucide-react";

/**
 * Generic confirmation modal for destructive actions (delete, etc.).
 * Replaces native confirm() so warnings can be styled and support
 * multi-paragraph explanations, not just a single alert string.
 *
 * Usage:
 *   <ConfirmModal
 *     title="Delete this agency?"
 *     message="This cannot be undone."
 *     confirmLabel="Delete"
 *     onConfirm={...}
 *     onCancel={...}
 *   />
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = true,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              danger ? "bg-red-50" : "bg-amber-50"
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${danger ? "text-red-600" : "text-amber-600"}`}
            />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">{title}</h2>
            {typeof message === "string" ? (
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">
                {message}
              </p>
            ) : (
              <div className="text-sm text-slate-600 mt-1">{message}</div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-caap-navy hover:bg-caap-blue"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
