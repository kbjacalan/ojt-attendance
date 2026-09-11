import { useEffect, useRef, useState } from "react";
import {
  LogIn,
  LogOut,
  LoaderCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useGeolocation } from "../../hooks/useGeolocation";
import { timeIn, timeOut } from "../../services/api";
import GeolocationStatus from "./GeolocationStatus";
import ConfirmModal from "../common/ConfirmModal";
import { hasCompleteSchedule } from "../../utils/dutyStatusFromDay";

const PERIOD_OPTIONS = [
  {
    value: "morning",
    label: "AM",
    name: "Morning",
    inKey: "amIn",
    outKey: "amOut",
    startKey: "amStart",
    endKey: "amEnd",
  },
  {
    value: "afternoon",
    label: "PM",
    name: "Afternoon",
    inKey: "pmIn",
    outKey: "pmOut",
    startKey: "pmStart",
    endKey: "pmEnd",
  },
];

const OT_OPTION = {
  value: "overtime",
  label: "OT",
  name: "Overtime",
  inKey: "otIn",
  outKey: "otOut",
  startKey: "otStart",
  endKey: "otEnd",
};

// Overtime only becomes a real "period" on days the student has an
// approved ot_requests window — Attendance.jsx only puts otStart/otEnd
// on the schedule object once that's true, so this doubles as the
// "is OT active today" check everywhere in this file.
function hasApprovedOvertimeToday(schedule) {
  return Boolean(schedule?.otStart && schedule?.otEnd);
}

function getPeriodOptions(schedule) {
  return hasApprovedOvertimeToday(schedule)
    ? [...PERIOD_OPTIONS, OT_OPTION]
    : PERIOD_OPTIONS;
}

function to12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}

function resolveSuggestion(todayDay, schedule) {
  const order = ["morning", "afternoon"];
  if (hasApprovedOvertimeToday(schedule)) order.push("overtime");

  const periodOptions = getPeriodOptions(schedule);

  for (const value of order) {
    const opt = periodOptions.find((o) => o.value === value);
    const inTime = todayDay?.[opt.inKey] || "";
    const outTime = todayDay?.[opt.outKey] || "";
    if (!inTime) return { period: value, action: "in" };
    if (!outTime) return { period: value, action: "out" };
  }

  return { period: order[order.length - 1], action: null };
}

function FirstTimeNotice({ agencyName }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 text-sm mb-3">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <span>
        You&apos;ve been assigned to {agencyName || "your agency"}. Your
        attendance tracking starts once you time in.
      </span>
    </div>
  );
}

function ScheduleIncompleteNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 mb-3">
      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium">Your official hours haven&apos;t been set.</p>
        <p className="mt-1 text-[13px] text-red-600/90">
          Please contact your agency in-charge or the OJT admin so they can
          complete your profile before you can time in or out.
        </p>
      </div>
    </div>
  );
}

function derivePeriodStatus(opt, todayDay) {
  const inTime = todayDay?.[opt.inKey] || "";
  const outTime = todayDay?.[opt.outKey] || "";

  if (inTime && outTime) return { state: "done", inTime, outTime };
  if (inTime && !outTime) return { state: "active", inTime, outTime };
  return { state: "pending", inTime, outTime };
}

