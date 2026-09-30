import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  Building2,
  IdCard,
  LoaderCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import TimeInOutButton from "../../components/attendance/TimeInOutButton";
import OvertimeRequestPanel from "../../components/attendance/OvertimeRequestPanel";
import AttendanceMap from "../../components/attendance/AttendanceMap";
import DutyStatusBadge from "../../components/common/DutyStatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useWatchGeolocation } from "../../hooks/useWatchGeolocation";
import { getMyDTR } from "../../services/dtrApi";
import { getMyAgency } from "../../services/api";
import { getMyTodayOTRequest } from "../../services/otApi";
import { isWithinGeofence } from "../../utils/geo";
import {
  computeDutyStatusFromDay,
  getManilaDayNumber,
} from "../../utils/dutyStatusFromDay";
import { greetingFor } from "../../utils/greeting";

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

/** Student-facing attendance page. studentId comes from auth session. */
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

  const [otRequest, setOtRequest] = useState(null);

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

  const loadOtRequest = useCallback(async () => {
    try {
      const data = await getMyTodayOTRequest();
      setOtRequest(data);
    } catch (err) {
      console.error("Failed to load today's overtime request:", err);
    }
  }, []);

  useEffect(() => {
    loadDTR();
  }, [loadDTR]);

  useEffect(() => {
    loadOtRequest();
  }, [loadOtRequest]);

  useEffect(() => {
    getMyAgency()
      .then(setAgency)
      .catch((err) => setAgencyError(err.message))
      .finally(() => setAgencyLoading(false));
  }, []);

  const todayDay = dtr?.days?.find((d) => d.day === getManilaDayNumber(now));
  const todayDuty = computeDutyStatusFromDay(todayDay, {
    pmEnd: dtr?.student?.pmEnd,
  });
  const isUnassigned =
    dtr?.student?.agency === "Unassigned" || Boolean(agencyError);
  const firstName = user.fullName?.split(" ")[0] || "there";

  // True until the student's very first recorded punch (this month —
  // the DTR endpoint is month-scoped, so this is a reasonable proxy for
  // "hasn't started yet" without a dedicated backend flag). Used to show
  // a first-time welcome notice instead of the usual attendance summary.
  const hasNeverPunched = !dtr?.days?.some(
    (d) => d.amIn || d.amOut || d.pmIn || d.pmOut || d.otIn || d.otOut,
  );

  const requiredHours = dtr?.student?.requiredHours || 0;
  const hoursLogged = dtr?.cumulativeHours || 0;
  const hoursMet = requiredHours > 0 && hoursLogged >= requiredHours;
  const progressPercent =
    requiredHours > 0 ? Math.min(100, (hoursLogged / requiredHours) * 100) : 0;
  const hoursRemaining = Number(
    Math.max(0, requiredHours - hoursLogged).toFixed(2),
  );
  const percentLabel =
    progressPercent > 0 && progressPercent < 1
      ? "<1%"
      : `${Math.round(progressPercent)}%`;

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
    <div className="bg-bg-secondary">
      {/* Sticky, semi-fullscreen live map hero */}
      <div className="sticky top-0 z-0 h-[50vh] min-h-[320px] max-h-[560px] w-full">
        <AttendanceMap
          agency={agency}
          userPosition={userPosition}
          agencyLoading={agencyLoading}
          agencyError={agencyError}
          locationError={locationError}
          greetingLine={`${greetingFor(now)}, ${firstName}`}
          dateTimeLine={`${PH_DATE_FORMATTER.format(now)} \u00b7 ${PH_TIME_FORMATTER.format(now)}`}
        />
      </div>

      {/* Scrolling content sheet, overlapping the map's bottom edge by
          --attendance-sheet-overlap (see index.css — the map's
          floating controls key their clearance off the same variable) */}
      <div className="relative z-10 mt-[calc(var(--attendance-sheet-overlap)*-1)] rounded-t-3xl bg-bg-secondary shadow-[0_-8px_24px_-6px_rgba(0,0,0,0.08)]">
        <div className="w-full max-w-md mx-auto px-4 pt-6 pb-10 space-y-4">
          {/* Drag handle affordance, purely visual */}
          <div className="flex justify-center">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-bg-primary p-6 text-sm text-text-secondary shadow-card">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading your attendance…
            </div>
          )}

          {!loading && loadError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-error-border bg-error-subtle p-4 text-sm text-error"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {!loading && !loadError && dtr && (
            <section
              aria-label="Attendance summary"
              className="rounded-2xl border border-border bg-bg-primary p-4 shadow-card sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Today
                  </p>
                  <p className="text-sm font-semibold text-text-primary">
                    Your status
                  </p>
                </div>
                <DutyStatusBadge
                  status={todayDuty.status}
                  isToday
                  align="right"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-bg-secondary p-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-text-primary ring-1 ring-border"
                  >
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-text-secondary">
                      Agency
                    </p>
                    <p
                      className={`truncate text-sm font-semibold ${
                        isUnassigned ? "text-warning" : "text-text-primary"
                      }`}
                      title={dtr.student.agency}
                    >
                      {dtr.student.agency}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-bg-secondary p-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-text-primary ring-1 ring-border"
                  >
                    <IdCard className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-text-secondary">
                      OJT Control No.
                    </p>
                    <p
                      className="truncate font-mono text-sm font-semibold text-text-primary"
                      title={dtr.student.controlNumber || undefined}
                    >
                      {dtr.student.controlNumber || "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border bg-bg-secondary p-3.5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-text-primary ring-1 ring-border"
                  >
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-text-secondary">
                      Hours logged
                    </p>
                    <p className="leading-tight">
                      <span
                        className={`text-lg font-semibold tabular-nums ${
                          hoursMet ? "text-success" : "text-text-primary"
                        }`}
                      >
                        {hoursLogged}
                      </span>
                      <span className="text-sm tabular-nums text-text-secondary">
                        {requiredHours > 0 ? ` / ${requiredHours} hrs` : " hrs"}
                      </span>
                    </p>
                  </div>
                  {requiredHours > 0 && (
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                        hoursMet
                          ? "border-success-border bg-success-subtle text-success"
                          : "border-border bg-bg-primary text-text-primary"
                      }`}
                    >
                      {percentLabel}
                    </span>
                  )}
                </div>

                {requiredHours > 0 && (
                  <div className="mt-3">
                    <div
                      role="progressbar"
                      aria-label="Required hours progress"
                      aria-valuemin={0}
                      aria-valuemax={requiredHours}
                      aria-valuenow={Math.min(hoursLogged, requiredHours)}
                      className="h-2 w-full overflow-hidden rounded-full bg-border"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${
                          hoursMet ? "bg-success" : "bg-brand"
                        }`}
                        style={{
                          width: `${progressPercent}%`,
                          minWidth: progressPercent > 0 ? "0.5rem" : 0,
                        }}
                      />
                    </div>
                    <p
                      className={`mt-2 flex items-center gap-1 text-[11px] ${
                        hoursMet ? "text-success" : "text-text-secondary"
                      }`}
                    >
                      {hoursMet && <CheckCircle2 className="h-3 w-3" />}
                      {hoursMet
                        ? "Required hours met"
                        : `${hoursRemaining} hrs remaining`}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {!loading && (
            <TimeInOutButton
              studentId={user.studentId}
              todayDay={todayDay}
              schedule={{
                amStart: dtr?.student?.amStart,
                amEnd: dtr?.student?.amEnd,
                pmStart: dtr?.student?.pmStart,
                pmEnd: dtr?.student?.pmEnd,
                ...(otRequest?.status === "approved"
                  ? {
                      otStart: otRequest.approved_start.slice(0, 5),
                      otEnd: otRequest.approved_end.slice(0, 5),
                    }
                  : {}),
              }}
              onPunchSuccess={loadDTR}
              disabledReason={disabledReason}
              liveGeofence={geofence}
              isUnassigned={isUnassigned}
              hasNeverPunched={hasNeverPunched}
              agencyName={agency?.name}
            />
          )}

          {!loading && !isUnassigned && (
            <OvertimeRequestPanel
              todayRequest={otRequest}
              onRequestChange={loadOtRequest}
              isUnassigned={isUnassigned}
              officialHours={{
                amStart: dtr?.student?.amStart,
                amEnd: dtr?.student?.amEnd,
                pmStart: dtr?.student?.pmStart,
                pmEnd: dtr?.student?.pmEnd,
              }}
            />
          )}

          <Link
            to="/dtr"
            className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-bg-primary p-4 text-left shadow-card transition-colors hover:border-border-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 sm:p-5"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-text-primary ring-1 ring-border"
            >
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text-primary">
                View / Print My DTR
              </span>
              <span className="block truncate text-xs text-text-secondary">
                Review your daily time record and print it.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
          </Link>
        </div>
      </div>
    </div>
  );
}
