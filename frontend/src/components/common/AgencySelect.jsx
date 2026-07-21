export default function AgencySelect({
  id,
  label = "Agency",
  value,
  onChange,
  agencies,
  required = false,
  disabled = false,
  variant = "compact",
  helperText,
}) {
  const isSpacious = variant === "spacious";

  return (
    <div>
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

      {isSpacious && helperText && (
        <p className="text-xs text-slate-400 mb-2">{helperText}</p>
      )}

      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={
          isSpacious
            ? "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
            : "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
        }
      >
        <option value="" disabled={required}>
          {required ? "Select an agency" : "Unassigned"}
        </option>
        {agencies.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {!isSpacious && helperText && (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      )}
    </div>
  );
}
