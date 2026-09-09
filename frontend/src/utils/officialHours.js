export function to12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

export function buildOfficialHoursText({ amStart, amEnd, pmStart, pmEnd }) {
  const parts = [];
  if (amStart && amEnd) {
    parts.push(`Morning: ${to12Hour(amStart)} - ${to12Hour(amEnd)}`);
  }
  if (pmStart && pmEnd) {
    parts.push(`Afternoon: ${to12Hour(pmStart)} - ${to12Hour(pmEnd)}`);
  }
  return parts.join("  |  ");
}

function toMinutes(time24) {
  const [h, m] = time24.split(":").map(Number);
  return h * 60 + m;
}

export function validateOfficialHours({ amStart, amEnd, pmStart, pmEnd }) {
  if (!amStart || !amEnd || !pmStart || !pmEnd) {
    return "All four official hours fields are required.";
  }
  if (toMinutes(amEnd) <= toMinutes(amStart)) {
    return "Morning Time Out must be after Morning Time In.";
  }
  if (toMinutes(pmEnd) <= toMinutes(pmStart)) {
    return "Afternoon Time Out must be after Afternoon Time In.";
  }
  if (toMinutes(pmStart) < toMinutes(amEnd)) {
    return "Afternoon Time In cannot be before Morning Time Out.";
  }
  return null;
}
