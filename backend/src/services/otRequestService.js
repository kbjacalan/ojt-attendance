const pool = require("../config/db");
const { getManilaDateString } = require("../utils/time");

class OTRequestError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function timeStringToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function isValidTimeString(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// Back-to-back is fine (e.g. OT starting the instant PM ends) — only a
// genuine overlap with official hours is rejected, hence strict "<"
// rather than "<=" on both sides.
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return (
    timeStringToMinutes(aStart) < timeStringToMinutes(bEnd) &&
    timeStringToMinutes(bStart) < timeStringToMinutes(aEnd)
  );
}

function assertNoOverlapWithOfficialHours(
  requestedStart,
  requestedEnd,
  schedule,
) {
  const { am_start, am_end, pm_start, pm_end } = schedule;

  if (
    am_start &&
    am_end &&
    rangesOverlap(requestedStart, requestedEnd, am_start, am_end)
  ) {
    throw new OTRequestError(
      `That overlaps your official morning hours (${am_start.slice(0, 5)}–${am_end.slice(0, 5)}). Overtime can't overlap your regular shift.`,
      400,
      "OT_OVERLAPS_OFFICIAL_HOURS",
    );
  }
  if (
    pm_start &&
    pm_end &&
    rangesOverlap(requestedStart, requestedEnd, pm_start, pm_end)
  ) {
    throw new OTRequestError(
      `That overlaps your official afternoon hours (${pm_start.slice(0, 5)}–${pm_end.slice(0, 5)}). Overtime can't overlap your regular shift.`,
      400,
      "OT_OVERLAPS_OFFICIAL_HOURS",
    );
  }
}

async function getStudentScheduleAndAgency(studentId) {
  const { rows } = await pool.query(
    `SELECT agency_id, am_start, am_end, pm_start, pm_end
     FROM student_profiles WHERE id = $1`,
    [studentId],
  );
  if (rows.length === 0 || !rows[0].agency_id) {
    throw new OTRequestError(
      "You haven't been assigned to an agency yet.",
      400,
    );
  }
  return rows[0];
}

/**
 * Creates a pending overtime request for today. Only one active
 * (pending/approved) request per student per day is allowed — enforced
 * both here (friendly error) and by a partial unique index in the DB
 * (defense against races).
 */
async function createRequest({
  studentId,
  requestedStart,
  requestedEnd,
  reason,
}) {
  if (!isValidTimeString(requestedStart) || !isValidTimeString(requestedEnd)) {
    throw new OTRequestError(
      "requestedStart and requestedEnd must be 'HH:MM' times.",
      400,
    );
  }
  if (
    timeStringToMinutes(requestedEnd) <= timeStringToMinutes(requestedStart)
  ) {
    throw new OTRequestError("requestedEnd must be after requestedStart.", 400);
  }

  const { agency_id: agencyId, ...schedule } =
    await getStudentScheduleAndAgency(studentId);
  assertNoOverlapWithOfficialHours(requestedStart, requestedEnd, schedule);
  const today = getManilaDateString();

  const existing = await pool.query(
    `SELECT id FROM ot_requests
     WHERE student_id = $1 AND request_date = $2 AND status IN ('pending', 'approved')`,
    [studentId, today],
  );
  if (existing.rows.length > 0) {
    throw new OTRequestError(
      "You already have an overtime request for today.",
      409,
      "OT_REQUEST_EXISTS",
    );
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO ot_requests (student_id, agency_id, request_date, requested_start, requested_end, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        studentId,
        agencyId,
        today,
        requestedStart,
        requestedEnd,
        reason || null,
      ],
    );
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw new OTRequestError(
        "You already have an overtime request for today.",
        409,
        "OT_REQUEST_EXISTS",
      );
    }
    throw err;
  }
}

/**
 * Returns the student's overtime request for today, or null if none
 * exists yet. Used by both the Attendance page (to show status/enable
 * the OT button) and attendanceService (to validate a punch).
 */
async function getTodayRequest(studentId) {
  const today = getManilaDateString();
  const { rows } = await pool.query(
    `SELECT * FROM ot_requests WHERE student_id = $1 AND request_date = $2
     ORDER BY created_at DESC LIMIT 1`,
    [studentId, today],
  );
  return rows[0] || null;
}

