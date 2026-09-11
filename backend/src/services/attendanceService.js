const pool = require("../config/db");
const { isWithinGeofence } = require("../utils/geo");
const { getManilaDateString, hoursBetween } = require("../utils/time");
const { syncOjtStatus } = require("./userService");
const { getTodayRequest } = require("./otRequestService");

const SELECTABLE_PERIODS = ["morning", "afternoon", "overtime"];

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

class AttendanceError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function getStudentAgency(studentId) {
  const { rows } = await pool.query(
    `SELECT sp.id AS student_id, sp.am_start, sp.am_end, sp.pm_start, sp.pm_end,
            a.id AS agency_id, a.name, a.latitude, a.longitude, a.radius_meters
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

function scheduleFrom(agency) {
  return {
    amStart: agency.am_start,
    amEnd: agency.am_end,
    pmStart: agency.pm_start,
    pmEnd: agency.pm_end,
  };
}

function requireCompleteSchedule(agency) {
  const schedule = scheduleFrom(agency);
  const missing = Object.values(schedule).some((value) => !value);
  if (missing) {
    throw new AttendanceError(
      "Your official hours haven't been set up yet. Please contact your OJT admin before timing in or out.",
      409,
      "SCHEDULE_INCOMPLETE",
    );
  }
  return schedule;
}

/**
 * Overtime has no fixed daily schedule — it requires an approved
 * ot_requests row for today before a student can time in or out.
 */
async function requireApprovedOvertimeWindow(studentId) {
  const request = await getTodayRequest(studentId);
  if (!request || request.status !== "approved") {
    throw new AttendanceError(
      "You don't have an approved overtime request for today. Ask your in-charge to approve one first.",
      409,
      "OT_NOT_APPROVED",
    );
  }
  return {
    otStart: request.approved_start.slice(0, 5),
    otEnd: request.approved_end.slice(0, 5),
  };
}

async function resolveScheduleForPeriod(period, agency, studentId) {
  if (period === "overtime") {
    return requireApprovedOvertimeWindow(studentId);
  }
  return requireCompleteSchedule(agency);
}

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

async function getMyAgencyGeofence(studentId) {
  const agency = await getStudentAgency(studentId);
  return {
    name: agency.name,
    latitude: parseFloat(agency.latitude),
    longitude: parseFloat(agency.longitude),
    radiusMeters: agency.radius_meters,
  };
}

async function timeIn({ studentId, latitude, longitude, period }) {
  if (!SELECTABLE_PERIODS.includes(period)) {
    throw new AttendanceError(
      "period must be 'morning' (AM), 'afternoon' (PM), or 'overtime' (OT).",
      400,
    );
  }

  const agency = await getStudentAgency(studentId);
  await resolveScheduleForPeriod(period, agency, studentId);

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

async function timeOut({ studentId, latitude, longitude, period }) {
  if (!SELECTABLE_PERIODS.includes(period)) {
    throw new AttendanceError(
      "period must be 'morning' (AM), 'afternoon' (PM), or 'overtime' (OT).",
      400,
    );
  }

  const agency = await getStudentAgency(studentId);
  await resolveScheduleForPeriod(period, agency, studentId);

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

  await syncOjtStatus(studentId);

  return { period, distanceMeters, log: final.rows[0] };
}

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

function manilaTimeToDate(dateStr, timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":");
  return new Date(
    `${dateStr}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00+08:00`,
  );
}

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

  const monthStr = dateStr.slice(0, 7);
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
      "otOut" in times ? manilaTimeToDate(dateStr, times.otOut) : log.ot_time_out,
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
