import { to12Hour } from "../../utils/formatTime";

/**
 * Shows a student's attendance status for a given date, computed
 * server-side by utils/duty.js. The same underlying status
 * ('open_session' | 'completed' | 'half_day' | 'half_day_am' | 'partial'
 * | 'no_record') is labeled differently depending on whether the date
 * is today or in the past:
 *
 *   open_session + today      -> "On Duty" (green, currently there)
 *   open_session + past date  -> "Missing Time-Out" (red, likely an error)
 *   completed    + either     -> "Completed" (gray/neutral) — afternoon
 *                                 shift has both a time-in and time-out
 *   half_day     + either     -> "Half-Day" (blue) — PM done, AM skipped
 *   half_day_am  + either     -> "Half-Day" (blue) — AM done, PM
 *                                 window closed without a time-in
 *   partial      + today      -> "On Break" (amber, AM done, PM pending)
 *   partial      + past date  -> "Incomplete" (red, PM was never closed out)
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
  const alignClasses = align === "right" ? "items-end" : "items-start";

  return (
    <div className={`flex flex-col ${alignClasses}`}>
      <span
        className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium border ${config.classes}`}
      >
        {config.label}
      </span>
      {lastPunchLabel && (
        <p
          className={`text-[11px] text-text-secondary mt-1 ${align === "right" ? "text-right" : ""}`}
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
          label: "On Duty",
          classes: "bg-success-subtle text-success border-success-border",
        }
      : {
          label: "Missing Time-Out",
          classes: "bg-error-subtle text-error border-error-border",
        };
  }
  if (status === "completed") {
    return {
      label: "Completed",
      classes: "bg-bg-secondary text-text-secondary border-border",
    };
  }
  if (status === "half_day") {
    return {
      label: "Half-Day",
      classes: "bg-info-subtle text-info border-info-border",
    };
  }
  if (status === "half_day_am") {
    return {
      label: "Half-Day",
      classes: "bg-info-subtle text-info border-info-border",
    };
  }
  if (status === "partial") {
    return isToday
      ? {
          label: "On Break",
          classes: "bg-warning-subtle text-warning border-warning-border",
        }
      : {
          label: "Incomplete",
          classes: "bg-error-subtle text-error border-error-border",
        };
  }
  // no_record
  return isToday
    ? {
        label: "Not Yet Arrived",
        classes: "bg-warning-subtle text-warning border-warning-border",
      }
    : {
        label: "Absent",
        classes: "bg-error-subtle text-error border-error-border",
      };
}
