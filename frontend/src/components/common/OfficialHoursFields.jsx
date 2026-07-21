import { buildOfficialHoursText } from "../../utils/officialHours";

/**
 * Shared "Official Hours" input group — four time pickers (morning +
 * afternoon in/out) plus a live text preview of what will be saved.
 * Used by both the student signup form and the admin's Edit Student
 * form so the two stay in sync.
 *
 * `value` is an object with morningIn/morningOut/afternoonIn/afternoonOut
 * (24-hour "HH:MM" strings, blank if unset). `onChange` receives the
 * updated value object on every keystroke.
 */
export default function OfficialHoursFields({
  value,
  onChange,
  disabled,
  variant = "compact",
}) {
  const preview = buildOfficialHoursText(value);
  const isSpacious = variant === "spacious";

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
        Official Hours{" "}
        <span className="text-slate-400 font-normal">(optional)</span>
      </label>
      <p
        className={
          isSpacious
            ? "text-xs text-slate-400 mb-2"
            : "text-[11px] text-slate-400 mb-2"
        }
      >
        Regular time in/out — automatically shown in the Official Hours section
        of the DTR.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <TimeField
          label="Morning Time In"
          value={value.morningIn}
          onChange={(v) => setField("morningIn", v)}
          disabled={disabled}
        />
        <TimeField
          label="Morning Time Out"
          value={value.morningOut}
          onChange={(v) => setField("morningOut", v)}
          disabled={disabled}
        />
        <TimeField
          label="Afternoon Time In"
          value={value.afternoonIn}
          onChange={(v) => setField("afternoonIn", v)}
          disabled={disabled}
        />
        <TimeField
          label="Afternoon Time Out"
          value={value.afternoonOut}
          onChange={(v) => setField("afternoonOut", v)}
          disabled={disabled}
        />
      </div>
      {preview && (
        <p className="text-xs text-slate-500 mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Preview: {preview}
        </p>
      )}
    </div>
  );
}

function TimeField({ label, value, onChange, disabled }) {
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
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}
