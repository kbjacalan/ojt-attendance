import { useState } from "react";
import {
  Clock,
  LoaderCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { requestOvertime, cancelOvertimeRequest } from "../../services/otApi";
import { to12Hour } from "../../utils/officialHours";

function formatRange(start, end) {
  return `${to12Hour(start)} – ${to12Hour(end)}`;
}

const STATUS_STYLES = {
  pending: {
    icon: Clock,
    className: "bg-amber-50 border-amber-200 text-amber-700",
  },
  approved: {
    icon: CheckCircle2,
    className: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  rejected: {
    icon: XCircle,
    className: "bg-red-50 border-red-200 text-red-700",
  },
};

/**
 * Student-facing overtime card. Shows today's ot_requests row (if any)
 * and its status, or a small form to submit a new one. Overtime has no
 * fixed daily schedule, so a student must request a window and have
 * their in-charge approve it before TimeInOutButton will let them
 * punch OT — see attendanceService.requireApprovedOvertimeWindow.
 *
 * officialHours is the student's regular AM/PM schedule (HH:MM
 * strings). A requested OT window can't overlap either one — the
 * backend enforces this too (otRequestService.assertNoOverlapWithOfficialHours)
 * so this is just faster feedback, not the source of truth.
 */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function getShiftSegments(officialHours) {
  const { amStart, amEnd, pmStart, pmEnd } = officialHours || {};
  const segments = [];
  if (amStart && amEnd) {
    segments.push({
      key: "morning",
      label: "Morning",
      start: amStart.slice(0, 5),
      end: amEnd.slice(0, 5),
    });
  }
  if (pmStart && pmEnd) {
    segments.push({
      key: "afternoon",
      label: "Afternoon",
      start: pmStart.slice(0, 5),
      end: pmEnd.slice(0, 5),
    });
  }
  return segments;
}

function findOfficialHoursConflict(requestedStart, requestedEnd, segments) {
  const hit = segments.find((segment) =>
    rangesOverlap(requestedStart, requestedEnd, segment.start, segment.end),
  );
  if (!hit) return null;
  return {
    key: hit.key,
    message: `That overlaps your ${hit.key} hours.`,
  };
}

export default function OvertimeRequestPanel({
  todayRequest,
  onRequestChange,
  isUnassigned,
  officialHours,
}) {
  const [showForm, setShowForm] = useState(false);
  const [requestedStart, setRequestedStart] = useState("");
  const [requestedEnd, setRequestedEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  if (isUnassigned) return null;

  const segments = getShiftSegments(officialHours);
  const liveConflict =
    requestedStart && requestedEnd && requestedEnd > requestedStart
      ? findOfficialHoursConflict(requestedStart, requestedEnd, segments)
      : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!requestedStart || !requestedEnd) {
      setError("Please set both a start and end time.");
      return;
    }
    if (requestedEnd <= requestedStart) {
      setError("End time must be after the start time.");
      return;
    }
    const conflict = findOfficialHoursConflict(
      requestedStart,
      requestedEnd,
      segments,
    );
    if (conflict) {
      setError(conflict.message);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await requestOvertime(requestedStart, requestedEnd, reason);
      setShowForm(false);
      setRequestedStart("");
      setRequestedEnd("");
      setReason("");
      onRequestChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelOvertimeRequest(todayRequest.id);
      onRequestChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  if (todayRequest && todayRequest.status !== "cancelled") {
    const { icon: Icon, className } = STATUS_STYLES[todayRequest.status];
    return (
      <div className={`rounded-2xl border px-4 py-3.5 text-sm ${className}`}>
        <div className="flex items-start gap-2.5">
          <Icon className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {todayRequest.status === "pending" &&
                "Overtime request pending approval"}
              {todayRequest.status === "approved" && "Overtime approved"}
              {todayRequest.status === "rejected" &&
                "Overtime request rejected"}
            </p>
            <p className="mt-0.5 text-[13px] opacity-90">
              {todayRequest.status === "approved"
                ? `${to12Hour(todayRequest.approved_start)} – ${to12Hour(todayRequest.approved_end)}`
                : `${to12Hour(todayRequest.requested_start)} – ${to12Hour(todayRequest.requested_end)} requested`}
            </p>
            {todayRequest.status === "rejected" && todayRequest.review_note && (
              <p className="mt-1 text-[13px] opacity-90">
                {todayRequest.review_note}
              </p>
            )}
          </div>
          {todayRequest.status === "pending" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="shrink-0 text-xs font-medium underline hover:no-underline disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-slate-500 hover:border-caap-blue hover:text-caap-blue px-4 py-3 text-sm font-medium transition-colors"
      >
        <Clock className="w-4 h-4" />
        Request Overtime
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Request Overtime
        </h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {segments.length > 0 && (
        <div
          id="ot-official-hours"
          className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600"
        >
          <p className="font-semibold text-slate-800">Your regular hours</p>
          <dl className="mt-1.5 space-y-1">
            {segments.map((segment) => (
              <div
                key={segment.key}
                className={`-mx-1.5 flex items-center justify-between gap-3 rounded-md px-1.5 py-0.5 transition-colors ${
                  liveConflict?.key === segment.key
                    ? "bg-red-100 text-red-700"
                    : ""
                }`}
              >
                <dt>{segment.label}</dt>
                <dd className="font-medium tabular-nums">
                  {formatRange(segment.start, segment.end)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2">Overtime has to fall outside these hours.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Start
              </label>
              <input
                type="time"
                value={requestedStart}
                onChange={(e) => setRequestedStart(e.target.value)}
                required
                aria-describedby={
                  segments.length > 0 ? "ot-official-hours" : undefined
                }
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                End
              </label>
              <input
                type="time"
                value={requestedEnd}
                onChange={(e) => setRequestedEnd(e.target.value)}
                required
                aria-describedby={
                  segments.length > 0 ? "ot-official-hours" : undefined
                }
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
              />
            </div>
          </div>
          <div aria-live="polite">
            {liveConflict && (
              <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{liveConflict.message}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Helping close out inventory with my supervisor."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || Boolean(liveConflict)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-caap-navy hover:bg-caap-blue text-white font-medium py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          ) : (
            "Send Request"
          )}
        </button>
        <p className="text-xs text-slate-500 text-center">
          Your in-charge will review this before you can time in for overtime.
        </p>
      </form>
    </div>
  );
}
