import { getManilaMonthString } from "./manilaDate";

export function getCurrentMonthValue() {
  return getManilaMonthString();
}

export function shiftMonthValue(month, delta) {
  const [year, mo] = month.split("-").map(Number);
  const newDate = new Date(year, mo - 1 + delta, 1);
  return `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`;
}
