const { toManilaTimeString } = require("./month");

/**
 * Computes a student's attendance status from their attendance_logs
 * row for a given day. Shared between the admin and in-charge student
 * list endpoints so "who's on duty" / "who attended" means the same
 * thing everywhere in the system.
 *
 * Returns a date-agnostic status — the caller (or frontend) decides
 * how to label it depending on whether the date is today or in the past:
 *   'open_session'  — has a time-in with no matching time-out yet.
 *   'completed'     — the afternoon (PM) shift has both a time-in and
 *                      time-out logged, and there's no open session.
 *   'half_day'      — PM fully closed out, no open session, but AM was
 *                      never punched in at all.
 *   'partial'       — at least one punch recorded, but PM isn't done yet.
 *   'no_record'     — no attendance row at all for that day.
 */
function computeDutyStatus(log) {
  if (!log) {
    return { status: "no_record", lastPunchLabel: null, lastPunchTime: null };
  }

  const periods = [
    ["am_time_in", "AM Time In"],
    ["am_time_out", "AM Time Out"],
    ["pm_time_in", "PM Time In"],
    ["pm_time_out", "PM Time Out"],
    ["ot_time_in", "OT Time In"],
    ["ot_time_out", "OT Time Out"],
  ];

  const openSessions = [
    ["am_time_in", "am_time_out"],
    ["pm_time_in", "pm_time_out"],
    ["ot_time_in", "ot_time_out"],
  ];

  let hasOpenSession = false;
  let hasAnyPunch = false;
  for (const [inCol, outCol] of openSessions) {
    if (log[inCol] && !log[outCol]) hasOpenSession = true;
    if (log[inCol]) hasAnyPunch = true;
  }

  const afternoonComplete = Boolean(log.pm_time_in && log.pm_time_out);
  const morningStarted = Boolean(log.am_time_in);

  // Find the most recent non-null punch, for the "last seen" label
  let lastPunchLabel = null;
  let lastPunchTimestamp = null;
  for (const [col, label] of periods) {
    if (log[col]) {
      const ts = new Date(log[col]);
      if (!lastPunchTimestamp || ts > lastPunchTimestamp) {
        lastPunchTimestamp = ts;
        lastPunchLabel = label;
      }
    }
  }

  const lastPunchTime = lastPunchTimestamp
    ? toManilaTimeString(lastPunchTimestamp)
    : null;

  let status;
  if (hasOpenSession) status = "open_session";
  else if (afternoonComplete && !morningStarted) status = "half_day";
  else if (afternoonComplete) status = "completed";
  else if (hasAnyPunch) status = "partial";
  else status = "no_record";

  return { status, lastPunchLabel, lastPunchTime };
}

module.exports = { computeDutyStatus };
