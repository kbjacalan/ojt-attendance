/**
 * Mirrors backend/src/utils/duty.js's computeDutyStatus(), but reads
 * from a DTR "day" object as returned by GET /api/dtr (amIn/amOut/
 * pmIn/pmOut/otIn/otOut as "HH:MM" strings or "") instead of raw
 * attendance_logs timestamps. Lets the student Attendance page show
 * today's live status without needing a separate endpoint.
 */
export function computeDutyStatusFromDay(day) {
  if (!day) {
    return { status: "no_record", lastPunchLabel: null, lastPunchTime: null };
  }

  const periods = [
    ["amIn", "AM Time In"],
    ["amOut", "AM Time Out"],
    ["pmIn", "PM Time In"],
    ["pmOut", "PM Time Out"],
    ["otIn", "OT Time In"],
    ["otOut", "OT Time Out"],
  ];

  const openSessions = [
    ["amIn", "amOut"],
    ["pmIn", "pmOut"],
    ["otIn", "otOut"],
  ];

  let hasOpenSession = false;
  let hasAnyCompleted = false;
  for (const [inKey, outKey] of openSessions) {
    if (day[inKey] && !day[outKey]) hasOpenSession = true;
    if (day[inKey] && day[outKey]) hasAnyCompleted = true;
  }

  // Values are "HH:MM" with no date attached, but punches are recorded
  // in chronological order through the day, so the last non-empty one
  // in period order is the most recent punch.
  let lastPunchLabel = null;
  let lastPunchTime = null;
  for (const [key, label] of periods) {
    if (day[key]) {
      lastPunchLabel = label;
      lastPunchTime = day[key];
    }
  }

  let status;
  if (hasOpenSession) status = "open_session";
  else if (hasAnyCompleted) status = "completed";
  else status = "no_record";

  return { status, lastPunchLabel, lastPunchTime };
}

/** Day-of-month in Asia/Manila, regardless of the device's local timezone. */
export function getManilaDayNumber(date = new Date()) {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      day: "numeric",
    }).format(date),
    10,
  );
}

/** Hour and minute (0-23 / 0-59) in Asia/Manila. */
function getManilaHourMinute(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour").value, 10) % 24;
  const minute = parseInt(parts.find((p) => p.type === "minute").value, 10);
  return { hour, minute };
}

// Mirrors backend/src/utils/time.js's PERIOD_WINDOW_CLOSE_HOUR. Kept in
// sync manually since the frontend and backend don't share code — if
// CAAP's official hours change, update both.
const PERIOD_WINDOW_CLOSE_HOUR = { morning: 12, afternoon: 17 };

// Mirrors backend/src/utils/time.js's GRACE_MINUTES: a punch at
// exactly 12:00:xx or 5:00:xx still counts as on time. The window is
// only truly closed once the clock reads :01 past the cutoff hour.
const GRACE_MINUTES = 1;

/**
 * True once a period's punch window has closed for the day. Used to
 * tell the difference between "not yet timed in, still time to" and
 * "missed it" so the UI can stop offering a self-service punch for
 * the latter before the student even taps anything. Minute-precision
 * with a 1-minute grace period — see GRACE_MINUTES above.
 */
export function isPeriodWindowClosed(period, date = new Date()) {
  const closeHour = PERIOD_WINDOW_CLOSE_HOUR[period];
  if (closeHour == null) return false;
  const { hour, minute } = getManilaHourMinute(date);
  const nowMinutes = hour * 60 + minute;
  const closeMinutes = closeHour * 60 + GRACE_MINUTES;
  return nowMinutes >= closeMinutes;
}

/**
 * Minutes remaining before a still-open period's window closes, or
 * `null` if the period has no window, has already closed, or hasn't
 * started. Powers a "closing soon" nudge so a student can be warned
 * *before* a punch is missed, rather than only finding out after.
 * Targets the true closing instant (cutoff hour + grace minute), so
 * the countdown lines up with isPeriodWindowClosed above.
 */
export function getMinutesUntilPeriodClose(period, date = new Date()) {
  const closeHour = PERIOD_WINDOW_CLOSE_HOUR[period];
  if (closeHour == null) return null;
  const { hour, minute } = getManilaHourMinute(date);
  const remaining = closeHour * 60 + GRACE_MINUTES - (hour * 60 + minute);
  return remaining > 0 ? remaining : null;
}

/**
 * Lists any periods today that were missed outright: the window
 * closed with no time-in at all, or with a time-in but no time-out.
 * These can no longer be self-served — punching now would just record
 * the current moment in the wrong slot — so the UI should surface
 * them as "see your in-charge/admin" rather than as tappable actions.
 *
 * Returns an array of `{ period: 'morning' | 'afternoon', type: 'in' | 'out' }`.
 */
export function getMissedPeriods(todayDay, date = new Date()) {
  const missed = [];
  const periods = [
    { value: "morning", inKey: "amIn", outKey: "amOut" },
    { value: "afternoon", inKey: "pmIn", outKey: "pmOut" },
  ];

  for (const { value, inKey, outKey } of periods) {
    if (!isPeriodWindowClosed(value, date)) continue;
    const inTime = todayDay?.[inKey];
    const outTime = todayDay?.[outKey];
    if (!inTime) missed.push({ period: value, type: "in" });
    else if (!outTime) missed.push({ period: value, type: "out" });
  }

  return missed;
}