const STATUS_STYLES = {
  done: {
    icon: CheckCircle2,
    className: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  active: {
    icon: Clock,
    className: "bg-blue-50 border-blue-200 text-blue-700",
  },
  pending: {
    icon: Circle,
    className: "bg-slate-50 border-slate-200 text-slate-400",
  },
};

function periodStatusLabel({ state, inTime, outTime }) {
  if (state === "done") return `${to12Hour(inTime)}–${to12Hour(outTime)}`;
  if (state === "active") return `Since ${to12Hour(inTime)}`;
  return "Not yet";
}

function TodayShiftsStrip({ todayDay, periodOptions }) {
  const hasThree = periodOptions.length === 3;
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {periodOptions.map((opt, i) => {
        const status = derivePeriodStatus(opt, todayDay);
        const { icon: Icon, className } = STATUS_STYLES[status.state];
        // AM/PM sit side by side; with a third period (OT) it spans
        // the full width below them, at every screen size.
        const isOverflowItem = hasThree && i === periodOptions.length - 1;
        return (
          <div
            key={opt.value}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${className} ${
              isOverflowItem ? "col-span-2" : ""
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide leading-none">
                {opt.name}
              </p>
              <p className="text-xs mt-0.5 truncate">
                {periodStatusLabel(status)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TimeInOutButton({
  studentId,
  todayDay,
  schedule,
  onPunchSuccess,
  disabledReason,
  liveGeofence,
  isUnassigned,
  hasNeverPunched,
  agencyName,
}) {
  const { status, error, getPosition } = useGeolocation();
  const [submitting, setSubmitting] = useState(null);
  const [result, setResult] = useState(null);
  const [pendingPunch, setPendingPunch] = useState(null);
  const resultRef = useRef(null);

  const scheduleComplete = isUnassigned || hasCompleteSchedule(schedule);
  const periodOptions = getPeriodOptions(schedule);
  const suggestion = resolveSuggestion(todayDay, schedule);
  const isLocked =
    submitting !== null || Boolean(disabledReason) || !scheduleComplete;

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [result]);

  async function handlePunch(type, period) {
    setSubmitting(type);
    setResult(null);

    try {
      const coords = await getPosition();
      const action = type === "in" ? timeIn : timeOut;
      const response = await action({
        studentId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        period,
      });

      setResult({ type: "success", message: response.message });
      onPunchSuccess?.();
    } catch (err) {
      setResult({ type: "error", message: err.message });
    } finally {
      setSubmitting(null);
    }
  }

  const opt = periodOptions.find((o) => o.value === suggestion.period);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      {pendingPunch && (
        <ConfirmModal
          title={
            pendingPunch === "in"
              ? `Time in for ${opt.name}?`
              : `Time out for ${opt.name}?`
          }
          message={
            pendingPunch === "in"
              ? "This will record your time in using your current location. Make sure you're within your agency premises."
              : "This will record your time out using your current location. Make sure you're within your agency premises."
          }
          confirmLabel={pendingPunch === "in" ? "Time In" : "Time Out"}
          danger={false}
          onConfirm={() => {
            setPendingPunch(null);
            handlePunch(pendingPunch, suggestion.period);
          }}
          onCancel={() => setPendingPunch(null)}
        />
      )}

      <h2 className="text-lg font-semibold text-slate-800 mb-1">Attendance</h2>
      <p className="text-sm text-slate-500 mb-4">
        You must be within your agency premises to time in or out.
      </p>

      <TodayShiftsStrip todayDay={todayDay} periodOptions={periodOptions} />

      {disabledReason && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{disabledReason}</span>
        </div>
      )}

      {!isUnassigned && !scheduleComplete && <ScheduleIncompleteNotice />}
      {!isUnassigned && scheduleComplete && hasNeverPunched && (
        <FirstTimeNotice agencyName={agencyName} />
      )}

      <SuggestedAction
        suggestion={suggestion}
        todayDay={todayDay}
        periodOptions={periodOptions}
        isLocked={isLocked}
        submitting={submitting}
        onPunch={(type) => setPendingPunch(type)}
      />

      <GeolocationStatus
        status={status}
        error={error}
        liveGeofence={liveGeofence}
        className="mt-4"
      />

      {result && (
        <div
          ref={resultRef}
          role={result.type === "error" ? "alert" : "status"}
          aria-live={result.type === "error" ? "assertive" : "polite"}
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            result.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}

function SuggestedAction({
  suggestion,
  todayDay,
  periodOptions,
  isLocked,
  submitting,
  onPunch,
}) {
  if (!suggestion.action) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 mb-1 text-sm font-medium">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        {periodOptions.length === 3
          ? "You've completed all your shifts for today, including overtime. Nice work!"
          : "You've completed both shifts for today. Nice work!"}
      </div>
    );
  }

  const opt = periodOptions.find((o) => o.value === suggestion.period);
  const inTime = todayDay?.[opt.inKey] || "";
  const isTimeIn = suggestion.action === "in";

  return (
    <>
      <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
        {opt.name} shift
      </p>
      {isTimeIn ? (
        <p className="text-[11px] text-slate-400 mb-3">
          You haven't timed in for the {opt.label} period yet.
        </p>
      ) : (
        <p className="text-[11px] text-slate-400 mb-3">
          Timed in at {to12Hour(inTime)}. Not yet timed out.
        </p>
      )}

      <button
        onClick={() => onPunch(suggestion.action)}
        disabled={isLocked}
        className={`w-full flex items-center justify-center gap-2 rounded-xl text-white font-medium py-3.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
          isTimeIn
            ? "bg-caap-navy hover:bg-caap-blue"
            : "bg-slate-800 hover:bg-slate-900"
        }`}
      >
        {submitting === suggestion.action ? (
          <LoaderCircle className="w-5 h-5 animate-spin" />
        ) : isTimeIn ? (
          <LogIn className="w-5 h-5" />
        ) : (
          <LogOut className="w-5 h-5" />
        )}
        {isTimeIn ? "Time In" : "Time Out"} ({opt.label})
      </button>
    </>
  );
}
