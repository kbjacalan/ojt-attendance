const TIME_FIELDS = ["amStart", "amEnd", "pmStart", "pmEnd"];
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function toMinutes(time24) {
  const [h, m] = time24.split(":").map(Number);
  return h * 60 + m;
}

function to12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}

function validateOfficialHours(times) {
  for (const field of TIME_FIELDS) {
    const value = times[field];
    if (!value || !TIME_PATTERN.test(value)) {
      return `${field} is required and must be a valid HH:MM time.`;
    }
  }

  const amStart = toMinutes(times.amStart);
  const amEnd = toMinutes(times.amEnd);
  const pmStart = toMinutes(times.pmStart);
  const pmEnd = toMinutes(times.pmEnd);

  if (amEnd <= amStart) {
    return "amEnd must be after amStart.";
  }
  if (pmEnd <= pmStart) {
    return "pmEnd must be after pmStart.";
  }
  if (pmStart < amEnd) {
    return "pmStart cannot be before amEnd.";
  }

  return null;
}

function buildOfficialHoursText({ amStart, amEnd, pmStart, pmEnd }) {
  const parts = [];
  if (amStart && amEnd) {
    parts.push(`Morning: ${to12Hour(amStart)} - ${to12Hour(amEnd)}`);
  }
  if (pmStart && pmEnd) {
    parts.push(`Afternoon: ${to12Hour(pmStart)} - ${to12Hour(pmEnd)}`);
  }
  return parts.join("  |  ");
}

module.exports = {
  TIME_FIELDS,
  validateOfficialHours,
  buildOfficialHoursText,
};
