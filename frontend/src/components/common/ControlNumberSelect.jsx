import Select from "./Select";

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
    <Select
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      size={variant === "spacious" ? "md" : "sm"}
      helperText={helperText}
      placeholder={required ? "Select a control number" : "Unassigned"}
      options={controlNumbers.map((cn) => ({
        value: cn.id,
        label: cn.control_number,
      }))}
    />
  );
}
