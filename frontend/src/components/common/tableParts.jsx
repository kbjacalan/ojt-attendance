import { useEffect, useRef, useState } from "react";

export const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium";

export const BODY_CELL =
  "border-t border-border px-3 py-3.5 align-middle transition-colors group-hover:bg-bg-secondary/60 first:pl-5 last:pr-5";

const HEADER_CELL =
  "bg-bg-secondary px-3 py-3 text-[11px] font-semibold uppercase tracking-wider first:pl-5 last:pr-5";

export const TONES = {
  success:
    "border-success-border bg-success-subtle text-success enabled:hover:border-success",
  error:
    "border-error-border bg-error-subtle text-error enabled:hover:border-error",
  info: "border-info-border bg-info-subtle text-info enabled:hover:border-info",
  neutral:
    "border-border bg-bg-secondary text-text-secondary enabled:hover:border-border-hover enabled:hover:text-text-primary",
};

export function formatHours(value) {
  const hours = Number(value) || 0;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function Truncate({ text, className = "", title }) {
  const ref = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    function checkTruncation() {
      const el = ref.current;
      if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
    }
    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [text]);

  return (
    <span
      ref={ref}
      className={`block truncate ${className}`}
      title={isTruncated ? (title ?? text) : undefined}
    >
      {text}
    </span>
  );
}

export function QuickActions({ items, name, compact = false }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50";
  const size = compact ? "h-9 w-9" : "flex-1 px-3 py-2";

  return (
    <div className={compact ? "flex items-center gap-1" : "mt-3 flex gap-2"}>
      {items.map(({ key, label, icon: Icon, tone, run, disabled, title }) => (
        <button
          key={key}
          type="button"
          title={title ?? label}
          aria-label={`${label} ${name}`}
          disabled={disabled}
          onClick={run}
          className={`${base} ${size} ${tone}`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!compact && label}
        </button>
      ))}
    </div>
  );
}

export function ResponsiveTable({
  columns,
  caption,
  rows,
  cards,
  className = "",
}) {
  return (
    <div
      className={`border border-border bg-bg-primary shadow-card ${className}`}
    >
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left text-sm lg:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-text-secondary">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`${HEADER_CELL} ${column.width}`}
              >
                {column.srOnly ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>

      <ul aria-label={caption} className="divide-y divide-border lg:hidden">
        {cards}
      </ul>
    </div>
  );
}
