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

function hoursBetween(startDate, endDate) {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(ms / (1000 * 60 * 60), 0);
}

module.exports = {
  getManilaDateString,
  getManilaHour,
  hoursBetween,
  MANILA_TZ,
};
