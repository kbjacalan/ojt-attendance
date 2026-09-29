const MANILA_TZ = "Asia/Manila";

function getCurrentMonthStr(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

function getMonthBounds(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;
  return { year, month, daysInMonth, monthStart, monthEnd };
}

function toManilaTimeString(date) {
  if (!date) return "";
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  const minute = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    minute: "2-digit",
  }).format(date);
  const h = hour === "24" ? "00" : hour.padStart(2, "0");
  return `${h}:${minute.padStart(2, "0")}`;
}

function toHHMM(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

module.exports = {
  MANILA_TZ,
  getCurrentMonthStr,
  getMonthBounds,
  toManilaTimeString,
  toHHMM,
};
