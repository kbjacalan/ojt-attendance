import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Hourglass,
  LoaderCircle,
  Timer,
  X,
  XCircle,
} from "lucide-react";
import { requestOvertime, cancelOvertimeRequest } from "../../services/otApi";
import { to12Hour } from "../../utils/officialHours";
import TextInput from "../common/TextInput";
import TextArea from "../common/TextArea";

const STATUS_CONFIG = {
  pending: {
    icon: Hourglass,
    title: "Waiting for approval",
    tile: "bg-warning-subtle text-warning ring-warning-border",
  },
  approved: {
    icon: CheckCircle2,
    title: "Overtime approved",
    tile: "bg-success-subtle text-success ring-success-border",
  },
  rejected: {
    icon: XCircle,
    title: "Overtime rejected",
    label: "Rejected",
    tile: "bg-error-subtle text-error ring-error-border",
    pill: "border-error-border bg-error-subtle text-error",
  },
};

function formatRange(start, end) {
  return `${to12Hour(start)} – ${to12Hour(end)}`;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function toMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function formatDuration(start, end) {
  const total = toMinutes(end) - toMinutes(start);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
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

function IconTile({ icon: Icon, className }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${className}`}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

function StatusCard({ request, cancelling, error, onCancel }) {
  const config = STATUS_CONFIG[request.status];
  const isApproved = request.status === "approved";
  const start = isApproved ? request.approved_start : request.requested_start;
  const end = isApproved ? request.approved_end : request.requested_end;
  const adjusted =
    isApproved &&
    (request.approved_start !== request.requested_start ||
      request.approved_end !== request.requested_end);

  return (
    <section
      aria-label="Overtime request status"
      className="rounded-2xl border border-border bg-bg-primary p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start gap-3">
        <IconTile icon={config.icon} className={config.tile} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary">
            {config.title}
          </h3>
          <p className="mt-1 text-base font-semibold tabular-nums text-text-primary">
            {formatRange(start, end)}
          </p>
          {adjusted && (
            <p className="mt-0.5 text-xs text-text-secondary">
              You requested{" "}
              {formatRange(request.requested_start, request.requested_end)}
            </p>
          )}
          {request.status === "pending" && (
            <p className="mt-1 text-xs text-text-secondary">
              Your in-charge has to approve this before you can time in for
              overtime.
            </p>
          )}
        </div>
      </div>

      {request.status === "rejected" && request.review_note && (
        <div className="mt-3 rounded-lg border border-border bg-bg-secondary px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Note from your in-charge
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {request.review_note}
          </p>
        </div>
      )}

      {request.status === "pending" && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelling ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {cancelling ? "Cancelling…" : "Cancel request"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
    </section>
  );
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
  const hasValidRange =
    requestedStart && requestedEnd && requestedEnd > requestedStart;
  const liveConflict = hasValidRange
    ? findOfficialHoursConflict(requestedStart, requestedEnd, segments)
    : null;

  function closeForm() {
    setShowForm(false);
    setError(null);
  }

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
    setError(null);
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
    return (
      <StatusCard
        request={todayRequest}
        cancelling={cancelling}
        error={error}
        onCancel={handleCancel}
      />
    );
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-bg-primary p-4 text-left shadow-card transition-colors hover:border-border-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 sm:p-5"
      >
        <IconTile
          icon={Timer}
          className="bg-brand/10 text-text-primary ring-border"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-primary">
            Request Overtime
          </span>
          <span className="block text-xs text-text-secondary">
            Ask your in-charge to approve extra hours for today.
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
      </button>
    );
  }

  return (
    <section
      aria-label="Request overtime"
      className="rounded-2xl border border-border bg-bg-primary shadow-card"
    >
      <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
        <IconTile
          icon={Timer}
          className="bg-brand/10 text-text-primary ring-border"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary">
            Request Overtime
          </h3>
          <p className="text-xs text-text-secondary">
            Pick your overtime window.
          </p>
        </div>
        <button
          type="button"
          onClick={closeForm}
          aria-label="Close overtime request form"
          className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5" noValidate>
        {segments.length > 0 && (
          <div id="ot-official-hours">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Your regular hours
            </p>
            <ul className="mt-2 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              {segments.map((segment) => {
                const conflicting = liveConflict?.key === segment.key;
                return (
                  <li
                    key={segment.key}
                    className={`rounded-lg border px-3 py-2 transition-colors ${
                      conflicting
                        ? "border-error-border bg-error-subtle text-error"
                        : "border-border bg-bg-secondary text-text-secondary"
                    }`}
                  >
                    <p className="text-[11px] font-medium">{segment.label}</p>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        conflicting ? "text-error" : "text-text-primary"
                      }`}
                    >
                      {formatRange(segment.start, segment.end)}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-text-secondary">
              Overtime has to fall outside these hours.
            </p>
          </div>
        )}

        <div>
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            <div>
              <label
                htmlFor="ot-start"
                className="mb-1 block text-xs font-medium text-text-secondary"
              >
                Start time
              </label>
              <TextInput
                id="ot-start"
                type="time"
                value={requestedStart}
                onChange={(e) => setRequestedStart(e.target.value)}
                required
                invalid={Boolean(liveConflict)}
                aria-describedby={
                  segments.length > 0 ? "ot-official-hours" : undefined
                }
              />
            </div>
            <div>
              <label
                htmlFor="ot-end"
                className="mb-1 block text-xs font-medium text-text-secondary"
              >
                End time
              </label>
              <TextInput
                id="ot-end"
                type="time"
                value={requestedEnd}
                onChange={(e) => setRequestedEnd(e.target.value)}
                required
                invalid={Boolean(liveConflict)}
                aria-describedby={
                  segments.length > 0 ? "ot-official-hours" : undefined
                }
              />
            </div>
          </div>

          <div aria-live="polite">
            {liveConflict && (
              <div className="mt-2 flex items-start gap-2 text-sm text-error">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{liveConflict.message}</span>
              </div>
            )}
            {hasValidRange && !liveConflict && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Total overtime:{" "}
                  <span className="font-semibold tabular-nums text-text-primary">
                    {formatDuration(requestedStart, requestedEnd)}
                  </span>
                </span>
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="ot-reason"
            className="mb-1 block text-xs font-medium text-text-secondary"
          >
            Reason <span className="font-normal">(optional)</span>
          </label>
          <TextArea
            id="ot-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Helping close out inventory with my supervisor."
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-error-border bg-error-subtle px-3 py-2 text-sm text-error"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeForm}
            disabled={submitting}
            className="rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || Boolean(liveConflict)}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send Request"
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
