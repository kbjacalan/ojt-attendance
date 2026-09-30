import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import BackButton from "../../components/common/BackButton";
import {
  LoaderCircle,
  CheckCircle2,
  Printer,
  XCircle,
  MessageSquare,
  PenTool,
  Eraser,
  AlertCircle,
} from "lucide-react";
import {
  getStudentDTR,
  getStudentDTRMonths,
  certifyDTR,
  uncertifyDTR,
  correctAttendance,
} from "../../services/inchargeApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import SignaturePad from "../../components/common/SignaturePad";
import ResponsiveDocument from "../../components/document/ResponsiveDocument";
import caapLogo from "../../assets/caap_logo.png";
import bagongPilipinasLogo from "../../assets/bagong_pilipinas_logo.png";
import { to12Hour, to12HourNoSuffix } from "../../utils/formatTime";
import DTRMonthPicker from "../../components/dtr/DTRMonthPicker";
import RemarksModal from "../../components/dtr/DTRRemarksModal";
import TextInput from "../../components/common/TextInput";
import TextArea from "../../components/common/TextArea";

export default function StudentDTRReview() {
  const { studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get("month") || null;
  const [months, setMonths] = useState([]);
  const [monthsLoading, setMonthsLoading] = useState(true);
  const [dtr, setDtr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [certifying, setCertifying] = useState(false);
  const [editingDay, setEditingDay] = useState(null); // the row object being corrected, or null
  const [viewingRemarks, setViewingRemarks] = useState(null); // the row object whose remarks are being viewed
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [showUncertifyConfirm, setShowUncertifyConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMonths() {
      setMonthsLoading(true);
      try {
        const list = await getStudentDTRMonths(studentId);
        if (cancelled) return;
        setMonths(list);
        const current = searchParams.get("month");
        if (list.length === 0) {
          if (current) {
            const next = new URLSearchParams(searchParams);
            next.delete("month");
            setSearchParams(next, { replace: true });
          }
        } else if (!current || !list.includes(current)) {
          const next = new URLSearchParams(searchParams);
          next.set("month", list[0]);
          setSearchParams(next, { replace: true });
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setMonthsLoading(false);
      }
    }
    loadMonths();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    if (month) loadDTR(month);
  }, [month, studentId]);

  async function loadDTR(m) {
    if (!m) return;
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

  function setMonth(value) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("month", value);
        return next;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleCertify(signatureDataUrl) {
    setShowCertifyModal(false);
    setCertifying(true);
    try {
      await certifyDTR(studentId, month, signatureDataUrl);
      await loadDTR(month);
      setToast({
        type: "success",
        message: "DTR certified successfully.",
      });
    } catch (err) {
      setToast({ type: "error", message: err.message });
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
  const requiredHours = dtr?.student?.requiredHours || 0;
  const hoursMet = Boolean(dtr) && dtr.cumulativeHours >= requiredHours;
  const certifyDisabledReason = !dtr
    ? null
    : !hoursMet
      ? "Certification is only available after the student has completed the required OJT hours."
      : null;

  return (
    <div className="min-h-screen bg-bg-secondary py-8 px-4 print:p-0">
      <div className="max-w-3xl mx-auto mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <BackButton fallbackTo="/incharge/records" label="Back to Students" />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-row items-center justify-between gap-2">
            {months.length > 0 && month && (
              <DTRMonthPicker
                months={months}
                value={month}
                onChange={setMonth}
              />
            )}

            <button
              onClick={() => window.print()}
              disabled={!dtr}
              className="flex shrink-0 items-center justify-center gap-2 bg-brand text-text-inverse px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>

          {isCertified ? (
            <button
              onClick={() => setShowUncertifyConfirm(true)}
              className="flex w-full items-center justify-center gap-2 bg-bg-primary border border-border text-text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-bg-secondary sm:w-auto"
            >
              <XCircle className="w-4 h-4" /> Uncertify
            </button>
          ) : (
            <button
              onClick={() => setShowCertifyModal(true)}
              disabled={!dtr || certifying || !hoursMet}
              title={certifyDisabledReason || undefined}
              className="flex w-full items-center justify-center gap-2 bg-gold text-text-primary px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gold-hover disabled:hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              {certifying ? "Certifying…" : "Certify"}
            </button>
          )}
        </div>
      </div>

      {!isCertified && dtr && (
        <div className="max-w-3xl mx-auto -mt-2 mb-4 flex justify-end print:hidden">
          <span
            className={`flex flex-col items-end text-[11px] font-medium text-right ${
              hoursMet ? "text-success" : "text-amber-600"
            }`}
          >
            <span>
              {dtr.cumulativeHours.toFixed(2)} / {requiredHours.toFixed(2)} hrs
              completed
            </span>
            {!hoursMet && (
              <span className="inline-flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Complete required hours to certify
              </span>
            )}
          </span>
        </div>
      )}

      {(loading || monthsLoading) && (
        <div className="flex justify-center py-16 text-text-secondary">
          <LoaderCircle className="w-6 h-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto rounded-lg bg-error-subtle border border-error-border text-error text-sm px-4 py-3">
          {error}
        </div>
      )}

      {!monthsLoading && !error && months.length === 0 && (
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-bg-primary p-8 text-center text-sm text-text-secondary shadow-card">
          <p>This student has no punched records yet.</p>
        </div>
      )}

      {!loading && !monthsLoading && dtr && month && (
        <ResponsiveDocument className="max-w-3xl mx-auto">
          <div className="bg-bg-primary shadow-sm border border-border rounded-lg p-8 print:p-0 print:shadow-none print:border-none">
            {isCertified && (
              <div className="mb-4 flex items-center gap-2 text-sm bg-success-subtle text-success border border-success-border rounded-lg px-3 py-2 print:hidden">
                <CheckCircle2 className="w-4 h-4" />
                Certified on{" "}
                {new Date(dtr.certification.certifiedAt).toLocaleString(
                  "en-PH",
                  { timeZone: "Asia/Manila" },
                )}
              </div>
            )}

            {!isCertified && (
              <p className="text-xs text-text-secondary mb-3 print:hidden">
                Click any day row below to correct times or add a remark.
              </p>
            )}

            <div className="flex flex-col items-center mb-2">
              <div className="flex items-center justify-center gap-3">
                <img
                  src={bagongPilipinasLogo}
                  alt="Bagong Pilipinas Logo"
                  className="w-16 h-16 object-contain shrink-0"
                />
                <img
                  src={caapLogo}
                  alt="CAAP Logo"
                  className="w-16 h-16 object-contain shrink-0"
                />
              </div>
              <p className="text-xs text-black mt-1">
                Republic of the Philippines
              </p>
              <p className="text-xs text-black">Department of Transportation</p>
              <p className="text-base font-bold text-black uppercase tracking-wide text-center">
                Civil Aviation Authority of the Philippines
              </p>
            </div>

            <h1 className="text-center font-bold tracking-widest text-base my-4">
              DAILY TIME RECORD
            </h1>

            <div className="text-xs space-y-1 mb-4">
              <div className="flex gap-2">
                <span className="shrink-0">Name:</span>
                <span className="border-b border-slate-800 flex-1 px-1">
                  {dtr.student.name}
                </span>
                <span className="shrink-0 ml-3">Course:</span>
                <span className="border-b border-slate-800 w-fit max-w-[75ch] px-1">
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
                <span className="border-b border-slate-800 w-[15ch] px-1 shrink-0">
                  {dtr.student.month}
                </span>
                <span className="shrink-0 ml-2">Official Hours:</span>
                <span className="border-b border-slate-800 flex-1 px-1">
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
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1">
                    CERTIFIED BY
                  </th>
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
                    signature={dtr.certification?.signature}
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
                  <td className="border border-slate-800"></td>
                </tr>
              </tfoot>
            </table>

            <p className="text-xs mt-4 leading-snug">
              I certify on my honor that the above is a true and correct report
              of the hours of work performed, which was made daily at the time
              of IN and OUT from office.
            </p>

            <div className="flex justify-between mt-10 text-[11px]">
              <div className="text-center w-[45%]">
                <div className="h-9 mb-1 px-1 flex items-end justify-center">
                  {"\u00A0"}
                </div>
                <div className="border-b border-slate-800 mb-1 px-1 text-xs font-bold uppercase">
                  {dtr.student.name}
                </div>
                STUDENT TRAINEE
              </div>
              <div className="text-center w-[45%]">
                <div className="h-9 mb-1 px-1 flex items-end justify-center">
                  {isCertified && dtr.certification?.signature ? (
                    <img
                      src={dtr.certification.signature}
                      alt="In-charge signature"
                      className="h-9 w-auto max-w-full object-contain translate-y-2"
                    />
                  ) : (
                    "\u00A0"
                  )}
                </div>
                <div className="border-b border-slate-800 mb-1 px-1 text-xs font-bold uppercase">
                  {(isCertified && dtr.certification?.certifiedByName) ||
                    dtr.student.inChargeName ||
                    "\u00A0"}
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

      {showCertifyModal && dtr && (
        <CertifyModal
          dtr={dtr}
          requiredHours={requiredHours}
          certifying={certifying}
          onClose={() => setShowCertifyModal(false)}
          onCertified={handleCertify}
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] print:hidden">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === "error"
                ? "bg-destructive text-text-inverse"
                : "bg-emerald-600 text-text-inverse"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

function DTRRow({ row, editable, signature, onEdit, onViewRemarks }) {
  const cellClass = "border border-slate-800 px-1 py-0.5 text-center";
  const clickable = editable ? "cursor-pointer hover:bg-bg-secondary" : "";

  if (row.status === "weekend") {
    return (
      <tr className={clickable} onClick={editable ? onEdit : undefined}>
        <td className={cellClass}>{row.day}</td>
        <td colSpan={6} className={`${cellClass} text-text-secondary italic`}>
          — Weekend —
        </td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
      </tr>
    );
  }

  if (row.status === "holiday") {
    return (
      <tr
        className={`bg-bg-secondary ${clickable}`}
        onClick={editable ? onEdit : undefined}
      >
        <td className={cellClass}>{row.day}</td>
        <td colSpan={6} className={`${cellClass} italic`}>
          {row.label || "Holiday"}
        </td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
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
        <td className={cellClass}></td>
        <td className={cellClass}></td>
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
        <td className={cellClass}></td>
      </tr>
    );
  }

  // present — highlight empty time cells red on screen only (incomplete day cue)
  const missingCell = "bg-error-subtle print:bg-transparent";
  const otIncomplete = Boolean(row.otIn) !== Boolean(row.otOut);
  return (
    <tr
      className={`${row.isHolidayWorked ? "bg-warning-subtle" : ""} ${clickable}`}
      onClick={editable ? onEdit : undefined}
    >
      <td className={cellClass}>
        {row.day}
        {row.isHolidayWorked && (
          <span
            className="block text-[8px] text-amber-600 font-medium leading-none mt-0.5 print:hidden"
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
            <MessageSquare className="w-3 h-3 text-text-primary" />
          </button>
        )}
      </td>
      <td className={`${cellClass} ${!row.amIn ? missingCell : ""}`}>
        {to12HourNoSuffix(row.amIn)}
      </td>
      <td className={`${cellClass} ${!row.amOut ? missingCell : ""}`}>
        {to12HourNoSuffix(row.amOut)}
      </td>
      <td className={`${cellClass} ${!row.pmIn ? missingCell : ""}`}>
        {to12HourNoSuffix(row.pmIn)}
      </td>
      <td className={`${cellClass} ${!row.pmOut ? missingCell : ""}`}>
        {to12HourNoSuffix(row.pmOut)}
      </td>
      <td
        className={`${cellClass} ${otIncomplete && !row.otIn ? missingCell : ""}`}
      >
        {to12Hour(row.otIn)}
      </td>
      <td
        className={`${cellClass} ${otIncomplete && !row.otOut ? missingCell : ""}`}
      >
        {to12Hour(row.otOut)}
      </td>
      <td className={`${cellClass} font-medium`}>
        {row.totalHours ? row.totalHours.toFixed(2) : ""}
      </td>
      <td className={cellClass}>
        {row.certifiedBy && signature ? (
          <img
            src={signature}
            alt={`Certified by ${row.certifiedBy}`}
            title={row.certifiedBy}
            className="h-4 w-auto max-w-full mx-auto object-contain"
          />
        ) : null}
      </td>
    </tr>
  );
}

/**
 * Signature-capture modal for the Certify action. The in-charge draws
 * their signature, then confirms before it's submitted — certification
 * cannot be completed without a drawn signature (enforced here and,
 * redundantly, on the backend).
 */
function CertifyModal({
  dtr,
  requiredHours,
  certifying,
  onClose,
  onCertified,
}) {
  const padRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleClear() {
    padRef.current?.clear();
    setError(null);
  }

  function handleCertifyClick() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw your signature before certifying.");
      return;
    }
    setError(null);
    setShowConfirm(true);
  }

  function handleConfirm() {
    const dataUrl = padRef.current.toDataURL();
    setShowConfirm(false);
    onCertified(dataUrl);
  }

  return (
    <>
      <div className="fixed inset-0 bg-overlay flex items-center justify-center px-4 z-50 print:hidden">
        <div className="bg-bg-primary rounded-2xl shadow-xl w-full max-w-lg p-6">
          <h2 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
            <PenTool className="w-4 h-4 text-text-primary" />
            Certify DTR — {dtr.student.name}
          </h2>
          <p className="text-xs text-text-secondary mb-4">
            {dtr.student.month} ·{" "}
            <span className="font-medium text-success">
              {dtr.cumulativeHours.toFixed(2)} / {requiredHours.toFixed(2)}{" "}
              hours completed
            </span>
          </p>

          <p className="text-xs text-text-secondary mb-2">
            Sign below to certify this DTR as a true and correct record. Your
            signature will appear in the CERTIFIED BY column for every completed
            day and in the IN-CHARGE signature block.
          </p>

          <div className="border border-border rounded-lg overflow-hidden">
            <SignaturePad
              ref={padRef}
              width={600}
              height={180}
              className="w-full h-[180px]"
              onChange={setIsEmpty}
            />
          </div>

          {error && (
            <p className="text-xs text-error mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={handleCertifyClick}
              disabled={certifying || isEmpty}
              className="flex items-center gap-2 bg-gold text-text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-hover disabled:hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {certifying ? "Certifying…" : "Certify"}
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary border border-border"
            >
              <Eraser className="w-4 h-4" /> Clear
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary ml-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          title={`Certify ${dtr.student.name}'s DTR for ${dtr.student.month}?`}
          message={`This locks in ${dtr.grandTotal.toFixed(2)} total hours as the official, signed-off record with your signature. No further corrections can be made unless you uncertify it first.`}
          confirmLabel="Certify"
          danger={false}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
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
      const result = await correctAttendance(
        studentId,
        dateStr,
        times,
        form.remarks,
      );
      if (result.warnings && result.warnings.length > 0) {
        window.alert(result.warnings.join("\n"));
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center px-4 z-50 print:hidden">
      <div className="bg-bg-primary rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-semibold text-text-primary mb-1">
          Correct Attendance — Day {day.day}
        </h2>
        <p className="text-xs text-text-secondary mb-4">{dateStr}</p>

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
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Reason for correction (required)
            </label>
            <TextArea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
              placeholder="e.g. Student forgot to time out; confirmed with supervisor."
            />
          </div>

          {error && <div className="text-sm text-error">{error}</div>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : "Save Correction"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary"
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
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      <TextInput
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
