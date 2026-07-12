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
} from "lucide-react";
import { useGeolocation } from "../../hooks/useGeolocation";
import { timeIn, timeOut } from "../../services/api";
import GeolocationStatus from "./GeolocationStatus";
import {
  isPeriodWindowClosed,
  getMissedPeriods,
  getMinutesUntilPeriodClose,
} from "../../utils/dutyStatusFromDay";

const PERIOD_OPTIONS = [
  {
    value: "morning",
    label: "AM",
    name: "Morning",
    inKey: "amIn",
    outKey: "amOut",
  },
  {
    value: "afternoon",
    label: "PM",
    name: "Afternoon",
    inKey: "pmIn",
    outKey: "pmOut",
  },
];

// A window is "closing soon" once this many minutes remain — the
// point at which a proactive nudge is more useful than a surprise.
const CLOSING_SOON_THRESHOLD_MINUTES = 45;

function to12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}

/** Defaults to AM before noon, PM afterward, using Manila time. */
function suggestPeriod() {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10,
  );
  return hour < 12 ? "morning" : "afternoon";
}

/**
 * Figures out the one action a student most likely wants right now,
 * so the primary UI can be a single obvious button instead of asking
 * them to pick AM/PM and then Time In/Out every time.
 *
 * Checks the clock-appropriate period first (e.g. PM in the
 * afternoon); if that period's already fully punched, falls back to
 * the other one. A period whose window has already closed is skipped
 * here — it's no longer punchable, only missed, and is surfaced
 * separately via getMissedPeriods()/MissedPunchNotice instead.
 * Returns `{ period, action: null }` if there's nothing actionable
 * left (either everything's complete, or what remains is missed
 * rather than pending).
 */
function resolveSuggestion(todayDay) {
  const clockPeriod = suggestPeriod();
  const order =
    clockPeriod === "morning"
      ? ["morning", "afternoon"]
      : ["afternoon", "morning"];

  for (const value of order) {
    const opt = PERIOD_OPTIONS.find((o) => o.value === value);
    const inTime = todayDay?.[opt.inKey] || "";
    const outTime = todayDay?.[opt.outKey] || "";
    if (isPeriodWindowClosed(value)) continue;
    if (!inTime) return { period: value, action: "in" };
    if (!outTime) return { period: value, action: "out" };
  }

  return { period: clockPeriod, action: null };
}

/** Human copy for one missed-period entry, shown in MissedPunchNotice. */
function missedPeriodMessage({ period, type }) {
  const name = PERIOD_OPTIONS.find((o) => o.value === period).name;
  return type === "in"
    ? `${name} shift: no time-in was recorded before the window closed.`
    : `${name} shift: you timed in, but the time-out window closed before you punched out.`;
}

/**
 * Replaces the punch button for any period that's genuinely been
 * missed (window closed, self-service no longer possible). Rather
 * than let a student backfill an inaccurate timestamp, this tells
 * them plainly what was missed and who can fix it, so they know
 * exactly what to do next instead of hunting for a workaround.
 */
function MissedPunchNotice({ missedPeriods }) {
  if (missedPeriods.length === 0) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 mb-3">
      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium">
          {missedPeriods.length > 1
            ? "You missed a couple of punches today."
            : "You missed a punch today."}
        </p>
        <ul className="mt-1 space-y-0.5 text-red-600/90 text-[13px] list-disc list-inside">
          {missedPeriods.map((m) => (
            <li key={`${m.period}-${m.type}`}>{missedPeriodMessage(m)}</li>
          ))}
        </ul>
        <p className="mt-1.5 text-[13px] text-red-600/90">
          This can only be fixed by your agency in-charge or the OJT admin —
          please let them know so they can correct it for you.
        </p>
      </div>
    </div>
  );
}

/**
 * One period's state, for the at-a-glance strip above the punch
 * button. Lets a student see both AM and PM at once — the one useful
 * thing the old manual-period picker gave them — without exposing an
 * editable control that could be used to force a punch into the
 * wrong slot.
 */
function derivePeriodStatus(opt, todayDay, missedPeriods) {
  const inTime = todayDay?.[opt.inKey] || "";
  const outTime = todayDay?.[opt.outKey] || "";
  const missed = missedPeriods.find((m) => m.period === opt.value);

  if (missed) return { state: "missed", inTime, outTime };
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
  missed: {
    icon: ShieldAlert,
    className: "bg-red-50 border-red-200 text-red-700",
  },
  pending: {
    icon: Circle,
    className: "bg-slate-50 border-slate-200 text-slate-400",
  },
};

function periodStatusLabel({ state, inTime, outTime }) {
  if (state === "done") return `${to12Hour(inTime)}–${to12Hour(outTime)}`;
  if (state === "active") return `Since ${to12Hour(inTime)}`;
  if (state === "missed") return "Missed";
  return "Not yet";
}

