const BATCH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function isBatch(value) {
  return typeof value === "string" && BATCH_RE.test(value);
}

function isDateString(value) {
  return typeof value === "string" && DATE_RE.test(value);
}

function isTimeString(value) {
  return typeof value === "string" && TIME_RE.test(value);
}

function isMonthString(value) {
  return typeof value === "string" && MONTH_RE.test(value);
}

function isPositiveNumber(value) {
  if (value === undefined || value === null || value === "") return false;
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

function isOptionalPositiveNumber(value) {
  if (value === undefined || value === null || value === "") return true;
  return isPositiveNumber(value);
}

module.exports = {
  isBatch,
  isDateString,
  isTimeString,
  isMonthString,
  isPositiveNumber,
  isOptionalPositiveNumber,
};
