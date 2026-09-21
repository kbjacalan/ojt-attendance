import { useEffect, useState } from "react";
import BackButton from "../../components/common/BackButton";
import {
  LoaderCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  listPendingOTRequests,
  approveOTRequest,
  rejectOTRequest,
} from "../../services/inchargeApi";

function to12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.slice(0, 5).split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
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
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <BackButton
          fallbackTo="/incharge/records"
          label="Back to My Students"
          className="mb-4"
        />

        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-6 h-6 text-caap-blue shrink-0" />
          <h1 className="text-2xl font-bold text-slate-900">
            Overtime Requests
          </h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Review and approve overtime windows before your students can
          self-punch OT.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <LoaderCircle className="w-4 h-4 animate-spin" />
            Loading requests…
          </div>
        )}

        {!loading && requests.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            No pending overtime requests right now.
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-800 truncate">
            {request.student_name}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {request.agency_name} &middot; requested{" "}
            {formatDateTime(request.created_at)}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {to12Hour(request.requested_start)} – {to12Hour(request.requested_end)}
        </span>
      </div>

      {request.reason && (
        <p className="text-sm text-slate-600 mb-3 bg-slate-50 rounded-lg px-3 py-2">
          {request.reason}
        </p>
      )}

      {!showReject ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Approve start
            </label>
            <input
              type="time"
              value={approvedStart}
              onChange={(e) => setApprovedStart(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Approve end
            </label>
            <input
              type="time"
              value={approvedEnd}
              onChange={(e) => setApprovedEnd(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
            />
          </div>
          <button
            onClick={handleApprove}
            disabled={submitting !== null}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submitting === "approve" ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Approve
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={submitting !== null}
            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={2}
            placeholder="Reason for rejecting this request…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={submitting !== null}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {submitting === "reject" ? "Rejecting…" : "Confirm Reject"}
            </button>
            <button
              onClick={() => {
                setShowReject(false);
                setError(null);
              }}
              disabled={submitting !== null}
              className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 border border-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
