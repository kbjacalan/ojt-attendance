const pool = require("../config/db");
const { getManilaDateString } = require("../utils/time");
const { buildOfficialHoursText } = require("../utils/officialHours");

class DTRError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function getMonthlyDTR(studentId, monthStr) {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) {
    throw new DTRError("month must be in YYYY-MM format.", 400);
  }

  const studentResult = await pool.query(
    `SELECT u.full_name, sp.course, sp.required_hours,
            sp.am_start, sp.am_end, sp.pm_start, sp.pm_end,
            a.name AS agency_name, ic.full_name AS in_charge_name,
            cn.control_number
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     LEFT JOIN agencies a ON a.id = sp.agency_id
     LEFT JOIN users ic ON ic.id = a.in_charge_id
     LEFT JOIN ojt_control_numbers cn ON cn.id = sp.control_number_id
     WHERE sp.id = $1`,
    [studentId],
  );

  if (studentResult.rows.length === 0) {
    throw new DTRError("Student not found.", 404);
  }
  const student = studentResult.rows[0];

  const cumulativeResult = await pool.query(
    `SELECT COALESCE(SUM(total_hours), 0) AS cumulative_hours
     FROM attendance_logs
     WHERE student_id = $1`,
    [studentId],
  );
  const cumulativeHours =
    parseFloat(cumulativeResult.rows[0].cumulative_hours) || 0;

  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const logsResult = await pool.query(
    `SELECT log_date, status, am_time_in, am_time_out, pm_time_in, pm_time_out,
            ot_time_in, ot_time_out, total_hours, certified_by, remarks
     FROM attendance_logs
     WHERE student_id = $1 AND log_date BETWEEN $2 AND $3
     ORDER BY log_date ASC`,
    [studentId, monthStart, monthEnd],
  );

  const periodResult = await pool.query(
    `SELECT dp.status, dp.certified_at, dp.total_hours, dp.signature,
            cu.full_name AS certified_by_name
     FROM dtr_periods dp
     LEFT JOIN users cu ON cu.id = dp.certified_by
     WHERE dp.student_id = $1 AND dp.period_month = $2`,
    [studentId, monthStart],
  );
  const certRow = periodResult.rows[0];

  const holidaysResult = await pool.query(
    `SELECT holiday_date, name FROM holidays WHERE holiday_date BETWEEN $1 AND $2`,
    [monthStart, monthEnd],
  );
  const holidaysByDay = {};
  for (const row of holidaysResult.rows) {
    const dayNum = new Date(row.holiday_date).getDate();
    holidaysByDay[dayNum] = row.name;
  }

  const logsByDay = {};
  for (const row of logsResult.rows) {
    const dayNum = new Date(row.log_date).getDate();
    logsByDay[dayNum] = row;
  }

  const today = getManilaDateString();
  const days = [];
  let grandTotal = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dow = dateObj.getDay();
    const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
    const log = logsByDay[d];

    if (log) {
      const totalHours = parseFloat(log.total_hours) || 0;
      grandTotal += totalHours;
      days.push({
        day: d,
        status: log.status,
        amIn: toTimeString(log.am_time_in),
        amOut: toTimeString(log.am_time_out),
        pmIn: toTimeString(log.pm_time_in),
        pmOut: toTimeString(log.pm_time_out),
        otIn: toTimeString(log.ot_time_in),
        otOut: toTimeString(log.ot_time_out),
        totalHours,
        certifiedBy: log.certified_by || "",
        remarks: log.remarks || "",
        isHolidayWorked: Boolean(holidaysByDay[d]),
        holidayName: holidaysByDay[d] || null,
      });
    } else if (holidaysByDay[d]) {
      days.push({ day: d, status: "holiday", label: holidaysByDay[d] });
    } else if (dow === 0 || dow === 6) {
      days.push({ day: d, status: "weekend" });
    } else if (dateStr < today) {
      days.push({ day: d, status: "absent" });
    } else {
      days.push({ day: d, status: "pending" });
    }
  }

  return {
    student: {
      name: student.full_name,
      course: student.course,
      agency: student.agency_name || "Unassigned",
      controlNumber: student.control_number || "",
      officialHours: buildOfficialHoursText({
        amStart: toHHMM(student.am_start),
        amEnd: toHHMM(student.am_end),
        pmStart: toHHMM(student.pm_start),
        pmEnd: toHHMM(student.pm_end),
      }),
      amStart: toHHMM(student.am_start),
      amEnd: toHHMM(student.am_end),
      pmStart: toHHMM(student.pm_start),
      pmEnd: toHHMM(student.pm_end),
      requiredHours: parseFloat(student.required_hours) || 0,
      month: formatMonthLabel(monthStr),
      inChargeName: student.in_charge_name || "",
    },
    days,
    grandTotal: Math.round(grandTotal * 100) / 100,
    cumulativeHours: Math.round(cumulativeHours * 100) / 100,
    certification: certRow
      ? {
          status: certRow.status,
          certifiedAt: certRow.certified_at,
          certifiedByName: certRow.certified_by_name || "",
          signature: certRow.signature || null,
          totalHours:
            certRow.total_hours !== null
              ? parseFloat(certRow.total_hours)
              : null,
        }
      : {
          status: "draft",
          certifiedAt: null,
          certifiedByName: "",
          signature: null,
          totalHours: null,
        },
  };
}

function toHHMM(time) {
  if (!time) return "";
  return time.slice(0, 5);
}

function toTimeString(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  const minute = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    minute: "2-digit",
  }).format(date);
  const h = hour === "24" ? "00" : hour.padStart(2, "0");
  const m = minute.padStart(2, "0");
  return `${h}:${m}`;
}

function formatMonthLabel(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

module.exports = { getMonthlyDTR, DTRError };
