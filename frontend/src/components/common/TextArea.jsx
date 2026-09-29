/**
 * Shared multiline field. Same border/hover/focus/disabled tokens as
 * TextInput; auto height via rows (never fixed).
 */
export default function TextArea({ invalid = false, className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus disabled:border-border disabled:hover:border-border disabled:bg-bg-secondary disabled:text-text-secondary disabled:cursor-not-allowed ${
        invalid ? "border-error-border" : "border-border hover:border-border-hover"
      } ${className}`}
    />
  );
}
