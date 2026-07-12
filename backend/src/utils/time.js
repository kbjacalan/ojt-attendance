const MANILA_TZ = "Asia/Manila";

/**
 * Returns the current date as YYYY-MM-DD in Manila time.
 * Used as the key for the attendance_logs.log_date column,
 * so a student in Dipolog always logs against the correct
 * calendar day even if the server runs in UTC.
 */
function getManilaDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // en-CA locale formats as YYYY-MM-DD
}

/**
 * Returns the current hour (0-23) in Manila time.
 * Used to decide which attendance slot (morning/afternoon/overtime)
 * a time-in or time-out attempt belongs to.
 */
function getManilaHour(date = new Date()) {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  // "24" can appear for midnight in some environments; normalize to 0
  const hour = parseInt(hourStr, 10);
  return hour === 24 ? 0 : hour;
}

/**
 * Determines which attendance period the current Manila time falls into.
 * Adjust these boundaries to match CAAP's actual official hours later.
 */
function getCurrentPeriod(date = new Date()) {
  const hour = getManilaHour(date);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "overtime";
}

/**
 * Difference in hours (decimal) between two JS Date/timestamp values.
 * Used to compute total_hours per segment (morning/afternoon/overtime).
 */
function hoursBetween(startDate, endDate) {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(ms / (1000 * 60 * 60), 0);
}

/**
 * Returns the current minute (0-59) in Manila time. Paired with
 * getManilaHour to give minute-precision for the grace period below —
 * hour-only precision would treat 12:00:00 and 12:59:59 identically.
 */
function getManilaMinute(date = new Date()) {
  const minuteStr = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    minute: "2-digit",
  }).format(date);
  return parseInt(minuteStr, 10);
}

// The hour (Manila time, 24h) at which each selectable period's punch
// window closes. Kept alongside getCurrentPeriod's boundaries above so
// the two never drift apart: morning closes when the day rolls into
// "afternoon" (hour 12), afternoon closes when it rolls into
// "overtime" (hour 17).
const PERIOD_WINDOW_CLOSE_HOUR = {
  morning: 12,
  afternoon: 17,
};

// A 1-minute grace period on the official cutoff: a punch at exactly
// 12:00:00-12:00:59 (or 5:00:00-5:00:59) still counts as on time, so a
// student isn't penalized for landing exactly on the hour. The window
// is only truly closed once the clock reads :01 past the cutoff hour.
const GRACE_MINUTES = 1;

/**
 * True once a period's punch window has closed for the day, i.e. it's
 * no longer possible to have genuinely been on duty for that period.
 * Used to tell a real "I forgot to punch" situation (window closed,
 * nothing recorded) apart from a punch that's simply still in
 * progress. Minute-precision with a 1-minute grace period — see
 * GRACE_MINUTES above.
 */
function isPeriodWindowClosed(period, date = new Date()) {
  const closeHour = PERIOD_WINDOW_CLOSE_HOUR[period];
  if (closeHour == null) return false;
  const nowMinutes = getManilaHour(date) * 60 + getManilaMinute(date);
  const closeMinutes = closeHour * 60 + GRACE_MINUTES;
  return nowMinutes >= closeMinutes;
}

module.exports = {
  getManilaDateString,
  getManilaHour,
  getCurrentPeriod,
  hoursBetween,
  isPeriodWindowClosed,
  MANILA_TZ,
};
