import { buildOfficialHoursText, validateOfficialHours } from "../../utils/officialHours";

export default function OfficialHoursFields({
  value,
  onChange,
  disabled,
  variant = "compact",
  showValidation = false,
  description = "Regular time in/out — automatically shown in the Official Hours section of the DTR, and used to determine when this student can time in or out.",
}) {
  const preview = buildOfficialHoursText(value);
  const isSpacious = variant === "spacious";
  const validationError = showValidation ? validateOfficialHours(value) : null;

  function setField(field, v) {
    onChange({ ...value, [field]: v });
  }

  return (
    <div>
      <label
        className={
          isSpacious
            ? "block text-sm font-medium text-slate-700 mb-1"
            : "block text-xs font-medium text-slate-600 mb-1"
        }
      >
        Official Hours <span className="text-red-500">*</span>
      </label>
      <p
        className={
          isSpacious
            ? "text-xs text-slate-400 mb-2"
            : "text-[11px] text-slate-400 mb-2"
        }
      >
        {description}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <TimeField
          label="Morning Time In"
          value={value.amStart}
          onChange={(v) => setField("amStart", v)}
          disabled={disabled}
          required
        />
        <TimeField
          label="Morning Time Out"
          value={value.amEnd}
          onChange={(v) => setField("amEnd", v)}
          disabled={disabled}
          required
        />
        <TimeField
          label="Afternoon Time In"
          value={value.pmStart}
          onChange={(v) => setField("pmStart", v)}
          disabled={disabled}
          required
        />
        <TimeField
          label="Afternoon Time Out"
          value={value.pmEnd}
          onChange={(v) => setField("pmEnd", v)}
          disabled={disabled}
          required
        />
      </div>
      {preview && (
        <p className="text-xs text-slate-500 mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Preview: {preview}
        </p>
      )}
      {validationError && (
        <p className="text-xs text-red-600 mt-2">{validationError}</p>
      )}
    </div>
  );
}

function TimeField({ label, value, onChange, disabled, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}
