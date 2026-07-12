import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Printer,
  Pencil,
  XCircle,
  MessageSquare,
} from "lucide-react";
import {
  getStudentDTR,
  certifyDTR,
  uncertifyDTR,
  correctAttendance,
} from "../../services/inchargeApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import ResponsiveDocument from "../../components/document/ResponsiveDocument";
import caapLogo from "../../assets/caap_logo.png";

function to12HourNoSuffix(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}`;
}

function to12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function StudentDTRReview() {
  const { studentId } = useParams();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [dtr, setDtr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certifying, setCertifying] = useState(false);
  const [editingDay, setEditingDay] = useState(null); // the row object being corrected, or null
  const [viewingRemarks, setViewingRemarks] = useState(null); // the row object whose remarks are being viewed
  const [showCertifyConfirm, setShowCertifyConfirm] = useState(false);
  const [showUncertifyConfirm, setShowUncertifyConfirm] = useState(false);

  useEffect(() => {
    loadDTR(month);
  }, [month, studentId]);

  async function loadDTR(m) {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentDTR(studentId, m);
      setDtr(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function shiftMonth(delta) {
    const [year, mo] = month.split("-").map(Number);
    const newDate = new Date(year, mo - 1 + delta, 1);
    setMonth(
      `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  async function handleCertify() {
    setShowCertifyConfirm(false);
    setCertifying(true);
    try {
      await certifyDTR(studentId, month);
      await loadDTR(month);
    } catch (err) {
      alert(err.message);
    } finally {
      setCertifying(false);
    }
  }

  async function handleUncertify() {
    setShowUncertifyConfirm(false);
    try {
      await uncertifyDTR(studentId, month);
      await loadDTR(month);
    } catch (err) {
      alert(err.message);
    }
  }

  const isCertified = dtr?.certification?.status === "certified";

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:p-0">
      <div className="max-w-3xl mx-auto mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          to="/incharge/records"
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← Back to Students
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded hover:bg-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[90px] sm:min-w-[110px] text-center">
              {dtr?.student?.month || month}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded hover:bg-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:ml-3">
            <button
              onClick={() => window.print()}
              disabled={!dtr}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-caap-navy text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Print
            </button>

            {isCertified ? (
              <button
                onClick={() => setShowUncertifyConfirm(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                <XCircle className="w-4 h-4" /> Uncertify
              </button>
            ) : (
              <button
                onClick={() => setShowCertifyConfirm(true)}
                disabled={!dtr || certifying}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-caap-gold text-caap-navy px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {certifying ? "Certifying…" : "Certify"}
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-slate-400">
          <LoaderCircle className="w-6 h-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {!loading && dtr && (
        <ResponsiveDocument className="max-w-3xl mx-auto">
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-8 print:p-0 print:shadow-none print:border-none">
            {isCertified && (
              <div className="mb-4 flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 print:hidden">
                <CheckCircle2 className="w-4 h-4" />
                Certified on{" "}
                {new Date(dtr.certification.certified_at).toLocaleString(
                  "en-PH",
                  { timeZone: "Asia/Manila" },
                )}
              </div>
            )}

            {!isCertified && (
              <p className="text-xs text-slate-400 mb-3 print:hidden">
                Click any day row below to correct times or add a remark.
              </p>
            )}

            <div className="flex items-center gap-4 mb-2">
              <img
                src={caapLogo}
                alt="CAAP Logo"
                className="w-16 h-16 object-contain shrink-0"
              />
              <div className="flex-1">
                <p className="text-xs italic">Republic of the Philippines</p>
                <p className="text-base font-bold">
                  Civil Aviation Authority of the Philippines
                </p>
              </div>
            </div>

            <h1 className="text-center font-bold tracking-widest text-base my-4">
              DAILY TIME RECORD
            </h1>

            <div className="text-sm space-y-1 mb-4">
              <div className="flex gap-2">
                <span className="shrink-0">Name:</span>
                <span className="border-b border-slate-800 flex-1 px-1">
                  {dtr.student.name}
                </span>
                <span className="shrink-0 ml-3">Course:</span>
                <span className="border-b border-slate-800 w-40 px-1">
                  {dtr.student.course}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0">Agency:</span>
                <span className="border-b border-slate-800 flex-1 px-1">
                  {dtr.student.agency}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0">Month:</span>
                <span className="border-b border-slate-800 w-24 px-1 shrink-0">
                  {dtr.student.month}
                </span>
                <span className="shrink-0 ml-2">Official Hours:</span>
                <span className="border-b border-slate-800 flex-1 px-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {dtr.student.officialHours || "—"}
                </span>
              </div>
            </div>

            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1">
                    DAY
                  </th>
                  <th colSpan={2} className="border border-slate-800 px-1 py-1">
                    MORNING
                  </th>
                  <th colSpan={2} className="border border-slate-800 px-1 py-1">
                    AFTERNOON
                  </th>
                  <th colSpan={2} className="border border-slate-800 px-1 py-1">
                    OVERTIME
                  </th>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1">
                    TOTAL
                    <br />
                    HOURS
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-800 px-1 py-1 print:hidden"
                  ></th>
                </tr>
                <tr>
                  <th className="border border-slate-800 px-1 py-1">IN</th>
                  <th className="border border-slate-800 px-1 py-1">OUT</th>
                  <th className="border border-slate-800 px-1 py-1">IN</th>
                  <th className="border border-slate-800 px-1 py-1">OUT</th>
                  <th className="border border-slate-800 px-1 py-1">IN</th>
                  <th className="border border-slate-800 px-1 py-1">OUT</th>
                </tr>
              </thead>
              <tbody>
                {dtr.days.map((row) => (
                  <DTRRow
                    key={row.day}
                    row={row}
                    editable={!isCertified}
                    onEdit={() => setEditingDay(row)}
                    onViewRemarks={() => setViewingRemarks(row)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={7}
                    className="border border-slate-800 px-1 py-1 font-bold text-center"
                  >
                    TOTAL HOURS
                  </td>
                  <td className="border border-slate-800 px-1 py-1 font-bold text-center">
                    {dtr.grandTotal.toFixed(2)}
                  </td>
                  <td className="border border-slate-800 print:hidden"></td>
                </tr>
              </tfoot>
            </table>

            <p className="text-[11px] mt-4 leading-snug">
              I certify on my honor that the above is a true and correct report
              of the hours of work performed, which was made daily at the time
              of IN and OUT from office.
            </p>

            <div className="flex justify-between mt-10 text-[11px]">
              <div className="text-center w-[45%]">
                <div className="border-b border-slate-800 mb-1 px-1 text-[11px] font-bold uppercase">
                  {dtr.student.name}
                </div>
                STUDENT TRAINEE
              </div>
              <div className="text-center w-[45%]">
                <div className="border-b border-slate-800 mb-1 px-1 text-[11px] font-bold uppercase">
                  {dtr.student.inChargeName || "\u00A0"}
                </div>
                IN-CHARGE
              </div>
            </div>
          </div>
        </ResponsiveDocument>
      )}

      {editingDay && (
        <CorrectionModal
          day={editingDay}
          month={month}
          onClose={() => setEditingDay(null)}
          onSaved={() => {
            setEditingDay(null);
            loadDTR(month);
          }}
          studentId={studentId}
        />
      )}

      {viewingRemarks && (
        <RemarksModal
          day={viewingRemarks}
          month={month}
          onClose={() => setViewingRemarks(null)}
        />
      )}

      {showCertifyConfirm && (
        <ConfirmModal
          title={`Certify ${dtr.student.name}'s DTR for ${dtr.student.month}?`}
          message={`This locks in ${dtr.grandTotal.toFixed(2)} total hours as the official, signed-off record. No further corrections can be made unless you uncertify it first.`}
          confirmLabel="Certify"
          danger={false}
          onConfirm={handleCertify}
          onCancel={() => setShowCertifyConfirm(false)}
        />
      )}

      {showUncertifyConfirm && (
        <ConfirmModal
          title={`Uncertify ${dtr.student.name}'s DTR for ${dtr.student.month}?`}
          message="This reopens the month for corrections. You'll need to re-certify once you're done making changes."
          confirmLabel="Uncertify"
          onConfirm={handleUncertify}
          onCancel={() => setShowUncertifyConfirm(false)}
        />
      )}
    </div>
  );
}

function DTRRow({ row, editable, onEdit, onViewRemarks }) {
  const cellClass = "border border-slate-800 px-1 py-0.5 text-center";
  const clickable = editable ? "cursor-pointer hover:bg-slate-100" : "";

  if (row.status === "weekend") {
    return (
      <tr className={clickable} onClick={editable ? onEdit : undefined}>
        <td className={cellClass}>{row.day}</td>
        <td colSpan={6} className={`${cellClass} text-slate-400 italic`}>
          — Weekend —
        </td>
        <td className={cellClass}>0.00</td>
        {editable && (
          <td className={`${cellClass} print:hidden`}>
            <Pencil className="w-3 h-3 mx-auto text-slate-400" />
          </td>
        )}
      </tr>
    );
  }

  if (row.status === "holiday") {
    return (
      <tr
        className={`bg-slate-50 ${clickable}`}
        onClick={editable ? onEdit : undefined}
      >
        <td className={cellClass}>{row.day}</td>
        <td colSpan={6} className={`${cellClass} italic`}>
          {row.label || "Holiday"}
        </td>
        <td className={cellClass}>0.00</td>
        {editable && (
          <td className={`${cellClass} print:hidden`}>
            <Pencil className="w-3 h-3 mx-auto text-slate-400" />
          </td>
        )}
      </tr>
    );
  }

  if (row.status === "absent") {
    return (
      <tr className={clickable} onClick={editable ? onEdit : undefined}>
        <td className={cellClass}>{row.day}</td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={`${cellClass} text-red-600 font-medium`}>0.00</td>
        {editable && (
          <td className={`${cellClass} print:hidden`}>
            <Pencil className="w-3 h-3 mx-auto text-slate-400" />
          </td>
        )}
      </tr>
    );
  }

  if (row.status === "pending") {
    return (
      <tr className={clickable} onClick={editable ? onEdit : undefined}>
        <td className={cellClass}>{row.day}</td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        {editable && (
          <td className={`${cellClass} print:hidden`}>
            <Pencil className="w-3 h-3 mx-auto text-slate-400" />
          </td>
        )}
      </tr>
    );
  }

  return (
    <tr
      className={`${row.isHolidayWorked ? "bg-amber-50" : ""} ${clickable}`}
      onClick={editable ? onEdit : undefined}
    >
      <td className={cellClass}>
        {row.day}
        {row.isHolidayWorked && (
          <span
            className="block text-[8px] text-amber-600 font-medium leading-none mt-0.5"
            title={row.holidayName}
          >
            HOLIDAY
          </span>
        )}
        {row.remarks && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewRemarks();
            }}
            className="block mx-auto mt-0.5 print:hidden"
            title="View remarks"
          >
            <MessageSquare className="w-3 h-3 text-caap-blue" />
          </button>
        )}
      </td>
      <td className={cellClass}>{to12HourNoSuffix(row.amIn)}</td>
      <td className={cellClass}>{to12HourNoSuffix(row.amOut)}</td>
      <td className={cellClass}>{to12HourNoSuffix(row.pmIn)}</td>
      <td className={cellClass}>{to12HourNoSuffix(row.pmOut)}</td>
      <td className={cellClass}>{to12Hour(row.otIn)}</td>
      <td className={cellClass}>{to12Hour(row.otOut)}</td>
      <td className={`${cellClass} font-medium`}>
        {row.totalHours.toFixed(2)}
      </td>
      {editable && (
        <td className={`${cellClass} print:hidden`}>
          <Pencil className="w-3 h-3 mx-auto text-slate-400" />
        </td>
      )}
    </tr>
  );
}

/**
 * Modal for correcting a single day's attendance. Prefills existing
 * times when present, blank otherwise. Remarks are required so every
 * correction leaves an explained paper trail.
 */
function CorrectionModal({ day, month, studentId, onClose, onSaved }) {
  const [form, setForm] = useState({
    amIn: day.amIn || "",
    amOut: day.amOut || "",
    pmIn: day.pmIn || "",
    pmOut: day.pmOut || "",
    otIn: day.otIn || "",
    otOut: day.otOut || "",
    remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const dateStr = `${month}-${String(day.day).padStart(2, "0")}`;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.remarks.trim()) {
      setError("Please explain the reason for this correction.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const times = {
        amIn: form.amIn || null,
        amOut: form.amOut || null,
        pmIn: form.pmIn || null,
        pmOut: form.pmOut || null,
        otIn: form.otIn || null,
        otOut: form.otOut || null,
      };
      await correctAttendance(studentId, dateStr, times, form.remarks);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 print:hidden">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-semibold text-slate-800 mb-1">
          Correct Attendance — Day {day.day}
        </h2>
        <p className="text-xs text-slate-500 mb-4">{dateStr}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              label="AM In"
              value={form.amIn}
              onChange={(v) => setForm({ ...form, amIn: v })}
            />
            <TimeField
              label="AM Out"
              value={form.amOut}
              onChange={(v) => setForm({ ...form, amOut: v })}
            />
            <TimeField
              label="PM In"
              value={form.pmIn}
              onChange={(v) => setForm({ ...form, pmIn: v })}
            />
            <TimeField
              label="PM Out"
              value={form.pmOut}
              onChange={(v) => setForm({ ...form, pmOut: v })}
            />
            <TimeField
              label="OT In"
              value={form.otIn}
              onChange={(v) => setForm({ ...form, otIn: v })}
            />
            <TimeField
              label="OT Out"
              value={form.otOut}
              onChange={(v) => setForm({ ...form, otOut: v })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Reason for correction (required)
            </label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
              placeholder="e.g. Student forgot to time out; confirmed with supervisor."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Correction"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
      />
    </div>
  );
}

/**
 * Read-only modal showing the full remarks history for a day.
 * Corrections append rather than overwrite (see attendanceService.js),
 * so this can show multiple stacked entries separated by newlines.
 */
function RemarksModal({ day, month, onClose }) {
  const dateStr = `${month}-${String(day.day).padStart(2, "0")}`;
  const entries = (day.remarks || "").split("\n").filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 print:hidden">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-semibold text-slate-800 mb-1">
          Remarks — Day {day.day}
        </h2>
        <p className="text-xs text-slate-500 mb-4">{dateStr}</p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {entries.length > 0 ? (
            entries.map((line, i) => (
              <div
                key={i}
                className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                {line}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">
              No remarks recorded for this day.
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 border border-slate-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
