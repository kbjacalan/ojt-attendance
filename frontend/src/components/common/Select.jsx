import { ChevronDown } from "lucide-react";

const SIZE_STYLES = {
  sm: "py-2 pl-2.5 pr-7 text-xs sm:text-sm sm:pl-3 sm:pr-8",
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
        className={`${fullWidth ? "w-full" : ""} appearance-none truncate rounded-lg border bg-bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus disabled:cursor-not-allowed disabled:border-border disabled:hover:border-border disabled:bg-bg-secondary disabled:text-text-secondary ${SIZE_STYLES[size]} ${
          isFilter
            ? isActive
              ? "border-focus text-text-primary bg-brand/5 font-medium"
              : "border-border text-text-secondary hover:border-border-hover"
            : "border-border text-text-primary hover:border-border-hover"
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
        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary sm:right-2.5 ${CHEVRON_SIZE[size]}`}
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
              ? "block text-sm font-medium text-text-primary mb-1"
              : "block text-xs font-medium text-text-secondary mb-1"
          }
        >
          {label}
          {!required && isSpacious && (
            <span className="text-text-secondary font-normal"> (optional)</span>
          )}
        </label>
      )}

      {isSpacious && helperText && (
        <p className="text-xs text-text-secondary mb-2">{helperText}</p>
      )}

      {control}

      {!isSpacious && helperText && (
        <p className="text-[11px] text-text-secondary mt-1">{helperText}</p>
      )}
    </div>
  );
}
