import EntitySelect from "./EntitySelect";

export default function ControlNumberSelect({
  id,
  label = "OJT Control Number",
  value,
  onChange,
  controlNumbers,
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
      items={controlNumbers}
      getOptionValue={(cn) => cn.id}
      getOptionLabel={(cn) => cn.control_number}
      required={required}
      disabled={disabled}
      variant={variant}
      placeholder={required ? "Select a control number" : "Unassigned"}
      helperText={helperText}
    />
  );
}
