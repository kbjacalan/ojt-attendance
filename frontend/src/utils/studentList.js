import { getManilaDateString } from "./manilaDate";

export const OJT_STATUS_LABELS = {
  pending: "Pending",
  active: "Ongoing",
  completed: "Completed",
  dropped: "Dropped",
};

export const OJT_STATUS_STYLES = {
  pending: "bg-warning-subtle text-warning border border-warning-border",
  active: "bg-success-subtle text-success border border-success-border",
  completed: "bg-info-subtle text-info border border-info-border",
  dropped: "bg-bg-secondary text-text-secondary border border-border",
};

export function getTodayValue() {
  return getManilaDateString();
}

export function sortStudents(list, sortBy) {
  const sorted = [...list];
  const [field, dir] = sortBy.split("_");
  const mult = dir === "desc" ? -1 : 1;

  sorted.sort((a, b) => {
    let av;
    let bv;
    switch (field) {
      case "name":
        av = (a.full_name || "").toLowerCase();
        bv = (b.full_name || "").toLowerCase();
        break;
      case "controlno":
        av = (a.control_number || "").toLowerCase();
        bv = (b.control_number || "").toLowerCase();
        break;
      case "agency":
        av = (a.agency_name || "").toLowerCase();
        bv = (b.agency_name || "").toLowerCase();
        break;
      case "university":
        av = (a.university || "").toLowerCase();
        bv = (b.university || "").toLowerCase();
        break;
      case "date":
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
        break;
      default:
        av = "";
        bv = "";
    }
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;
    return 0;
  });

  return sorted;
}

/**
 * Comparator for batch group keys ("YYYY-MM" strings, or "Unassigned").
 * Sorts newest-first (descending) so the most recently created batch
 * always appears at the top of the list, with "Unassigned" always
 * pinned to the end regardless of direction.
 */
export function compareBatchKeysDesc(a, b) {
  if (a === "Unassigned") return 1;
  if (b === "Unassigned") return -1;
  return b.localeCompare(a);
}

/**
 * Returns the batch key ("YYYY-MM") of the most recently created batch
 * in a student list, ignoring "Unassigned" students unless there are no
 * batches at all. Returns null for an empty list.
 */
export function getLatestBatchKey(list) {
  let latestKey = null;
  let latestCreatedAt = null;
  let hasAny = false;

  for (const s of list) {
    hasAny = true;
    const key = s.batch && s.batch.trim() ? s.batch : null;
    if (!key) continue;
    const createdAt = s.created_at ? new Date(s.created_at).getTime() : 0;
    if (latestCreatedAt === null || createdAt > latestCreatedAt) {
      latestCreatedAt = createdAt;
      latestKey = key;
    }
  }

  if (latestKey !== null) return latestKey;
  return hasAny ? "Unassigned" : null;
}
