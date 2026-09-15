import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bug } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const BUG_REPORT_URL = "https://m.me/khentbryanjacalan";
const AUTO_COLLAPSE_MS = 2600;
const VISIBLE_PATHS = ["/attendance", "/dtr"];

export default function ReportBugButton() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);
  const isVisiblePath = VISIBLE_PATHS.includes(pathname);

  useEffect(() => {
    if (!user || !isVisiblePath) return;

    const expandTimer = setTimeout(() => setExpanded(true), 0);
    const collapseTimer = setTimeout(
      () => setExpanded(false),
      AUTO_COLLAPSE_MS,
    );

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(collapseTimer);
    };
  }, [user, isVisiblePath]);

  if (!user || !isVisiblePath) return null;

  return (
    <button
      type="button"
      onClick={() =>
        window.open(BUG_REPORT_URL, "_blank", "noopener,noreferrer")
      }
      aria-label="Report a bug"
      className={`group fixed bottom-5 right-5 z-50 flex h-12 items-center overflow-hidden rounded-full bg-caap-blue text-white shadow-lg shadow-black/10 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-caap-navy hover:shadow-xl active:scale-95 ${
        expanded ? "max-w-50 px-4" : "max-w-12 px-3.5"
      }`}
    >
      <Bug className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />

      <div
        className={`flex items-center overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          expanded
            ? "max-w-37.5 opacity-100 ml-2.5 translate-x-0"
            : "max-w-0 opacity-0 ml-0 -translate-x-1"
        }`}
      >
        <span className="whitespace-nowrap text-sm font-medium tracking-wide">
          Report a bug
        </span>
      </div>
    </button>
  );
}