/** Small two-up strip showing today's AM and PM state at a glance. */
function TodayShiftsStrip({ todayDay, missedPeriods }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {PERIOD_OPTIONS.map((opt) => {
        const status = derivePeriodStatus(opt, todayDay, missedPeriods);
        const { icon: Icon, className } = STATUS_STYLES[status.state];
        return (
          <div
            key={opt.value}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${className}`}
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

/**
 * Warns a student that the window for their upcoming action is about
 * to close, before it's too late to act — the proactive counterpart
 * to MissedPunchNotice. Only shown for an actionable suggestion
 * (never for a period that's already missed or done).
 */
function ClosingSoonWarning({ suggestion }) {
  if (!suggestion.action) return null;
  const minutesLeft = getMinutesUntilPeriodClose(suggestion.period);
  if (minutesLeft == null || minutesLeft > CLOSING_SOON_THRESHOLD_MINUTES) {
    return null;
  }

  const opt = PERIOD_OPTIONS.find((o) => o.value === suggestion.period);
  const verb = suggestion.action === "in" ? "time in" : "time out";

  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 text-sm mb-3">
      <Clock className="w-4 h-4 shrink-0 mt-0.5" />
      <span>
        The {opt.name} window closes in about {minutesLeft} minute
        {minutesLeft === 1 ? "" : "s"}. Don't forget to {verb}.
      </span>
    </div>
  );
}

/**
 * Lets a student time in/out for the shift period the app determines
 * they most likely need right now: a single primary button, no
 * period picker to think about.
 *
 * A period that's genuinely been missed (its window closed with no
 * time-in, or a time-in but no time-out) is never offered as a
 * tappable action — punching now would just backfill the current
 * moment into the wrong slot. Instead a MissedPunchNotice tells the
 * student what was missed and to contact their agency in-charge or
 * the OJT admin to have it corrected. The backend enforces this
 * independently (PERIOD_MISSED), so this is a proactive UX layer,
 * not the only safeguard.
 *
 * A TodayShiftsStrip shows both AM and PM at a glance, and a
 * ClosingSoonWarning nudges the student before a window closes,
 * rather than only telling them after it's too late.
 *
 * On press:
 *   1. Requests a fresh GPS fix from the browser (always a new
 *      request, never cached; see useGeolocation)
 *   2. Sends it + the period to the backend, which validates the
 *      geofence and writes the current timestamp into that period's
 *      column for today's date
 *   3. Shows a success or rejection message back to the student
 *
 * `studentId` comes from the authenticated user context, passed as a
 * prop to keep this component decoupled from auth setup.
 *
 * `todayDay` (optional): today's DTR day object ({ amIn, amOut, pmIn,
 * pmOut } as "HH:MM" strings), used to figure out the suggested
 * action and each period's status.
 *
 * `onPunchSuccess` (optional) fires after a successful time-in/out, so
 * a parent page can refresh anything derived from today's attendance.
 *
 * `disabledReason` (optional): if set, everything is disabled and this
 * message is shown instead (e.g. no agency assigned yet, or the
 * student's live position is known to be outside the geofence).
 *
 * `liveGeofence` (optional): the geofence reading from the map's
 * continuously-watched position ({ withinRadius, distanceMeters } |
 * null), passed through only so the status badge below can be seeded
 * with it — never used to gate the actual submit. The punch itself
 * always waits on a fresh, uncached GPS fix via useGeolocation.
 *
 * `isUnassigned` (optional): true if the student has no agency yet.
 * Missed-punch detection is purely time-of-day based (see
 * getMissedPeriods) and has no concept of "not assigned yet", so
 * without this flag an unassigned student would be told they missed
 * AM/PM punches for a schedule they were never given in the first
 * place. When true, missed-punch state is suppressed entirely.
 */
export default function TimeInOutButton({
  studentId,
  todayDay,
  onPunchSuccess,
  disabledReason,
  liveGeofence,
  isUnassigned,
}) {
  const { status, error, getPosition } = useGeolocation();
  const [submitting, setSubmitting] = useState(null); // 'in' | 'out' | null
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message: string }
  const resultRef = useRef(null);

  const suggestion = resolveSuggestion(todayDay);
  const missedPeriods = isUnassigned ? [] : getMissedPeriods(todayDay);
  const isLocked = submitting !== null || Boolean(disabledReason);

  // Scroll the result banner into view as soon as it appears. On a
  // phone the buttons are often near the bottom of the viewport, so
  // without this the most important feedback of the interaction can
  // render off-screen.
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Attendance</h2>
      <p className="text-sm text-slate-500 mb-4">
        You must be within your agency premises to time in or out.
      </p>

      <TodayShiftsStrip todayDay={todayDay} missedPeriods={missedPeriods} />

      {disabledReason && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{disabledReason}</span>
        </div>
      )}

      <MissedPunchNotice missedPeriods={missedPeriods} />
      <ClosingSoonWarning suggestion={suggestion} />

      <SuggestedAction
        suggestion={suggestion}
        todayDay={todayDay}
        missedPeriods={missedPeriods}
        isLocked={isLocked}
        submitting={submitting}
        onPunch={(type) => handlePunch(type, suggestion.period)}
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

/**
 * The single primary action: one button for the one thing the
 * student most likely needs right now. Falls back to a completion
 * message once both AM and PM are fully punched for the day — unless
 * something was missed, in which case MissedPunchNotice above already
 * covers it and this stays quiet rather than issuing a contradictory
 * "nice work!" next to a warning.
 */
function SuggestedAction({
  suggestion,
  todayDay,
  missedPeriods,
  isLocked,
  submitting,
  onPunch,
}) {
  if (!suggestion.action) {
    if (missedPeriods.length > 0) return null;

    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 mb-1 text-sm font-medium">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        You've completed both shifts for today. Nice work!
      </div>
    );
  }

  const opt = PERIOD_OPTIONS.find((o) => o.value === suggestion.period);
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
