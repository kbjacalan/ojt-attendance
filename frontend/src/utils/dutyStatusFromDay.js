import { getManilaMinutesSinceMidnight } from "./manilaDate";
import { minutesFromHHMM } from "./officialHours";

export function computeDutyStatusFromDay(day, { pmEnd, isToday = true } = {}) {
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
  let hasAnyPunch = false;
  for (const [inKey, outKey] of openSessions) {
    if (day[inKey] && !day[outKey]) hasOpenSession = true;
    if (day[inKey]) hasAnyPunch = true;
  }

  const afternoonComplete = Boolean(day.pmIn && day.pmOut);
  const morningStarted = Boolean(day.amIn);
  const morningComplete = Boolean(day.amIn && day.amOut);
  const afternoonStarted = Boolean(day.pmIn);

  const pmWindowHasPassed = isToday
    ? Boolean(pmEnd && getManilaMinutesSinceMidnight() > minutesFromHHMM(pmEnd))
    : true;

  let lastPunchLabel = null;
  let lastPunchTime = null;
  let lastPunchTimestamp = null;
  for (const [key, label] of periods) {
    if (day[key]) {
      const ts = new Date(day[key]);
      if (!lastPunchTimestamp || ts > lastPunchTimestamp) {
        lastPunchTimestamp = ts;
        lastPunchLabel = label;
        lastPunchTime = day[key];
      }
    }
  }

  let status;
  if (hasOpenSession) status = "open_session";
  else if (afternoonComplete && !morningStarted) status = "half_day";
  else if (morningComplete && !afternoonStarted && pmWindowHasPassed)
    status = "half_day_am";
  else if (afternoonComplete) status = "completed";
  else if (hasAnyPunch) status = "partial";
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

export function hasCompleteSchedule(schedule) {
  return Boolean(
    schedule?.amStart &&
    schedule?.amEnd &&
    schedule?.pmStart &&
    schedule?.pmEnd,
  );
}
