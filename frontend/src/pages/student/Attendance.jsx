import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Building2,
  GraduationCap,
  LoaderCircle,
  AlertTriangle,
} from "lucide-react";
import TimeInOutButton from "../../components/attendance/TimeInOutButton";
import AttendanceMap from "../../components/attendance/AttendanceMap";
import DutyStatusBadge from "../../components/common/DutyStatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useWatchGeolocation } from "../../hooks/useWatchGeolocation";
import { getMyDTR } from "../../services/dtrApi";
import { getMyAgency } from "../../services/api";
import { isWithinGeofence } from "../../utils/geo";
import {
  computeDutyStatusFromDay,
  getManilaDayNumber,
} from "../../utils/dutyStatusFromDay";

const PH_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const PH_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function greetingFor(now) {
  const phHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false,
    }).format(now),
    10,
  );
  if (phHour < 12) return "Good morning";
  if (phHour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Student-facing attendance page. studentId comes from the
 * authenticated user's session (set at login). Navbar is provided
 * by the shared Layout component in App.jsx, not rendered here.
 *
 * Layout: a sticky, semi-fullscreen (50vh) live map sits at the top of
 * the viewport, showing the agency's geofence and the student's live
 * GPS dot. The rest of the page (today's status, Time In/Out, DTR
 * link) scrolls in a rounded sheet that slides up over the map as the
 * page scrolls — the map stays pinned via `position: sticky` rather
 * than a scroll-linked JS transform, so it stays smooth on mobile and
 * never fights with Leaflet's own tile rendering.
 */
export default function Attendance() {
  const { user } = useAuth();
  const now = useClock();
  const { position: userPosition, error: locationError } =
    useWatchGeolocation();

  const [dtr, setDtr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [agency, setAgency] = useState(null);
  const [agencyLoading, setAgencyLoading] = useState(true);
  const [agencyError, setAgencyError] = useState(null);

  const loadDTR = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getMyDTR();
      setDtr(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDTR();
  }, [loadDTR]);

  useEffect(() => {
    getMyAgency()
      .then(setAgency)
      .catch((err) => setAgencyError(err.message))
      .finally(() => setAgencyLoading(false));
  }, []);

  const todayDay = dtr?.days?.find((d) => d.day === getManilaDayNumber(now));
  const todayDuty = computeDutyStatusFromDay(todayDay);
  const isUnassigned =
    dtr?.student?.agency === "Unassigned" || Boolean(agencyError);
  const firstName = user.fullName?.split(" ")[0] || "there";

  // True until the student's very first recorded punch (this month —
  // the DTR endpoint is month-scoped, so this is a reasonable proxy for
  // "hasn't started yet" without a dedicated backend flag). Missed-punch
  // detection is time-of-day only (see getMissedPeriods) and can't tell
  // "genuinely missed" apart from "was just assigned and hasn't had
  // their first shift yet", so a newly-assigned student who hasn't
  // timed in even once shouldn't be told they missed a punch the
  // moment today's AM/PM window closes.
  const hasNeverPunched = !dtr?.days?.some(
    (d) => d.amIn || d.amOut || d.pmIn || d.pmOut || d.otIn || d.otOut,
  );

  // Reuses the same live position already being watched for the map, so
  // the button can warn/disable itself the moment we know the student is
  // out of range, instead of only finding out after a submit round trip.
  // `null` means "we don't have a definitive answer yet" (still locating,
  // or no agency), which intentionally does NOT block the button. The
  // fresh, authoritative check still happens server-side on submit.
  const geofence =
    agency && userPosition
      ? isWithinGeofence(
          userPosition.latitude,
          userPosition.longitude,
          agency.latitude,
          agency.longitude,
          agency.radiusMeters,
        )
      : null;

  const disabledReason = isUnassigned
    ? "You haven't been assigned to an agency yet. Contact your OJT coordinator before timing in."
    : geofence && !geofence.withinRadius
      ? `You're ${geofence.distanceMeters}m from ${agency?.name || "your agency"}. Move within ${agency?.radiusMeters}m to time in or out.`
      : null;

  return (
    <div className="bg-slate-50">
      {/* Sticky, semi-fullscreen live map hero */}
      <div className="sticky top-0 z-0 h-[50vh] min-h-[320px] max-h-[560px] w-full">
        <AttendanceMap
          agency={agency}
          userPosition={userPosition}
          agencyLoading={agencyLoading}
          agencyError={agencyError}
          locationError={locationError}
        />

        {/* Greeting/clock overlay, scrim for legibility over the tiles */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent">
          <div className="max-w-md mx-auto px-4 pt-4 text-white">
            <h1 className="text-lg font-bold drop-shadow-sm">
              {greetingFor(now)}, {firstName}
            </h1>
            <p className="text-xs text-white/80 mt-0.5">
              {PH_DATE_FORMATTER.format(now)} &middot;{" "}
              {PH_TIME_FORMATTER.format(now)}
            </p>
          </div>
        </div>
      </div>

      {/* Scrolling content sheet, overlapping the map's bottom edge */}
      <div className="relative z-10 -mt-6 rounded-t-3xl bg-slate-50 shadow-[0_-8px_24px_-6px_rgba(0,0,0,0.08)]">
        <div className="w-full max-w-md mx-auto px-4 pt-6 pb-10 space-y-4">
          {/* Drag handle affordance, purely visual */}
          <div className="flex justify-center">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>

          {/* Loading / error states for the context card */}
          {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-center gap-2 text-slate-500 text-sm">
              <LoaderCircle className="w-4 h-4 animate-spin" />
              Loading your attendance…
            </div>
          )}

          {!loading && loadError && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start gap-2 text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loadError}</span>
              </div>
            </div>
          )}

          {/* Context card: today's status, agency/course, this month's hours */}
          {!loading && !loadError && dtr && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Today
                </span>
                <DutyStatusBadge
                  status={todayDuty.status}
                  lastPunchLabel={todayDuty.lastPunchLabel}
                  lastPunchTime={todayDuty.lastPunchTime}
                  isToday
                  align="right"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-caap-navy/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-caap-navy" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-slate-400 text-xs">Agency</p>
                    <p
                      className={`font-medium truncate ${
                        isUnassigned ? "text-amber-600" : "text-slate-800"
                      }`}
                    >
                      {dtr.student.agency}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-caap-navy/10 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-caap-navy" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-slate-400 text-xs">Course</p>
                    <p className="font-medium text-slate-800 truncate">
                      {dtr.student.course || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-sm text-slate-500">
                  Hours logged this month
                </span>
                <span className="text-lg font-semibold text-caap-navy">
                  {dtr.grandTotal}
                  <span className="text-sm font-normal text-slate-400">
                    {" "}
                    hrs
                  </span>
                </span>
              </div>
            </div>
          )}

          <TimeInOutButton
            studentId={user.studentId}
            todayDay={todayDay}
            onPunchSuccess={loadDTR}
            disabledReason={disabledReason}
            liveGeofence={geofence}
            isUnassigned={isUnassigned}
            hasNeverPunched={hasNeverPunched}
            agencyName={agency?.name}
          />

          <Link
            to="/dtr"
            className="flex items-center justify-center gap-2 text-sm text-caap-blue hover:text-caap-navy py-2"
          >
            <FileText className="w-4 h-4" />
            View / Print My DTR
          </Link>
        </div>
      </div>
    </div>
  );
}
