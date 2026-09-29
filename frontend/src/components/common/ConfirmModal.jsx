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
    <div className="fixed inset-0 bg-overlay flex items-center justify-center px-4 z-50">
      <div className="bg-bg-primary rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              danger ? "bg-error-subtle" : "bg-warning-subtle"
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${danger ? "text-error" : "text-amber-600"}`}
            />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">{title}</h2>
            {typeof message === "string" ? (
              <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">
                {message}
              </p>
            ) : (
              <div className="text-sm text-text-secondary mt-1">{message}</div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary border border-border"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-text-inverse ${
              danger
                ? "bg-destructive hover:bg-destructive-hover disabled:hover:bg-destructive"
                : "bg-brand hover:bg-brand-hover disabled:hover:bg-brand"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
