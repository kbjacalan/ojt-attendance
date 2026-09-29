import { useEffect, useState } from "react";
import BackButton from "../../components/common/BackButton";
import {
  LoaderCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  listPendingOTRequests,
  approveOTRequest,
  rejectOTRequest,
} from "../../services/inchargeApi";
import { to12Hour } from "../../utils/formatTime";
import { TONES } from "../../components/common/tableParts";
import TextArea from "../../components/common/TextArea";

function toMinutes(value) {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatDuration(start, end) {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (startMin === null || endMin === null || endMin <= startMin) return null;
  const total = endMin - startMin;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OTRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await listPendingOTRequests();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReviewed(requestId) {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  return (
    <div className="min-h-screen bg-bg-secondary px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <BackButton
          fallbackTo="/incharge/records"
          label="Back"
          className="mb-4"
        />

        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Overtime Requests
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Review today&apos;s requests. Approved students can time in and out
          for overtime anytime today.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-error-subtle border border-error-border text-error text-sm px-4 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="bg-bg-primary rounded-2xl border border-border p-8 flex items-center justify-center gap-2 text-text-secondary text-sm shadow-card">
            <LoaderCircle className="w-4 h-4 animate-spin" />
            Loading requests…
          </div>
        )}

        {!loading && requests.length === 0 && !error && (
          <div className="bg-bg-primary rounded-2xl border border-border p-8 text-center text-sm text-text-secondary shadow-card">
            <p>No pending overtime requests right now.</p>
            <p className="mt-1 text-xs">New requests will appear here.</p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onReviewed={handleReviewed}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request, onReviewed }) {
  const [approvedStart, setApprovedStart] = useState(
    request.requested_start.slice(0, 5),
  );
  const [approvedEnd, setApprovedEnd] = useState(
    request.requested_end.slice(0, 5),
  );
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [error, setError] = useState(null);

  const initial = (request.student_name?.trim()?.[0] || "?").toUpperCase();
  const duration = formatDuration(approvedStart, approvedEnd);
  const busy = submitting !== null;
  const startId = `approve-start-${request.id}`;
  const endId = `approve-end-${request.id}`;
  const actionBase =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4";

  async function handleApprove() {
    setSubmitting("approve");
    setError(null);
    try {
      await approveOTRequest(request.id, approvedStart, approvedEnd);
      onReviewed(request.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) {
      setError("Please explain why this request is being rejected.");
      return;
    }
    setSubmitting("reject");
    setError(null);
    try {
      await rejectOTRequest(request.id, rejectNote);
      onReviewed(request.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="bg-bg-primary rounded-2xl border border-border p-4 sm:p-5 shadow-card">
      <div className="flex items-start gap-3 mb-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-text-primary ring-1 ring-border"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary truncate">
            {request.student_name}
          </p>
          <p className="text-xs text-text-secondary truncate">
            {request.agency_name} &middot; requested{" "}
            {formatDateTime(request.created_at)}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-border bg-bg-secondary px-2 py-1 text-xs font-medium text-text-secondary tabular-nums">
          {to12Hour(request.requested_start)} –{" "}
          {to12Hour(request.requested_end)}
        </span>
      </div>

      {request.reason && (
        <p className="text-sm text-text-secondary mb-3 rounded-lg border border-border bg-bg-secondary px-3 py-2">
          {request.reason}
        </p>
      )}

      {!showReject ? (
        <>
          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Approve window
              </p>
              {duration && (
                <p className="text-[11px] font-medium tabular-nums text-text-secondary">
                  Total:{" "}
                  <span className="font-semibold text-text-primary">
                    {duration}
                  </span>
                </p>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={startId}
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  Start
                </label>
                <input
                  id={startId}
                  type="time"
                  value={approvedStart}
                  disabled={busy}
                  onChange={(e) => setApprovedStart(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <label
                  htmlFor={endId}
                  className="block text-xs font-medium text-text-secondary mb-1"
                >
                  End
                </label>
                <input
                  id={endId}
                  type="time"
                  value={approvedEnd}
                  disabled={busy}
                  onChange={(e) => setApprovedEnd(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={busy}
              className={`${actionBase} ${TONES.success}`}
            >
              {submitting === "approve" ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Approve
            </button>
            <button
              type="button"
              onClick={() => setShowReject(true)}
              disabled={busy}
              className={`${actionBase} ${TONES.error}`}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2 mt-3 border-t border-border pt-3">
          <TextArea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={2}
            placeholder="Reason for rejecting this request…"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={busy}
              className={`${actionBase} ${TONES.error}`}
            >
              {submitting === "reject" ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {submitting === "reject" ? "Rejecting…" : "Confirm Reject"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReject(false);
                setError(null);
              }}
              disabled={busy}
              className={`${actionBase} ${TONES.neutral}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-error-border bg-error-subtle px-3 py-2 text-sm text-error"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
