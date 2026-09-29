const MANILA_TZ = "Asia/Manila";

export function getManilaDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getManilaMinutesSinceMidnight(date = new Date()) {
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  let [hour, minute] = timeStr.split(":").map((part) => parseInt(part, 10));
  if (hour === 24) hour = 0;
  return hour * 60 + minute;
}

export function getManilaMonthString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}