/**
 * Cancels a student's own pending request. Approved/rejected requests
 * can't be cancelled this way — once an in-charge has acted on it, the
 * record stays as history.
 */
async function cancelRequest({ studentId, requestId }) {
  const { rows } = await pool.query(
    `UPDATE ot_requests SET status = 'cancelled', updated_at = now()
     WHERE id = $1 AND student_id = $2 AND status = 'pending'
     RETURNING *`,
    [requestId, studentId],
  );
  if (rows.length === 0) {
    throw new OTRequestError(
      "This request can't be cancelled (it may already have been reviewed).",
      409,
    );
  }
  return rows[0];
}

/**
 * Lists pending overtime requests for every student under agencies
 * this in-charge manages, newest first.
 */
async function listPendingForInCharge(inChargeUserId) {
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name AS student_name, a.name AS agency_name
     FROM ot_requests r
     JOIN student_profiles sp ON sp.id = r.student_id
     JOIN users u ON u.id = sp.user_id
     JOIN agencies a ON a.id = r.agency_id
     WHERE a.in_charge_id = $1 AND r.status = 'pending'
     ORDER BY r.created_at ASC`,
    [inChargeUserId],
  );
  return rows;
}

async function assertRequestBelongsToInCharge(requestId, inChargeUserId) {
  const { rows } = await pool.query(
    `SELECT r.* FROM ot_requests r
     JOIN agencies a ON a.id = r.agency_id
     WHERE r.id = $1 AND a.in_charge_id = $2`,
    [requestId, inChargeUserId],
  );
  if (rows.length === 0) {
    throw new OTRequestError(
      "You do not have access to this overtime request.",
      403,
    );
  }
  return rows[0];
}

/**
 * Approves a pending request. The in-charge may narrow/adjust the
 * window (approvedStart/approvedEnd); if omitted, the student's
 * requested times are used as-is.
 */
async function approveRequest({
  requestId,
  inChargeUserId,
  approvedStart,
  approvedEnd,
  note,
}) {
  const request = await assertRequestBelongsToInCharge(
    requestId,
    inChargeUserId,
  );
  if (request.status !== "pending") {
    throw new OTRequestError("This request has already been reviewed.", 409);
  }

  const start = approvedStart || request.requested_start;
  const end = approvedEnd || request.requested_end;
  if (
    isValidTimeString(start) &&
    isValidTimeString(end) &&
    timeStringToMinutes(end) <= timeStringToMinutes(start)
  ) {
    throw new OTRequestError("approvedEnd must be after approvedStart.", 400);
  }

  const { agency_id: _agencyId, ...schedule } =
    await getStudentScheduleAndAgency(request.student_id);
  assertNoOverlapWithOfficialHours(start, end, schedule);

  const { rows } = await pool.query(
    `UPDATE ot_requests
     SET status = 'approved', approved_start = $1, approved_end = $2,
         reviewed_by = $3, reviewed_at = now(), review_note = $4, updated_at = now()
     WHERE id = $5
     RETURNING *`,
    [start, end, inChargeUserId, note || null, requestId],
  );
  return rows[0];
}

async function rejectRequest({ requestId, inChargeUserId, note }) {
  if (!note || !note.trim()) {
    throw new OTRequestError(
      "A note explaining the rejection is required.",
      400,
    );
  }

  const request = await assertRequestBelongsToInCharge(
    requestId,
    inChargeUserId,
  );
  if (request.status !== "pending") {
    throw new OTRequestError("This request has already been reviewed.", 409);
  }

  const { rows } = await pool.query(
    `UPDATE ot_requests
     SET status = 'rejected', reviewed_by = $1, reviewed_at = now(),
         review_note = $2, updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [inChargeUserId, note.trim(), requestId],
  );
  return rows[0];
}

module.exports = {
  createRequest,
  getTodayRequest,
  cancelRequest,
  listPendingForInCharge,
  approveRequest,
  rejectRequest,
  OTRequestError,
};
