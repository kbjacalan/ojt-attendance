/**
 * A "batch" is stored as a "YYYY-MM" string (e.g. "2026-07") — the
 * month/year a student's OJT batch starts. Storing it in this
 * zero-padded ISO-ish shape (rather than a typed label like
 * "July 2026") means plain string sorting/grouping is also correct
 * chronological sorting, with no extra logic needed.
 *
 * These helpers convert that raw value to/from a human-readable label
 * for display, mirroring the same convention already used for DTR
 * months on the backend (see dtrService.js's formatMonthLabel).
 */

const BATCH_FORMAT = /^(\d{4})-(\d{2})$/;

/**
 * Formats a "YYYY-MM" batch value into "Month YYYY" (e.g. "July 2026").
 * Falls back to returning the raw value as-is for legacy/free-text
 * batches typed before this format was enforced (e.g. "2026-A").
 */
export function formatBatchLabel(batchValue) {
  if (!batchValue) return "";
  const match = BATCH_FORMAT.exec(batchValue);
  if (!match) return batchValue;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return batchValue;

  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

/** Returns the current month as "YYYY-MM" — used to default the batch picker. */
export function getCurrentBatchValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
