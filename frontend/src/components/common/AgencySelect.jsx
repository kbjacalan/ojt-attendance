import EntitySelect from "./EntitySelect";

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
    <EntitySelect
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      items={agencies}
      getOptionValue={(a) => a.id}
      getOptionLabel={(a) => a.name}
      required={required}
      disabled={disabled}
      variant={variant}
      placeholder={required ? "Select an agency" : "Unassigned"}
      helperText={helperText}
    />
  );
}
