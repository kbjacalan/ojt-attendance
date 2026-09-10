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

export function getManilaDayNumber(date = new Date()) {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      day: "numeric",
    }).format(date),
    10,
  );
}

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

function timeStringToMinutes(value) {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export const GRACE_MINUTES = 10;

const PERIOD_BOUNDS = {
  morning: { startKey: "amStart", endKey: "amEnd" },
  afternoon: { startKey: "pmStart", endKey: "pmEnd" },
  overtime: { startKey: "otStart", endKey: "otEnd" },
};

export function isPeriodWindowOpen(period, schedule, date = new Date()) {
  const bounds = PERIOD_BOUNDS[period];
  if (!bounds) return false;
  const startMinutes = timeStringToMinutes(schedule?.[bounds.startKey]);
  if (startMinutes == null) return false;
  const { hour, minute } = getManilaHourMinute(date);
  const nowMinutes = hour * 60 + minute;
  return nowMinutes >= startMinutes - GRACE_MINUTES;
}

export function isPeriodWindowClosed(period, schedule, date = new Date()) {
  const bounds = PERIOD_BOUNDS[period];
  if (!bounds) return false;
  const endMinutes = timeStringToMinutes(schedule?.[bounds.endKey]);
  if (endMinutes == null) return false;
  const { hour, minute } = getManilaHourMinute(date);
  const nowMinutes = hour * 60 + minute;
  return nowMinutes >= endMinutes + GRACE_MINUTES;
}

export function getMinutesUntilPeriodClose(period, schedule, date = new Date()) {
  const bounds = PERIOD_BOUNDS[period];
  if (!bounds) return null;
  const endMinutes = timeStringToMinutes(schedule?.[bounds.endKey]);
  if (endMinutes == null) return null;
  const { hour, minute } = getManilaHourMinute(date);
  const remaining = endMinutes + GRACE_MINUTES - (hour * 60 + minute);
  return remaining > 0 ? remaining : null;
}

export function getMissedPeriods(todayDay, schedule, date = new Date()) {
  const missed = [];
  const periods = [
    { value: "morning", inKey: "amIn", outKey: "amOut" },
    { value: "afternoon", inKey: "pmIn", outKey: "pmOut" },
  ];

  // Overtime only has a window on days with an approved OT request, so
  // it's only checked (and can only be "missed") when the caller has
  // put otStart/otEnd on the schedule object for today.
  if (schedule?.otStart && schedule?.otEnd) {
    periods.push({ value: "overtime", inKey: "otIn", outKey: "otOut" });
  }

  for (const { value, inKey, outKey } of periods) {
    if (!isPeriodWindowClosed(value, schedule, date)) continue;
    const inTime = todayDay?.[inKey];
    const outTime = todayDay?.[outKey];
    if (!inTime) missed.push({ period: value, type: "in" });
    else if (!outTime) missed.push({ period: value, type: "out" });
  }

  return missed;
}

export function hasCompleteSchedule(schedule) {
  return Boolean(
    schedule?.amStart && schedule?.amEnd && schedule?.pmStart && schedule?.pmEnd,
  );
}
