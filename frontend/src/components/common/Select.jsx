import { ChevronDown } from "lucide-react";

const SIZE_STYLES = {
  sm: "py-1.5 pl-2.5 pr-7 text-xs sm:text-sm sm:pl-3 sm:pr-8",
  md: "py-2 pl-3 pr-9 text-sm",
};

const CHEVRON_SIZE = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
};

const FILTER_WRAPPER = "w-full sm:flex-1 sm:min-w-[140px] sm:max-w-[220px]";

export default function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  optionLabels,
  placeholder,
  required = false,
  disabled = false,
  variant = "field",
  size = "md",
  helperText,
  className = "",
  fullWidth = true,
}) {
  const isField = variant === "field";
  const isFilter = variant === "filter";
  const isSpacious = size === "md";
  const isActive = isFilter && value !== "all";

  const resolvedOptions = isFilter
    ? options.map((opt) => ({ value: opt, label: optionLabels?.[opt] ?? opt }))
    : options;

  const control = (
    <div className={`relative ${fullWidth ? "w-full" : "inline-block"}`}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`${fullWidth ? "w-full" : ""} appearance-none truncate rounded-lg border bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-caap-blue/30 focus:border-caap-blue disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 ${SIZE_STYLES[size]} ${
          isFilter
            ? isActive
              ? "border-caap-blue text-caap-navy bg-caap-blue/5 font-medium"
              : "border-slate-300 text-slate-600 hover:border-slate-400"
            : "border-slate-300 text-slate-700 hover:border-slate-400"
        }`}
      >
        {isFilter && <option value="all">{label}: All</option>}
        {!isFilter && placeholder !== undefined && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {resolvedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 sm:right-2.5 ${CHEVRON_SIZE[size]}`}
      />
    </div>
  );

  if (!isField) {
    const wrapperClass = isFilter
      ? `${FILTER_WRAPPER} ${className}`.trim()
      : className;
    return <div className={wrapperClass}>{control}</div>;
  }

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className={
            isSpacious
              ? "block text-sm font-medium text-slate-700 mb-1"
              : "block text-xs font-medium text-slate-600 mb-1"
          }
        >
          {label}
          {!required && isSpacious && (
            <span className="text-slate-400 font-normal"> (optional)</span>
          )}
        </label>
      )}

      {isSpacious && helperText && (
        <p className="text-xs text-slate-400 mb-2">{helperText}</p>
      )}

      {control}

      {!isSpacious && helperText && (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      )}
    </div>
  );
}
