const MANILA_TZ = "Asia/Manila";

function getManilaDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getManilaHour(date = new Date()) {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  const hour = parseInt(hourStr, 10);
  return hour === 24 ? 0 : hour;
}

function getManilaMinute(date = new Date()) {
  const minuteStr = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    minute: "2-digit",
  }).format(date);
  return parseInt(minuteStr, 10);
}

function hoursBetween(startDate, endDate) {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(ms / (1000 * 60 * 60), 0);
}

function timeStringToMinutes(value) {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

const GRACE_MINUTES = 10;

const PERIOD_BOUNDS = {
  morning: { startKey: "amStart", endKey: "amEnd" },
  afternoon: { startKey: "pmStart", endKey: "pmEnd" },
};

function isPeriodWindowOpen(period, schedule, date = new Date()) {
  const bounds = PERIOD_BOUNDS[period];
  if (!bounds) return false;
  const startMinutes = timeStringToMinutes(schedule?.[bounds.startKey]);
  if (startMinutes == null) return false;
  const nowMinutes = getManilaHour(date) * 60 + getManilaMinute(date);
  return nowMinutes >= startMinutes - GRACE_MINUTES;
}

function isPeriodWindowClosed(period, schedule, date = new Date()) {
  const bounds = PERIOD_BOUNDS[period];
  if (!bounds) return false;
  const endMinutes = timeStringToMinutes(schedule?.[bounds.endKey]);
  if (endMinutes == null) return false;
  const nowMinutes = getManilaHour(date) * 60 + getManilaMinute(date);
  return nowMinutes >= endMinutes + GRACE_MINUTES;
}

module.exports = {
  getManilaDateString,
  getManilaHour,
  hoursBetween,
  isPeriodWindowOpen,
  isPeriodWindowClosed,
  GRACE_MINUTES,
  MANILA_TZ,
};
