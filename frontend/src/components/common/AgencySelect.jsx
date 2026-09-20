import Select from "./Select";

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
  return (
    <Select
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      size={variant === "spacious" ? "md" : "sm"}
      helperText={helperText}
      placeholder={required ? "Select an agency" : "Unassigned"}
      options={agencies.map((a) => ({ value: a.id, label: a.name }))}
    />
  );
}
