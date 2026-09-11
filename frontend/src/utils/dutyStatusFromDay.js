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
  let hasAnyPunch = false;
  for (const [inKey, outKey] of openSessions) {
    if (day[inKey] && !day[outKey]) hasOpenSession = true;
    if (day[inKey]) hasAnyPunch = true;
  }

  const afternoonComplete = Boolean(day.pmIn && day.pmOut);

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
    schedule?.amStart && schedule?.amEnd && schedule?.pmStart && schedule?.pmEnd,
  );
}
