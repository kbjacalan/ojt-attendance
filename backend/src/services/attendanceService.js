const pool = require("../config/db");
const { isWithinGeofence } = require("../utils/geo");
const {
  getManilaDateString,
  hoursBetween,
  isPeriodWindowClosed,
} = require("../utils/time");
const { syncOjtStatus } = require("./userService");

const PERIOD_LABEL = { morning: "morning (AM)", afternoon: "afternoon (PM)" };

// Periods a student can explicitly punch against via the self-service
// Time In / Time Out flow. 'overtime' still exists as a column/concept
// for admin corrections, but isn't offered in the student's AM/PM
// dropdown — OT is logged manually by staff.
const SELECTABLE_PERIODS = ["morning", "afternoon"];

// Maps a period name to its corresponding DB columns
const PERIOD_COLUMNS = {
  morning: {
    in: "am_time_in",
    out: "am_time_out",
    inLat: "am_in_lat",
    inLng: "am_in_lng",
    outLat: "am_out_lat",
    outLng: "am_out_lng",
  },
  afternoon: {
    in: "pm_time_in",
    out: "pm_time_out",
    inLat: "pm_in_lat",
    inLng: "pm_in_lng",
    outLat: "pm_out_lat",
    outLng: "pm_out_lng",
  },
  overtime: {
    in: "ot_time_in",
    out: "ot_time_out",
    inLat: null,
    inLng: null,
    outLat: null,
    outLng: null,
  },
};

/**
 * Fetches the student's assigned agency (for geofence coordinates).
 */
async function getStudentAgency(studentId) {
  const { rows } = await pool.query(
    `SELECT sp.id AS student_id, a.id AS agency_id, a.name, a.latitude, a.longitude, a.radius_meters
     FROM student_profiles sp
     JOIN agencies a ON a.id = sp.agency_id
     WHERE sp.id = $1`,
    [studentId],
  );
  if (rows.length === 0) {
    throw new AttendanceError("Student is not assigned to an agency.", 400);
  }
  return rows[0];
}

/**
 * Fetches (or lazily creates) today's attendance_logs row for a student.
 */
