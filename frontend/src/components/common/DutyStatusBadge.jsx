import {
  CircleDot,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";

function to12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

/**
 * Shows a student's attendance status for a given date, computed
 * server-side by utils/duty.js. The same underlying status
 * ('open_session' | 'completed' | 'no_record') is labeled differently
 * depending on whether the date is today or in the past:
 *
 *   open_session + today      -> "On Duty" (green, currently there)
 *   open_session + past date  -> "Missing Time-Out" (red, likely an error)
 *   completed    + either     -> "Completed" (gray/neutral)
 *   no_record    + today      -> "Not Yet Arrived" (amber)
 *   no_record    + past date  -> "Absent" (red)
 */
export default function DutyStatusBadge({
  status,
  lastPunchLabel,
  lastPunchTime,
  isToday,
  align = "left",
}) {
  const config = getConfig(status, isToday);
  const Icon = config.icon;
  const alignClasses = align === "right" ? "items-end" : "items-start";

  return (
    <div className={`flex flex-col ${alignClasses}`}>
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border ${config.classes}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
      {lastPunchLabel && (
        <p
          className={`text-[11px] text-slate-400 mt-1 ${align === "right" ? "text-right" : ""}`}
        >
          {lastPunchLabel} at {to12Hour(lastPunchTime)}
        </p>
      )}
    </div>
  );
}

function getConfig(status, isToday) {
  if (status === "open_session") {
    return isToday
      ? {
          icon: CircleDot,
          label: "On Duty",
          classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
        }
      : {
          icon: AlertTriangle,
          label: "Missing Time-Out",
          classes: "bg-red-50 text-red-700 border-red-200",
        };
  }
  if (status === "completed") {
    return {
      icon: CheckCircle2,
      label: "Completed",
      classes: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }
  // no_record
  return isToday
    ? {
        icon: Clock,
        label: "Not Yet Arrived",
        classes: "bg-amber-50 text-amber-700 border-amber-200",
      }
    : {
        icon: XCircle,
        label: "Absent",
        classes: "bg-red-50 text-red-700 border-red-200",
      };
}
