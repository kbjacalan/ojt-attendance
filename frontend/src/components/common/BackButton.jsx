import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function isPlainLeftClick(event) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export default function BackButton({
  fallbackTo,
  label = "Back",
  className = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHistory = location.key !== "default";

  function handleClick(event) {
    if (!hasHistory || event.defaultPrevented || !isPlainLeftClick(event)) {
      return;
    }
    event.preventDefault();
    navigate(-1);
  }

  return (
    <Link
      to={fallbackTo}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 ${className}`}
    >
      <ArrowLeft
        className="w-3 h-3 shrink-0 translate-y-px"
        aria-hidden="true"
      />
      <span className="leading-none">{label}</span>
    </Link>
  );
}