async function getOrCreateTodayLog(studentId, agencyId) {
  const today = getManilaDateString();

  const existing = await pool.query(
    `SELECT * FROM attendance_logs WHERE student_id = $1 AND log_date = $2`,
    [studentId, today],
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const inserted = await pool.query(
    `INSERT INTO attendance_logs (student_id, agency_id, log_date, status)
     VALUES ($1, $2, $3, 'present')
     RETURNING *`,
    [studentId, agencyId, today],
  );
  return inserted.rows[0];
}

/**
 * Returns the public geofence info (name + coordinates + radius) for a
 * student's assigned agency — used by the student Attendance page to
 * render the live location map. Throws the same "not assigned" error
 * as timeIn/timeOut if the student has no agency yet.
 */
async function getMyAgencyGeofence(studentId) {
  const agency = await getStudentAgency(studentId);
  return {
    name: agency.name,
    latitude: parseFloat(agency.latitude),
    longitude: parseFloat(agency.longitude),
    radiusMeters: agency.radius_meters,
  };
}

class AttendanceError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Handles a TIME IN request.
 * Validates geofence and the requested period (morning/afternoon, chosen
 * by the student via the AM/PM dropdown), and fills the matching
 * *_time_in column if not already set. The timestamp written is always
 * the actual current time — only which column it lands in is chosen
 * by the student.
 */
async function timeIn({ studentId, latitude, longitude, period }) {
  if (!SELECTABLE_PERIODS.includes(period)) {
    throw new AttendanceError(
      "period must be 'morning' (AM) or 'afternoon' (PM).",
      400,
    );
  }

  const agency = await getStudentAgency(studentId);

  const { withinRadius, distanceMeters } = isWithinGeofence(
    latitude,
    longitude,
    agency.latitude,
    agency.longitude,
    agency.radius_meters,
  );

  if (!withinRadius) {
    throw new AttendanceError(
      `You are ${distanceMeters}m away from ${agency.name}. You must be within ${agency.radius_meters}m to time in.`,
      403,
    );
  }

  const log = await getOrCreateTodayLog(studentId, agency.agency_id);
  const cols = PERIOD_COLUMNS[period];

  if (log[cols.in]) {
    throw new AttendanceError(
      `You have already timed in for the ${period} period today.`,
      409,
    );
  }

  // Once a period's window has closed with no time-in recorded, we
  // can no longer trust "time in now" to reflect when the student
  // actually started — it would just backfill the current moment into
  // an earlier slot. Rather than let that stand as an inaccurate
  // record, stop it here and point the student to a human who can
  // verify and correct it.
  if (isPeriodWindowClosed(period)) {
    throw new AttendanceError(
      `You missed the time-in window for the ${PERIOD_LABEL[period]} period. Please see your agency in-charge or the OJT admin to have today's attendance corrected.`,
      409,
      "PERIOD_MISSED",
    );
  }

  const now = new Date();
  const setClauses = [`${cols.in} = $1`];
  const values = [now];
  let paramIndex = 2;

  if (cols.inLat) {
    setClauses.push(
      `${cols.inLat} = $${paramIndex++}`,
      `${cols.inLng} = $${paramIndex++}`,
    );
    values.push(latitude, longitude);
  }

  values.push(log.id);

  const { rows } = await pool.query(
    `UPDATE attendance_logs SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = $${paramIndex}
     RETURNING *`,
    values,
  );

  return { period, distanceMeters, log: rows[0] };
}

/**
 * Handles a TIME OUT request.
 * Requires a matching time-in for the same student-selected period to
 * already exist. Recomputes total_hours for the day after writing the
 * time-out.
 */
async function timeOut({ studentId, latitude, longitude, period }) {
  if (!SELECTABLE_PERIODS.includes(period)) {
    throw new AttendanceError(
      "period must be 'morning' (AM) or 'afternoon' (PM).",
      400,
    );
  }

  const agency = await getStudentAgency(studentId);

  const { withinRadius, distanceMeters } = isWithinGeofence(
    latitude,
    longitude,
    agency.latitude,
    agency.longitude,
    agency.radius_meters,
  );

  if (!withinRadius) {
    throw new AttendanceError(
      `You are ${distanceMeters}m away from ${agency.name}. You must be within ${agency.radius_meters}m to time out.`,
      403,
    );
  }

  const log = await getOrCreateTodayLog(studentId, agency.agency_id);
  const cols = PERIOD_COLUMNS[period];

  if (!log[cols.in]) {
    throw new AttendanceError(
      `You haven't timed in for the ${period} period yet.`,
      409,
    );
  }
  if (log[cols.out]) {
    throw new AttendanceError(
      `You have already timed out for the ${period} period today.`,
      409,
    );
  }

  // Same reasoning as the time-in guard above: once the period's
  // window has closed, a time-out submitted now can't reflect when
  // the student actually left. Leave the record open and route them
  // to a human correction instead of writing an inaccurate time.
  if (isPeriodWindowClosed(period)) {
    throw new AttendanceError(
      `You missed the time-out window for the ${PERIOD_LABEL[period]} period. Please see your agency in-charge or the OJT admin to have today's attendance corrected.`,
      409,
      "PERIOD_MISSED",
    );
  }

  const now = new Date();
  const setClauses = [`${cols.out} = $1`];
  const values = [now];
  let paramIndex = 2;

  if (cols.outLat) {
    setClauses.push(
      `${cols.outLat} = $${paramIndex++}`,
      `${cols.outLng} = $${paramIndex++}`,
    );
    values.push(latitude, longitude);
  }

  values.push(log.id);

  const { rows } = await pool.query(
    `UPDATE attendance_logs SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = $${paramIndex}
     RETURNING *`,
    values,
  );

  const updatedLog = rows[0];
  const totalHours = computeTotalHours(updatedLog);

  const final = await pool.query(
    `UPDATE attendance_logs SET total_hours = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [totalHours, updatedLog.id],
  );

  // A time-out just added hours toward the student's requirement —
  // check whether they've now hit (or, on a later correction, fallen
  // back below) their required_hours.
  await syncOjtStatus(studentId);

  return { period, distanceMeters, log: final.rows[0] };
}

/**
 * Sums completed in/out pairs across morning, afternoon, and overtime.
 * Incomplete pairs (e.g. timed in but not yet out) contribute 0 until closed.
 */
function computeTotalHours(log) {
  let total = 0;
  if (log.am_time_in && log.am_time_out)
    total += hoursBetween(log.am_time_in, log.am_time_out);
  if (log.pm_time_in && log.pm_time_out)
    total += hoursBetween(log.pm_time_in, log.pm_time_out);
  if (log.ot_time_in && log.ot_time_out)
    total += hoursBetween(log.ot_time_in, log.ot_time_out);
  return Math.round(total * 100) / 100;
}

/**
 * Converts a "HH:MM" string on a given date into a proper UTC-backed
 * Date object anchored to Asia/Manila time — so a correction entered
 * as "8:00" for July 7 is stored as 8:00 AM Manila time, regardless of
 * what timezone the server itself runs in.
 */
function manilaTimeToDate(dateStr, timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":");
  return new Date(
    `${dateStr}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00+08:00`,
  );
}

/**
 * Allows an in-charge or admin to manually correct a student's
 * attendance for a specific day — e.g. a missed time-out, a GPS
 * rejection that should have succeeded, or a forgotten log entirely.
 *
 * Refuses to edit a day that falls inside an already-certified DTR
 * period, since that would silently change a signed-off official
 * record. The caller must uncertify that month first.
 *
 * `times` may include any of: amIn, amOut, pmIn, pmOut, otIn, otOut
 * (as "HH:MM" strings, or null/omitted to clear a field).
 * `remarks` is a free-text explanation, required for accountability.
 */
async function correctAttendanceLog({
  studentId,
  dateStr,
  times,
  remarks,
  correctedByUserId,
}) {
  if (!remarks || !remarks.trim()) {
    throw new AttendanceError(
      "A remark explaining the correction is required.",
      400,
    );
  }

  const monthStr = dateStr.slice(0, 7); // 'YYYY-MM'
  const periodCheck = await pool.query(
    `SELECT status FROM dtr_periods WHERE student_id = $1 AND period_month = $2`,
    [studentId, `${monthStr}-01`],
  );
  if (
    periodCheck.rows.length > 0 &&
    periodCheck.rows[0].status === "certified"
  ) {
    throw new AttendanceError(
      "This month has already been certified. Uncertify it first before making corrections.",
      409,
    );
  }

  const agencyResult = await pool.query(
    `SELECT agency_id FROM student_profiles WHERE id = $1`,
    [studentId],
  );
  if (agencyResult.rows.length === 0) {
    throw new AttendanceError("Student not found.", 404);
  }
  const agencyId = agencyResult.rows[0].agency_id;

  const existing = await pool.query(
    `SELECT * FROM attendance_logs WHERE student_id = $1 AND log_date = $2`,
    [studentId, dateStr],
  );

  let log;
  if (existing.rows.length > 0) {
    log = existing.rows[0];
  } else {
    const inserted = await pool.query(
      `INSERT INTO attendance_logs (student_id, agency_id, log_date, status)
       VALUES ($1, $2, $3, 'present')
       RETURNING *`,
      [studentId, agencyId, dateStr],
    );
    log = inserted.rows[0];
  }

  const updatedTimes = {
    am_time_in:
      "amIn" in times ? manilaTimeToDate(dateStr, times.amIn) : log.am_time_in,
    am_time_out:
      "amOut" in times
        ? manilaTimeToDate(dateStr, times.amOut)
        : log.am_time_out,
    pm_time_in:
      "pmIn" in times ? manilaTimeToDate(dateStr, times.pmIn) : log.pm_time_in,
    pm_time_out:
      "pmOut" in times
        ? manilaTimeToDate(dateStr, times.pmOut)
        : log.pm_time_out,
    ot_time_in:
      "otIn" in times ? manilaTimeToDate(dateStr, times.otIn) : log.ot_time_in,
    ot_time_out:
      "otOut" in times
        ? manilaTimeToDate(dateStr, times.otOut)
        : log.ot_time_out,
  };

  const totalHours = computeTotalHours(updatedTimes);
  const combinedRemarks = log.remarks
    ? `${log.remarks}\n[Correction] ${remarks.trim()}`
    : `[Correction] ${remarks.trim()}`;

  const { rows } = await pool.query(
    `UPDATE attendance_logs
     SET am_time_in = $1, am_time_out = $2, pm_time_in = $3, pm_time_out = $4,
         ot_time_in = $5, ot_time_out = $6, total_hours = $7, status = 'present',
         remarks = $8, updated_at = now()
     WHERE id = $9
     RETURNING *`,
    [
      updatedTimes.am_time_in,
      updatedTimes.am_time_out,
      updatedTimes.pm_time_in,
      updatedTimes.pm_time_out,
      updatedTimes.ot_time_in,
      updatedTimes.ot_time_out,
      totalHours,
      combinedRemarks,
      log.id,
    ],
  );

  // A correction can move total hours up or down, so re-check
  // completion both ways (see syncOjtStatus for why it never auto-drops).
  await syncOjtStatus(studentId);

  return rows[0];
}

module.exports = {
  timeIn,
  timeOut,
  correctAttendanceLog,
  getMyAgencyGeofence,
  AttendanceError,
};
