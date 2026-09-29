import { to12Hour as canonicalTo12Hour } from "./officialHours";

export function to12Hour(time24) {
  return canonicalTo12Hour(time24);
}

export function to12HourNoSuffix(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return "";
  const m = mStr || "00";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}`;
}
