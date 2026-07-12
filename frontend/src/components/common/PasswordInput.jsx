import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A text input for passwords with a show/hide toggle. Typing a
 * password blind makes typos hard to catch, especially on mobile
 * keyboards, so letting the student reveal it briefly reduces failed
 * submits/lockouts from mistyped passwords.
 *
 * Accepts the same props as a plain <input> (value, onChange,
 * required, minLength, placeholder, autoComplete, id, etc.) and
 * forwards everything except `type`, which it manages itself.
 */
export default function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
