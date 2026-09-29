import { buildOfficialHoursText, validateOfficialHours } from "../../utils/officialHours";
import TextInput from "./TextInput";

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
            ? "block text-sm font-medium text-text-primary mb-1"
            : "block text-xs font-medium text-text-secondary mb-1"
        }
      >
        Official Hours <span className="text-error">*</span>
      </label>
      <p
        className={
          isSpacious
            ? "text-xs text-text-secondary mb-2"
            : "text-[11px] text-text-secondary mb-2"
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
        <p className="text-xs text-text-secondary mt-2 bg-bg-secondary border border-border rounded-lg px-3 py-2">
          Preview: {preview}
        </p>
      )}
      {validationError && (
        <p className="text-xs text-error mt-2">{validationError}</p>
      )}
    </div>
  );
}

function TimeField({ label, value, onChange, disabled, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      <TextInput
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
