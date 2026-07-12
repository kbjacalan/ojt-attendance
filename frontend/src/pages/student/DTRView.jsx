import { useState, useEffect } from "react";
import {
  Printer,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getMyDTR } from "../../services/dtrApi";
import ResponsiveDocument from "../../components/document/ResponsiveDocument";
import caapLogo from "../../assets/caap_logo.png";

/** Converts "HH:MM" 24-hour string to "h:mm" without AM/PM (for Morning/Afternoon columns). */
function to12HourNoSuffix(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}`;
}

/** Converts "HH:MM" 24-hour string to "h:mm AM/PM" (for Overtime column). */
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

export default function DTRView() {
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [viewingRemarks, setViewingRemarks] = useState(null);
  const [dtr, setDtr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDTR(month);
  }, [month]);

  async function loadDTR(m) {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyDTR(m);
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

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:p-0">
      {/* Toolbar — hidden when printing */}
      <div className="max-w-3xl mx-auto mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          to="/attendance"
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← Back to Attendance
        </Link>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="flex items-center gap-1">
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

          <button
            onClick={() => window.print()}
            disabled={!dtr}
            className="flex items-center gap-2 bg-caap-navy text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50 sm:ml-3"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
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
            {/* Header */}
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

            <div className="text-xs space-y-1 mb-4">
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

            {/* Table */}
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
                    signature={dtr.certification?.signature}
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

            {/* Certification */}
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
                  {dtr.certification?.status === "certified" &&
                  dtr.certification?.signature ? (
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
                  {(dtr.certification?.status === "certified" &&
                    dtr.certification?.certifiedByName) ||
                    dtr.student.inChargeName ||
                    "\u00A0"}
                </div>
                IN-CHARGE
              </div>
            </div>
          </div>
        </ResponsiveDocument>
      )}

      {viewingRemarks && (
        <RemarksModal
          day={viewingRemarks}
          month={month}
          onClose={() => setViewingRemarks(null)}
        />
      )}
    </div>
  );
}

function DTRRow({ row, signature, onViewRemarks }) {
  const cellClass = "border border-slate-800 px-1 py-0.5 text-center";

  if (row.status === "weekend") {
    return (
      <tr>
        <td className={cellClass}>{row.day}</td>
        <td colSpan={6} className={`${cellClass} text-slate-400 italic`}>
          — Weekend —
        </td>
        <td className={cellClass}>0.00</td>
        <td className={cellClass}></td>
      </tr>
    );
  }

  if (row.status === "holiday") {
    return (
      <tr className="bg-slate-50">
        <td className={cellClass}>{row.day}</td>
        <td colSpan={6} className={`${cellClass} italic`}>
          {row.label || "Holiday"}
        </td>
        <td className={cellClass}>0.00</td>
        <td className={cellClass}></td>
      </tr>
    );
  }

  if (row.status === "absent") {
    return (
      <tr>
        <td className={cellClass}>{row.day}</td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
        <td className={`${cellClass} text-red-600 font-medium`}>0.00</td>
        <td className={cellClass}></td>
      </tr>
    );
  }

  if (row.status === "pending") {
    return (
      <tr>
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

  // present
  return (
    <tr className={row.isHolidayWorked ? "bg-amber-50" : ""}>
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
            onClick={onViewRemarks}
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
 * Read-only modal showing the full remarks history for a day —
 * lets a student see why an in-charge or admin corrected their record.
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
