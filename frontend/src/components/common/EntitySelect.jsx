import Select from "./Select";

export default function EntitySelect({
  id,
  label,
  value,
  onChange,
  items = [],
  getOptionValue,
  getOptionLabel,
  required = false,
  disabled = false,
  variant = "compact",
  placeholder = "Select an option",
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
      placeholder={placeholder}
      options={items.map((item) => ({
        value: getOptionValue(item),
        label: getOptionLabel(item),
      }))}
    />
  );
}
