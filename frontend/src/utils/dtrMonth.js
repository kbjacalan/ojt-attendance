export function formatPunchedMonthLabel(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-").map(Number);
  if (!year || !month) return monthStr;
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Bounded month step within a punched-months list (newest first).
 * delta -1 = older, +1 = newer. Returns current when out of bounds.
 */
export function shiftPunchedMonth(months, current, delta) {
  const idx = months.indexOf(current);
  if (idx === -1) return current;
  // months[0] is newest: older => idx + 1, newer => idx - 1
  const next = delta < 0 ? idx + 1 : idx - 1;
  if (next < 0 || next >= months.length) return current;
  return months[next];
}
