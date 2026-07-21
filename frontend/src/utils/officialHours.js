/** Converts "HH:MM" 24-hour string to "h:mm AM/PM". */
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

/** Converts "h:mm AM/PM" back to "HH:MM" 24-hour string. */
export function to24Hour(time12) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((time12 || "").trim());
  if (!match) return "";
  let [, hStr, mStr, period] = match;
  let h = parseInt(hStr, 10) % 12;
  if (period.toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${mStr}`;
}

/**
 * Builds the free-text "Official Hours" string shown on the DTR from
 * the four granular time-in/time-out picks (morning + afternoon).
 * Any block left blank is simply omitted from the summary.
 */
export function buildOfficialHoursText({
  morningIn,
  morningOut,
  afternoonIn,
  afternoonOut,
}) {
  const parts = [];
  if (morningIn && morningOut) {
    parts.push(`Morning: ${to12Hour(morningIn)} - ${to12Hour(morningOut)}`);
  }
  if (afternoonIn && afternoonOut) {
    parts.push(
      `Afternoon: ${to12Hour(afternoonIn)} - ${to12Hour(afternoonOut)}`,
    );
  }
  return parts.join("  |  ");
}

/**
 * Parses a previously-built Official Hours string back into the four
 * granular time fields, so the edit form can prefill from whatever was
 * set at signup instead of starting blank. Blocks that can't be parsed
 * (or are missing) come back as empty strings.
 */
export function parseOfficialHoursText(text) {
  const result = {
    morningIn: "",
    morningOut: "",
    afternoonIn: "",
    afternoonOut: "",
  };
  if (!text) return result;

  const morningMatch =
    /Morning:\s*([\d:]+\s*[AP]M)\s*-\s*([\d:]+\s*[AP]M)/i.exec(text);
  if (morningMatch) {
    result.morningIn = to24Hour(morningMatch[1]);
    result.morningOut = to24Hour(morningMatch[2]);
  }

  const afternoonMatch =
    /Afternoon:\s*([\d:]+\s*[AP]M)\s*-\s*([\d:]+\s*[AP]M)/i.exec(text);
  if (afternoonMatch) {
    result.afternoonIn = to24Hour(afternoonMatch[1]);
    result.afternoonOut = to24Hour(afternoonMatch[2]);
  }

  return result;
}
