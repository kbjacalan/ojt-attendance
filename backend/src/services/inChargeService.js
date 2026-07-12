const pool = require("../config/db");
const { getMonthlyDTR } = require("./dtrService");
const { getManilaDateString } = require("../utils/time");
const { computeDutyStatus } = require("../utils/duty");

class InChargeError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Lists all students assigned to agencies this in-charge manages.
 * Assumes one in-charge account can be linked to one or more agencies
 * via agencies.in_charge_id.
 */
async function listMyStudents(inChargeUserId, dateStr) {
  const targetDate = dateStr || getManilaDateString();

  const { rows } = await pool.query(
    `SELECT sp.id AS student_id, u.full_name, u.email, sp.course,
            sp.university, sp.batch, sp.ojt_status,
            a.id AS agency_id, a.name AS agency_name,
            al.am_time_in, al.am_time_out, al.pm_time_in, al.pm_time_out,
            al.ot_time_in, al.ot_time_out
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     JOIN agencies a ON a.id = sp.agency_id
     LEFT JOIN attendance_logs al ON al.student_id = sp.id AND al.log_date = $2
     WHERE a.in_charge_id = $1
     ORDER BY u.full_name ASC`,
    [inChargeUserId, targetDate],
  );

  return rows.map((row) => {
    const {
      am_time_in,
      am_time_out,
      pm_time_in,
      pm_time_out,
      ot_time_in,
      ot_time_out,
      ...rest
    } = row;
    const duty = computeDutyStatus(row);
    return { ...rest, ...duty };
  });
}

/**
 * Verifies that a student belongs to an agency managed by this in-charge.
 * Throws if not — prevents an in-charge from viewing/certifying students
 * outside their own agency.
 */
async function assertStudentBelongsToInCharge(studentId, inChargeUserId) {
  const { rows } = await pool.query(
    `SELECT sp.id
     FROM student_profiles sp
     JOIN agencies a ON a.id = sp.agency_id
     WHERE sp.id = $1 AND a.in_charge_id = $2`,
    [studentId, inChargeUserId],
  );
  if (rows.length === 0) {
    throw new InChargeError("You do not have access to this student.", 403);
  }
}

/**
 * Returns a student's DTR for a month, plus certification status,
 * for an in-charge to review before certifying. getMonthlyDTR already
 * includes the `certification` object (status, signature, etc.), so
 * this is just an access-controlled pass-through.
 */
async function getStudentDTRForReview(studentId, monthStr, inChargeUserId) {
  await assertStudentBelongsToInCharge(studentId, inChargeUserId);
  return getMonthlyDTR(studentId, monthStr);
}

/**
 * Given a 'YYYY-MM' string, returns the first and last calendar-date
 * strings of that month (e.g. '2026-07-01' / '2026-07-31').
 */
function monthBounds(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    monthStart: `${monthStr}-01`,
    monthEnd: `${monthStr}-${String(daysInMonth).padStart(2, "0")}`,
  };
}

// A day only counts as certifiable if at least one full in/out pair was
// actually recorded — an in-charge signing off shouldn't retroactively
// stamp a day nobody has confirmed the student completed.
const COMPLETE_ATTENDANCE_SQL = `(
  (am_time_in IS NOT NULL AND am_time_out IS NOT NULL) OR
  (pm_time_in IS NOT NULL AND pm_time_out IS NOT NULL)
)`;

/**
 * Certifies a student's DTR for a month — locks in the total hours,
 * stores the in-charge's drawn signature, and records who certified it
 * and when. Upserts into dtr_periods, then stamps `certified_by` (the
 * in-charge's name) onto every attendance_logs row in that month which
 * has a complete Time In/Time Out pair; rows with incomplete attendance
 * are left uncertified (and any stale mark from a prior certification
 * is cleared) so the CERTIFIED BY column can never be bypassed into
 * showing a signature for a day that wasn't actually completed.
 *
 * Also enforces — server-side, so this can't be bypassed by skipping
 * the UI — that the student has met or exceeded their required OJT
 * hours before certification is allowed.
 */
async function certifyDTR(studentId, monthStr, inChargeUserId, signature) {
  await assertStudentBelongsToInCharge(studentId, inChargeUserId);

  if (
    !signature ||
    typeof signature !== "string" ||
    signature.trim().length < 100
  ) {
    throw new InChargeError(
      "A signature is required to certify this DTR.",
      400,
    );
  }

  const dtr = await getMonthlyDTR(studentId, monthStr);

  const requiredHours = dtr.student.requiredHours;
  if (requiredHours > 0 && dtr.grandTotal < requiredHours) {
    throw new InChargeError(
      `This student has not yet completed the required OJT hours ` +
        `(${dtr.grandTotal.toFixed(2)} / ${requiredHours.toFixed(2)} hours). ` +
        `Certification is only available after the required hours are met.`,
      400,
    );
  }

  const inChargeResult = await pool.query(
    `SELECT full_name FROM users WHERE id = $1`,
    [inChargeUserId],
  );
  const inChargeName = inChargeResult.rows[0]?.full_name || "In-Charge";

  const { monthStart, monthEnd } = monthBounds(monthStr);

  const { rows } = await pool.query(
    `INSERT INTO dtr_periods (student_id, period_month, status, total_hours, certified_by, certified_at, signature)
     VALUES ($1, $2, 'certified', $3, $4, now(), $5)
     ON CONFLICT (student_id, period_month)
     DO UPDATE SET status = 'certified', total_hours = $3, certified_by = $4, certified_at = now(), signature = $5
     RETURNING *`,
    [studentId, monthStart, dtr.grandTotal, inChargeUserId, signature],
  );

  await pool.query(
    `UPDATE attendance_logs
     SET certified_by = $1, updated_at = now()
     WHERE student_id = $2 AND log_date BETWEEN $3 AND $4
       AND ${COMPLETE_ATTENDANCE_SQL}`,
    [inChargeName, studentId, monthStart, monthEnd],
  );

  await pool.query(
    `UPDATE attendance_logs
     SET certified_by = NULL, updated_at = now()
     WHERE student_id = $1 AND log_date BETWEEN $2 AND $3
       AND NOT ${COMPLETE_ATTENDANCE_SQL}`,
    [studentId, monthStart, monthEnd],
  );

  return rows[0];
}

/**
 * Reverts a certified month back to 'draft' — required before any
 * correction can be made to attendance within that month. Whoever
 * uncertifies must re-certify afterward once corrections are done.
 * Clears the stored signature and every row-level certified_by mark so
 * a reopened month never shows a stale certification.
 */
async function uncertifyDTR(studentId, monthStr, inChargeUserId) {
  await assertStudentBelongsToInCharge(studentId, inChargeUserId);

  const { monthStart, monthEnd } = monthBounds(monthStr);

  const { rows } = await pool.query(
    `UPDATE dtr_periods
     SET status = 'draft', certified_by = NULL, certified_at = NULL, signature = NULL
     WHERE student_id = $1 AND period_month = $2
     RETURNING *`,
    [studentId, monthStart],
  );

  if (rows.length === 0) {
    throw new InChargeError("This month was not certified yet.", 400);
  }

  await pool.query(
    `UPDATE attendance_logs SET certified_by = NULL, updated_at = now()
     WHERE student_id = $1 AND log_date BETWEEN $2 AND $3`,
    [studentId, monthStart, monthEnd],
  );

  return rows[0];
}

module.exports = {
  listMyStudents,
  getStudentDTRForReview,
  certifyDTR,
  uncertifyDTR,
  assertStudentBelongsToInCharge,
  InChargeError,
};
