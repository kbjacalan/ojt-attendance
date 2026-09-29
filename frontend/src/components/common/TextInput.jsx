/**
 * Shared single-line text field. Single source for input padding,
 * border rest/hover/focus/disabled, and text tokens — replaces ~35
 * inline <input> class strings across auth, admin, OT, and map forms.
 * Padding-based sizing (py-2) so height flexes with font-size/zoom.
 * Focus/disabled border language mirrors Select.jsx.
 *
 * Forwards all native props (type, value, onChange, required,
 * autoComplete, min/max/step, aria-*, onKeyDown/onBlur, etc.).
 * `iconLeft` renders an absolutely-positioned icon and adds pl-9.
 * `invalid` swaps the border to the error token (pair with a message).
 */
export default function TextInput({
  size,
  iconLeft = null,
  invalid = false,
  className = "",
  ...props
}) {
  void size;
  return (
    <div className="relative">
      {iconLeft && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
          {iconLeft}
        </span>
      )}
      <input
        {...props}
        className={`w-full rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus disabled:border-border disabled:hover:border-border disabled:bg-bg-secondary disabled:text-text-secondary disabled:cursor-not-allowed ${
          iconLeft ? "pl-9 pr-3 py-2" : "px-3 py-2"
        } ${invalid ? "border-error-border" : "border-border hover:border-border-hover"} ${className}`}
      />
    </div>
  );
}
