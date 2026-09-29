import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  Info,
  LoaderCircle,
  LogIn,
  LogOut,
  ShieldAlert,
  Timer,
  XCircle,
} from "lucide-react";
import { useGeolocation } from "../../hooks/useGeolocation";
import { timeIn, timeOut } from "../../services/api";
import GeolocationStatus from "./GeolocationStatus";
import ConfirmModal from "../common/ConfirmModal";
import { hasCompleteSchedule } from "../../utils/dutyStatusFromDay";
import { getManilaMinutesSinceMidnight } from "../../utils/manilaDate";
import { minutesFromHHMM } from "../../utils/officialHours";
import { to12Hour } from "../../utils/formatTime";

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

function hasApprovedOvertimeToday(schedule) {
  return Boolean(schedule?.otStart && schedule?.otEnd);
}

function getPeriodOptions(schedule) {
  return hasApprovedOvertimeToday(schedule)
    ? [...PERIOD_OPTIONS, OT_OPTION]
    : PERIOD_OPTIONS;
}

function periodHasEnded(opt, schedule) {
  const endTime = schedule?.[opt.endKey];
  if (!endTime) return false;
  return getManilaMinutesSinceMidnight() > minutesFromHHMM(endTime);
}

function resolveSuggestion(todayDay, schedule) {
  const order = ["morning", "afternoon"];
  if (hasApprovedOvertimeToday(schedule)) order.push("overtime");

  const periodOptions = getPeriodOptions(schedule);

  for (const value of order) {
    const opt = periodOptions.find((o) => o.value === value);
    const inTime = todayDay?.[opt.inKey] || "";
    const outTime = todayDay?.[opt.outKey] || "";
    if (!inTime && periodHasEnded(opt, schedule)) continue;
    if (!inTime) return { period: value, action: "in" };
    if (!outTime) return { period: value, action: "out" };
  }

  return { period: order[order.length - 1], action: null };
}

function resolveActionForPeriod(opt, todayDay) {
  const inTime = todayDay?.[opt.inKey] || "";
  const outTime = todayDay?.[opt.outKey] || "";
  if (!inTime) return "in";
  if (!outTime) return "out";
  return null;
}

function FirstTimeNotice({ agencyName }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-info-border bg-info-subtle px-3.5 py-3 text-sm text-info">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        You&apos;ve been assigned to {agencyName || "your agency"}. Your
        attendance tracking starts once you time in.
      </span>
    </div>
  );
}

