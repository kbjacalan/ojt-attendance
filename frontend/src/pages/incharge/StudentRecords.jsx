import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  LoaderCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  X,
  FunnelX,
} from "lucide-react";
import {
  listMyStudents,
  listPendingOTRequests,
} from "../../services/inchargeApi";
import Select from "../../components/common/Select";
import StudentRecordsTable from "../../components/incharge/StudentRecordsTable";
import TextInput from "../../components/common/TextInput";
import { formatBatchLabel } from "../../utils/batch";
import {
  OJT_STATUS_LABELS,
  compareBatchKeysDesc,
  getLatestBatchKey,
  getTodayValue,
  sortStudents,
} from "../../utils/studentList";

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "controlno_asc", label: "OJT Control No. (A–Z)" },
  { value: "controlno_desc", label: "OJT Control No. (Z–A)" },
  { value: "university_asc", label: "University (A–Z)" },
  { value: "university_desc", label: "University (Z–A)" },
  { value: "date_desc", label: "Date Registered (Newest)" },
  { value: "date_asc", label: "Date Registered (Oldest)" },
];

const CLEARED_FILTER_PARAMS = {
  q: null,
  university: null,
  batch: null,
  status: null,
  course: null,
};

export default function StudentRecords() {
  const today = getTodayValue();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOtCount, setPendingOtCount] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();

  const selectedDate = searchParams.get("date") || today;
  const searchQuery = searchParams.get("q") || "";
  const universityFilter = searchParams.get("university") || "all";
  const batchFilter = searchParams.get("batch") || "all";
  const ojtStatusFilter = searchParams.get("status") || "all";
  const courseFilter = searchParams.get("course") || "all";
  const sortBy = searchParams.get("sort") || "name_asc";

  function updateSearchParams(updates) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === undefined || value === "") {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      },
      { replace: true },
    );
  }

  function setSelectedDate(value) {
    updateSearchParams({ date: value === today ? null : value });
  }
  function setSearchQuery(value) {
    updateSearchParams({ q: value });
  }
  function setUniversityFilter(value) {
    updateSearchParams({ university: value === "all" ? null : value });
  }
  function setBatchFilter(value) {
    updateSearchParams({ batch: value === "all" ? null : value });
  }
  function setOjtStatusFilter(value) {
    updateSearchParams({ status: value === "all" ? null : value });
  }
  function setCourseFilter(value) {
    updateSearchParams({ course: value === "all" ? null : value });
  }
  function setSortBy(value) {
    updateSearchParams({ sort: value === "name_asc" ? null : value });
  }

  const [collapsedBatches, setCollapsedBatches] = useState(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const navigate = useNavigate();

  const isToday = selectedDate === today;

  useEffect(() => {
    loadStudents(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    loadPendingOtCount();
  }, []);

  useEffect(() => {
    const POLL_INTERVAL_MS = 15000;
    const intervalId = setInterval(() => {
      loadStudents(selectedDate, { silent: true });
      loadPendingOtCount();
    }, POLL_INTERVAL_MS);

    function handleFocusOrVisible() {
      if (document.visibilityState === "hidden") return;
      loadStudents(selectedDate, { silent: true });
      loadPendingOtCount();
    }
    document.addEventListener("visibilitychange", handleFocusOrVisible);
    window.addEventListener("focus", handleFocusOrVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      window.removeEventListener("focus", handleFocusOrVisible);
    };
  }, [selectedDate]);

  async function loadStudents(date, { silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const data = await listMyStudents(date);
      setStudents(data);
      if (!silent) setError(null);
    } catch (err) {
      if (silent) {
        console.error("Background refresh failed:", err);
      } else {
        setError(err.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadPendingOtCount() {
    try {
      const data = await listPendingOTRequests();
      setPendingOtCount(data.length);
    } catch (err) {
      console.error("Failed to load OT request count:", err);
    }
  }

  function shiftDate(deltaDays) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const newDate = new Date(y, m - 1, d + deltaDays);
    const newDateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`;
    setSelectedDate(newDateStr);
  }

  const universityOptions = useMemo(() => {
    const set = new Set(
      students.map((s) => s.university).filter((v) => v && v.trim()),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [students]);

  const batchOptions = useMemo(() => {
    const set = new Set(
      students.map((s) => s.batch).filter((v) => v && v.trim()),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [students]);

  const batchOptionLabels = useMemo(() => {
    const map = {};
    for (const b of batchOptions) map[b] = formatBatchLabel(b);
    return map;
  }, [batchOptions]);

  const courseOptions = useMemo(() => {
    const set = new Set(
      students.map((s) => s.course).filter((v) => v && v.trim()),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [students]);

  const activeFilterCount = [
    searchQuery.trim() !== "",
    universityFilter !== "all",
    batchFilter !== "all",
    ojtStatusFilter !== "all",
    courseFilter !== "all",
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    updateSearchParams(CLEARED_FILTER_PARAMS);
  }

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return students.filter((s) => {
      if (universityFilter !== "all" && s.university !== universityFilter)
        return false;
      if (batchFilter !== "all" && s.batch !== batchFilter) return false;
      if (
        ojtStatusFilter !== "all" &&
        (s.ojt_status || "active") !== ojtStatusFilter
      )
        return false;
      if (courseFilter !== "all" && s.course !== courseFilter) return false;

      if (q) {
        const haystack = [s.full_name, s.university, s.course, s.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    students,
    universityFilter,
    batchFilter,
    ojtStatusFilter,
    courseFilter,
    searchQuery,
  ]);

  const batchGroups = useMemo(() => {
    const groups = new Map();
    for (const s of filteredStudents) {
      const key = s.batch && s.batch.trim() ? s.batch : "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }
    const entries = [...groups.entries()].map(([batchName, list]) => [
      batchName,
      sortStudents(list, sortBy),
    ]);
    entries.sort(([a], [b]) => compareBatchKeysDesc(a, b));
    return entries;
  }, [filteredStudents, sortBy]);

  const latestBatchKey = useMemo(() => getLatestBatchKey(students), [students]);

  const prevLatestBatchRef = useRef(null);
  useEffect(() => {
    if (latestBatchKey === null) return;
    if (prevLatestBatchRef.current === latestBatchKey) return;
    prevLatestBatchRef.current = latestBatchKey;

    const allBatchKeys = new Set(
      students.map((s) => (s.batch && s.batch.trim() ? s.batch : "Unassigned")),
    );
    allBatchKeys.delete(latestBatchKey);
    setCollapsedBatches(allBatchKeys);
  }, [latestBatchKey, students]);

  function toggleBatch(batchName) {
    setCollapsedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchName)) next.delete(batchName);
      else next.add(batchName);
      return next;
    });
  }

  const allBatchesCollapsed =
    batchGroups.length > 0 &&
    batchGroups.every(([batchName]) => collapsedBatches.has(batchName));

  function toggleAllBatches() {
    if (allBatchesCollapsed) {
      setCollapsedBatches(new Set());
    } else {
      setCollapsedBatches(new Set(batchGroups.map(([batchName]) => batchName)));
    }
  }

  return (
    <div className="min-h-screen bg-bg-secondary px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Students</h1>
            <p className="text-sm text-text-secondary">
              OJT students assigned to your agency. View and certify their DTR.
            </p>
          </div>

          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 rounded hover:bg-bg-secondary shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
              <TextInput
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="min-w-[100px]"
              />
            </div>
            <button
              onClick={() => shiftDate(1)}
              disabled={isToday}
              className="p-1.5 rounded hover:bg-bg-secondary disabled:hover:bg-transparent disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(today)}
                className="text-xs text-text-primary hover:underline underline-offset-2 shrink-0 whitespace-nowrap"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-subtle border border-error-border text-error text-sm px-4 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 overflow-x-auto flex-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            to="/incharge/ot-requests"
            className={`inline-flex items-center shrink-0 gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors hover:underline underline-offset-2 ${
              pendingOtCount > 0
                ? "bg-warning-subtle text-warning"
                : "bg-bg-secondary text-text-secondary"
            }`}
          >
            Overtime Requests
            <span
              className={`inline-flex items-center justify-center min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] px-1 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${
                pendingOtCount > 0
                  ? "bg-amber-400 text-amber-900"
                  : "bg-slate-200 text-text-secondary"
              }`}
            >
              {pendingOtCount}
            </span>
          </Link>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, university, course, or email…"
                className="w-full rounded-lg border border-border bg-bg-primary pl-9 pr-9 py-2 text-xs sm:text-sm transition-colors hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-controls="student-filters-panel"
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 active:scale-95 ${
                  hasActiveFilters
                    ? "border-focus bg-brand/5 text-text-primary"
                    : "border-border bg-bg-primary text-text-secondary hover:border-border-hover hover:text-text-primary"
                }`}
              >
                <FunnelX className="h-3.5 w-3.5" />
                Filters
                {hasActiveFilters && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-text-inverse tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div
              id="student-filters-panel"
              className="mt-2 bg-bg-primary rounded-2xl border border-border p-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-text-secondary mb-1">
                    University
                  </p>
                  <Select
                    variant="filter"
                    size="sm"
                    label="University"
                    value={universityFilter}
                    onChange={setUniversityFilter}
                    options={universityOptions}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-text-secondary mb-1">
                    Batch
                  </p>
                  <Select
                    variant="filter"
                    size="sm"
                    label="Batch"
                    value={batchFilter}
                    onChange={setBatchFilter}
                    options={batchOptions}
                    optionLabels={batchOptionLabels}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-text-secondary mb-1">
                    Status
                  </p>
                  <Select
                    variant="filter"
                    size="sm"
                    label="Status"
                    value={ojtStatusFilter}
                    onChange={setOjtStatusFilter}
                    options={Object.keys(OJT_STATUS_LABELS)}
                    optionLabels={OJT_STATUS_LABELS}
                  />
                </div>
                {courseOptions.length > 0 && (
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-text-secondary mb-1">
                      Course/Program
                    </p>
                    <Select
                      variant="filter"
                      size="sm"
                      label="Course/Program"
                      value={courseFilter}
                      onChange={setCourseFilter}
                      options={courseOptions}
                    />
                  </div>
                )}
                <div className="min-w-0 col-span-2 sm:col-span-1">
                  <p className="text-[11px] font-medium text-text-secondary mb-1">
                    Sort by
                  </p>
                  <Select
                    variant="plain"
                    size="sm"
                    value={sortBy}
                    onChange={setSortBy}
                    options={SORT_OPTIONS}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={clearFilters}
                    title="Clear filters"
                    aria-label={`Clear filters (${activeFilterCount} active)`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
                  >
                    <FunnelX className="h-3.5 w-3.5" />
                    Clear all filters ({activeFilterCount})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && students.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p
              className="flex items-baseline gap-1.5 text-sm text-text-secondary"
              aria-live="polite"
            >
              <span className="text-xl font-semibold tabular-nums text-text-primary">
                {filteredStudents.length}
              </span>
              {filteredStudents.length === students.length
                ? `student${students.length === 1 ? "" : "s"}`
                : `of ${students.length} students`}
            </p>
            {batchGroups.length > 1 && (
              <button
                type="button"
                onClick={toggleAllBatches}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-bg-primary px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
              >
                {allBatchesCollapsed ? (
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                )}
                {allBatchesCollapsed ? "Expand all" : "Collapse all"}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center border border-border bg-bg-primary py-12 text-text-secondary shadow-card">
            <LoaderCircle className="w-5 h-5 animate-spin" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="border border-border bg-bg-primary py-12 text-center text-sm text-text-secondary shadow-card">
            <p className="text-text-secondary text-sm">
              {students.length === 0
                ? "No students are currently assigned to your agency."
                : "No students match your search/filters."}
            </p>
            {hasActiveFilters && students.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-text-inverse transition-colors hover:bg-brand-hover disabled:hover:bg-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 active:scale-95 sm:text-sm"
              >
                <FunnelX className="h-3.5 w-3.5" />
                Show all students
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {batchGroups.map(([batchName, batchStudents]) => (
              <BatchGroup
                key={batchName}
                batchName={batchName}
                students={batchStudents}
                collapsed={collapsedBatches.has(batchName)}
                onToggle={() => toggleBatch(batchName)}
                isToday={isToday}
                onViewDTR={(studentId) =>
                  navigate(`/incharge/students/${studentId}/dtr`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BatchGroup({
  batchName,
  students,
  collapsed,
  onToggle,
  isToday,
  onViewDTR,
}) {
  const batchLabel =
    batchName === "Unassigned"
      ? "Unassigned Batch"
      : `Batch ${formatBatchLabel(batchName)}`;

  return (
    <section aria-label={batchLabel}>
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="sticky top-0 z-10 flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-bg-primary bg-linear-to-r from-brand/10 via-brand-secondary/5 to-transparent px-4 py-3 text-left shadow-card transition-colors hover:border-border-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
      >
        <span className="flex items-center gap-2 min-w-0">
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
          )}
          <span className="font-semibold text-text-primary truncate">
            {batchLabel}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg-primary px-2 py-1 text-xs text-text-secondary">
          <Users className="w-3.5 h-3.5" />
          {students.length} student{students.length === 1 ? "" : "s"}
        </span>
      </button>

      {!collapsed && (
        <StudentRecordsTable
          students={students}
          caption={`${batchLabel} students`}
          isToday={isToday}
          onViewDTR={onViewDTR}
        />
      )}
    </section>
  );
}
