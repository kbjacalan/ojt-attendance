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
 * for an in-charge to review before certifying.
 */
async function getStudentDTRForReview(studentId, monthStr, inChargeUserId) {
  await assertStudentBelongsToInCharge(studentId, inChargeUserId);

  const dtr = await getMonthlyDTR(studentId, monthStr);

  const periodResult = await pool.query(
    `SELECT status, certified_at, total_hours
     FROM dtr_periods
     WHERE student_id = $1 AND period_month = $2`,
    [studentId, `${monthStr}-01`],
  );

  return {
    ...dtr,
    certification: periodResult.rows[0] || {
      status: "draft",
      certified_at: null,
      total_hours: null,
    },
  };
}

/**
 * Certifies a student's DTR for a month — locks in the total hours
 * and records who certified it and when. Upserts into dtr_periods.
 */
async function certifyDTR(studentId, monthStr, inChargeUserId) {
  await assertStudentBelongsToInCharge(studentId, inChargeUserId);

  const dtr = await getMonthlyDTR(studentId, monthStr);

  const { rows } = await pool.query(
    `INSERT INTO dtr_periods (student_id, period_month, status, total_hours, certified_by, certified_at)
     VALUES ($1, $2, 'certified', $3, $4, now())
     ON CONFLICT (student_id, period_month)
     DO UPDATE SET status = 'certified', total_hours = $3, certified_by = $4, certified_at = now()
     RETURNING *`,
    [studentId, `${monthStr}-01`, dtr.grandTotal, inChargeUserId],
  );

  return rows[0];
}

/**
 * Reverts a certified month back to 'draft' — required before any
 * correction can be made to attendance within that month. Whoever
 * uncertifies must re-certify afterward once corrections are done.
 */
async function uncertifyDTR(studentId, monthStr, inChargeUserId) {
  await assertStudentBelongsToInCharge(studentId, inChargeUserId);

  const { rows } = await pool.query(
    `UPDATE dtr_periods
     SET status = 'draft', certified_by = NULL, certified_at = NULL
     WHERE student_id = $1 AND period_month = $2
     RETURNING *`,
    [studentId, `${monthStr}-01`],
  );

  if (rows.length === 0) {
    throw new InChargeError("This month was not certified yet.", 400);
  }

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