function ScheduleIncompleteNotice() {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-error-border bg-error-subtle px-3.5 py-3 text-error">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-medium">
          Your official hours haven&apos;t been set.
        </p>
        <p className="mt-1 text-[13px] opacity-90">
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

const STATUS_META = {
  done: {
    icon: CheckCircle2,
    iconClassName: "text-success",
  },
  active: {
    icon: Clock,
    iconClassName: "text-info",
  },
  pending: {
    icon: Circle,
    iconClassName: "text-text-secondary",
  },
};

function TodayShiftsStrip({
  todayDay,
  periodOptions,
  selectedPeriod,
  onSelectPeriod,
}) {
  const tabRefs = useRef([]);

  function focusTab(index) {
    const opt = periodOptions[index];
    onSelectPeriod(opt.value);
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(e, index) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusTab((index + 1) % periodOptions.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusTab((index - 1 + periodOptions.length) % periodOptions.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTab(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusTab(periodOptions.length - 1);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Shift period"
      className="mb-4 flex items-stretch gap-2"
    >
      {periodOptions.map((opt, index) => {
        const status = derivePeriodStatus(opt, todayDay);
        const { icon: Icon, iconClassName } = STATUS_META[status.state];
        const isSelected = opt.value === selectedPeriod;
        return (
          <button
            type="button"
            key={opt.value}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            id={`shift-tab-${opt.value}`}
            aria-selected={isSelected}
            aria-controls={`shift-panel-${opt.value}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelectPeriod(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 ${
              isSelected
                ? "border-focus bg-brand/5 text-text-primary"
                : "border-border bg-bg-primary text-text-secondary hover:border-border-hover hover:text-text-primary"
            }`}
          >
            <span className="flex items-center justify-center gap-1 min-w-0 w-full">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${iconClassName}`} />
              <span className="text-sm font-semibold uppercase tracking-wide truncate">
                {opt.label}
              </span>
            </span>
          </button>
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
  const [manualPeriod, setManualPeriod] = useState(null);
  const resultRef = useRef(null);

  const scheduleComplete = isUnassigned || hasCompleteSchedule(schedule);
  const periodOptions = getPeriodOptions(schedule);
  const suggestion = resolveSuggestion(todayDay, schedule);
  const isLocked =
    submitting !== null || Boolean(disabledReason) || !scheduleComplete;

  const selectedPeriod =
    manualPeriod && periodOptions.some((o) => o.value === manualPeriod)
      ? manualPeriod
      : suggestion.period;
  const selectedOpt = periodOptions.find((o) => o.value === selectedPeriod);
  const selectedAction = resolveActionForPeriod(selectedOpt, todayDay);

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

  return (
    <div className="rounded-2xl border border-border bg-bg-primary p-4 shadow-card sm:p-5">
      {pendingPunch && (
        <ConfirmModal
          title={
            pendingPunch === "in"
              ? `Time in for ${selectedOpt.name}?`
              : `Time out for ${selectedOpt.name}?`
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
            handlePunch(pendingPunch, selectedOpt.value);
          }}
          onCancel={() => setPendingPunch(null)}
        />
      )}

      <div className="mb-4 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-text-primary ring-1 ring-border"
        >
          <Timer className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">
            Attendance
          </h2>
          <p className="text-xs text-text-secondary">
            Be within your agency premises to time in or out.
          </p>
        </div>
      </div>

      <TodayShiftsStrip
        todayDay={todayDay}
        periodOptions={periodOptions}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setManualPeriod}
      />

      {disabledReason && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-subtle px-3.5 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}

      {!isUnassigned && !scheduleComplete && <ScheduleIncompleteNotice />}
      {!isUnassigned && scheduleComplete && hasNeverPunched && (
        <FirstTimeNotice agencyName={agencyName} />
      )}

      <div
        role="tabpanel"
        id={`shift-panel-${selectedOpt.value}`}
        aria-labelledby={`shift-tab-${selectedOpt.value}`}
      >
        <SelectedPeriodAction
          selectedOpt={selectedOpt}
          action={selectedAction}
          todayDay={todayDay}
          schedule={schedule}
          isLocked={isLocked}
          submitting={submitting}
          onPunch={(type) => setPendingPunch(type)}
        />
      </div>

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
          className={`mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
            result.type === "success"
              ? "border-success-border bg-success-subtle text-success"
              : "border-error-border bg-error-subtle text-error"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}

function PunchTime({ label, time }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-bg-primary px-3 py-2">
      <p className="text-[11px] font-medium text-text-secondary">{label}</p>
      <p
        className={`text-sm font-semibold tabular-nums ${
          time ? "text-text-primary" : "text-text-secondary"
        }`}
      >
        {time ? to12Hour(time) : "Not yet"}
      </p>
    </div>
  );
}

function SelectedPeriodAction({
  selectedOpt,
  action,
  todayDay,
  schedule,
  isLocked,
  submitting,
  onPunch,
}) {
  const inTime = todayDay?.[selectedOpt.inKey] || "";
  const outTime = todayDay?.[selectedOpt.outKey] || "";
  const isDone = action === null;
  const isTimeIn = action === "in";
  const startTime = schedule?.[selectedOpt.startKey];
  const endTime = schedule?.[selectedOpt.endKey];

  const pillClass = isTimeIn
    ? "border-border bg-bg-primary text-text-secondary"
    : "border-success-border bg-success-subtle text-success";

  return (
    <>
      <div className="rounded-xl border border-border bg-bg-secondary p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              {selectedOpt.name} shift
            </p>
            {startTime && endTime && (
              <p className="text-sm font-semibold tabular-nums text-text-primary">
                {to12Hour(startTime)} – {to12Hour(endTime)}
              </p>
            )}
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${pillClass}`}
          >
            {isDone && <CheckCircle2 className="h-3 w-3" />}
            {!isDone && !isTimeIn && <CircleDot className="h-3 w-3" />}
            {isDone ? "Completed" : isTimeIn ? "Not timed in" : "On duty"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <PunchTime label="Time in" time={inTime} />
          <PunchTime label="Time out" time={outTime} />
        </div>
      </div>

      {!isDone && (
        <button
          type="button"
          onClick={() => onPunch(action)}
          disabled={isLocked}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 font-medium text-text-inverse shadow-card transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand motion-reduce:transition-none"
        >
          {submitting !== null && submitting === action ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : isTimeIn ? (
            <LogIn className="h-5 w-5" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          {`${isTimeIn ? "Time In" : "Time Out"} (${selectedOpt.label})`}
        </button>
      )}
    </>
  );
}
