import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Search,
  X,
  FunnelX,
  Users,
} from "lucide-react";
import {
  listStudents,
  createUser,
  updateStudentProfile,
  deleteStudent,
  approveStudent,
  rejectStudent,
  setUserActiveStatus,
  listAgencies,
  listControlNumbers,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import StudentsTable from "../../components/admin/StudentsTable";
import AgencySelect from "../../components/common/AgencySelect";
import ControlNumberSelect from "../../components/common/ControlNumberSelect";
import Select from "../../components/common/Select";
import OfficialHoursFields from "../../components/common/OfficialHoursFields";
import { formatBatchLabel } from "../../utils/batch";
import { validateOfficialHours } from "../../utils/officialHours";
import { scrollBelowStickyHeader } from "../../utils/scroll";
import TextInput from "../../components/common/TextInput";
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
  { value: "agency_asc", label: "Agency (A–Z)" },
  { value: "agency_desc", label: "Agency (Z–A)" },
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

export default function Students() {
  const today = getTodayValue();
  const [students, setStudents] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [controlNumbers, setControlNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const selectedDate = searchParams.get("date") || today;
  const approvalFilter = searchParams.get("approval") || "all";
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
  function setApprovalFilter(value) {
    updateSearchParams({ approval: value === "all" ? null : value });
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

  // Which batch groups are collapsed (collapsed = hidden). Starts empty
  // and is populated by the "auto-expand latest batch" effect below
  // once data loads, so only the newest batch starts expanded.
  const [collapsedBatches, setCollapsedBatches] = useState(() => new Set());

  // Filter popover disclosure for the compact toolbar.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const navigate = useNavigate();

  // Scrolls the add/edit form into view whenever it opens — most useful
  // for Edit, since the student card that triggered it can be far down
  // a long, scrolled list.
  const formSectionRef = useRef(null);
  useEffect(() => {
    if ((showForm || editingStudent) && formSectionRef.current) {
      scrollBelowStickyHeader(formSectionRef.current);
    }
  }, [showForm, editingStudent]);

  const isToday = selectedDate === today;

  const pendingCount = students.filter(
    (s) => s.approval_status === "pending",
  ).length;
  const approvedCount = students.filter(
    (s) => s.approval_status === "approved",
  ).length;
  const rejectedCount = students.filter(
    (s) => s.approval_status === "rejected",
  ).length;

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  // ----- Real-time updates -----
  // There's no push/websocket channel from the backend, so we keep the
  // list fresh by polling in the background and by refetching whenever
  // the tab regains focus/visibility (e.g. an admin switches back to
  // this tab after another admin approved/added a student elsewhere).
  // Both use the "silent" loadData path so they never flash the
  // full-page loading spinner or clobber the UI with a transient error.
  useEffect(() => {
    const POLL_INTERVAL_MS = 15000;
    const intervalId = setInterval(() => {
      loadData(selectedDate, { silent: true });
    }, POLL_INTERVAL_MS);

    function handleFocusOrVisible() {
      if (document.visibilityState === "hidden") return;
      loadData(selectedDate, { silent: true });
    }
    document.addEventListener("visibilitychange", handleFocusOrVisible);
    window.addEventListener("focus", handleFocusOrVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      window.removeEventListener("focus", handleFocusOrVisible);
    };
  }, [selectedDate]);

  async function loadData(date, { silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const [studentsData, agenciesData, controlNumbersData] =
        await Promise.all([
          listStudents(date),
          listAgencies(),
          listControlNumbers(),
        ]);
      setStudents(studentsData);
      setAgencies(agenciesData);
      setControlNumbers(controlNumbersData);
      if (!silent) setError(null);
    } catch (err) {
      if (silent) {
        // Don't disrupt the UI over a transient background-refresh
        // failure — just log it and keep showing the last good data.
        console.error("Background refresh failed:", err);
      } else {
        setError(err.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function shiftDate(deltaDays) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const newDate = new Date(y, m - 1, d + deltaDays);
    const newDateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`;
    setSelectedDate(newDateStr);
  }

  async function handleToggleActive(userId, currentStatus) {
    try {
      await setUserActiveStatus(userId, !currentStatus);
      loadData(selectedDate);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(studentId) {
    try {
      await deleteStudent(studentId);
      setDeletingStudent(null);
      loadData(selectedDate);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleApprove(studentId) {
    try {
      await approveStudent(studentId);
      loadData(selectedDate);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReject(studentId) {
    try {
      await rejectStudent(studentId);
      loadData(selectedDate);
    } catch (err) {
      alert(err.message);
    }
  }

  // ----- Derived filter option lists -----
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

  function showAllStudents() {
    updateSearchParams({ ...CLEARED_FILTER_PARAMS, approval: null });
  }

  // ----- Filtering pipeline -----
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return students.filter((s) => {
      if (approvalFilter !== "all" && s.approval_status !== approvalFilter)
        return false;
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
    approvalFilter,
    universityFilter,
    batchFilter,
    ojtStatusFilter,
    courseFilter,
    searchQuery,
  ]);

  // ----- Group by batch -----
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

  // Name of the most recently created batch, derived from the full
  // (unfiltered) student list so that search/filter/sort selections
  // never change which batch counts as "latest". Used to auto-expand
  // only the newest batch by default.
  const latestBatchKey = useMemo(() => getLatestBatchKey(students), [students]);

  // Tracks the previously-known latest batch so we only reset the
  // collapsed/expanded state when a genuinely *new* batch shows up
  // (e.g. right after creating a student in a new batch), rather than
  // on every background refresh or filter change — that would wipe
  // out any batches the user manually expanded/collapsed.
  const prevLatestBatchRef = useRef(null);
  useEffect(() => {
    if (latestBatchKey === null) return;
    if (prevLatestBatchRef.current === latestBatchKey) return;
    prevLatestBatchRef.current = latestBatchKey;

    const allBatchKeys = new Set(
      students.map((s) => (s.batch && s.batch.trim() ? s.batch : "Unassigned")),
    );
    // Collapse every batch except the latest one.
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
              Manage OJT student accounts and agency assignments.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0 flex-1 md:flex-none">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                aria-label="Previous day"
                title="Previous day"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border-hover hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1 md:flex-none text-sm">
                <TextInput
                  type="date"
                  value={selectedDate}
                  max={today}
                  aria-label="Select date"
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="min-w-0 w-full md:w-[150px] tabular-nums text-text-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => shiftDate(1)}
                disabled={isToday}
                aria-label="Next day"
                title="Next day"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border-hover hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(today)}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-border bg-bg-primary px-2.5 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
                >
                  Today
                </button>
              )}
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 bg-brand text-text-inverse px-3 min-[376px]:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden min-[376px]:inline">Add Student</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-subtle border border-error-border text-error text-sm px-4 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 overflow-x-auto flex-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { key: "all", label: "All", count: students.length },
            { key: "pending", label: "Pending", count: pendingCount },
            { key: "approved", label: "Approved", count: approvedCount },
            { key: "rejected", label: "Rejected", count: rejectedCount },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setApprovalFilter(f.key)}
              className={`inline-flex items-center shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
                approvalFilter === f.key
                  ? "bg-brand text-text-inverse"
                  : "text-text-secondary"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] px-1 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${
                    f.key === "pending"
                      ? "bg-amber-400 text-amber-900"
                      : approvalFilter === f.key
                        ? "bg-bg-primary/20 text-text-inverse"
                        : "bg-slate-200 text-text-secondary"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Toolbar: search + filter disclosure + result count */}
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

        <div ref={formSectionRef}>
          {showForm && (
            <StudentForm
              agencies={agencies}
              controlNumbers={controlNumbers}
              onClose={() => setShowForm(false)}
              onCreated={() => {
                setShowForm(false);
                loadData(selectedDate);
              }}
            />
          )}

          {editingStudent && (
            <EditStudentForm
              student={editingStudent}
              agencies={agencies}
              controlNumbers={controlNumbers}
              onClose={() => setEditingStudent(null)}
              onSaved={() => {
                setEditingStudent(null);
                loadData(selectedDate);
              }}
            />
          )}
        </div>

        {deletingStudent && (
          <ConfirmModal
            title={`Permanently delete ${deletingStudent.full_name}?`}
            message={
              <>
                This will <strong>permanently erase</strong> their entire
                attendance history and DTR records — this cannot be undone.
                <br />
                <br />
                If they simply finished or left their OJT, use{" "}
                <strong>Deactivate</strong> instead to preserve their records.
                <br />
                <br />
                Only proceed if this account was created in error or is a
                duplicate.
              </>
            }
            confirmLabel="Delete Permanently"
            onConfirm={() => handleDelete(deletingStudent.student_id)}
            onCancel={() => setDeletingStudent(null)}
          />
        )}

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
                ? "No students yet. Add one to get started."
                : "No students match your search/filters."}
            </p>
            {(hasActiveFilters || approvalFilter !== "all") &&
              students.length > 0 && (
                <button
                  type="button"
                  onClick={showAllStudents}
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
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={setEditingStudent}
                onToggleActive={handleToggleActive}
                onDelete={setDeletingStudent}
                onViewDTR={(studentId) =>
                  navigate(`/admin/students/${studentId}/dtr`)
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
  onApprove,
  onReject,
  onEdit,
  onToggleActive,
  onDelete,
  onViewDTR,
}) {
  const pendingInBatch = students.filter(
    (s) => s.approval_status === "pending",
  ).length;

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
        <span className="flex items-center gap-2 shrink-0">
          {pendingInBatch > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-warning-border bg-warning-subtle px-2 py-1 text-xs text-warning">
              <Clock className="w-3.5 h-3.5" />
              {pendingInBatch} pending
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-bg-primary px-2 py-1 text-xs text-text-secondary">
            <Users className="w-3.5 h-3.5" />
            {students.length} student{students.length === 1 ? "" : "s"}
          </span>
        </span>
      </button>

      {!collapsed && (
        <StudentsTable
          students={students}
          caption={`${batchLabel} students`}
          isToday={isToday}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
          onViewDTR={onViewDTR}
        />
      )}
    </section>
  );
}

function StudentForm({ agencies, controlNumbers, onClose, onCreated }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    course: "",
    university: "",
    batch: "",
    ojtStatus: "active",
    agencyId: "",
    controlNumberId: "",
    requiredHours: 486,
    amStart: "08:00",
    amEnd: "12:00",
    pmStart: "13:00",
    pmEnd: "17:00",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Only offer control numbers not already claimed by another student.
  const availableControlNumbers = controlNumbers.filter((cn) => !cn.student_id);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setAttemptedSubmit(true);

    if (!(Number(form.requiredHours) > 0)) {
      setError("Required Hours must be a positive number.");
      setSubmitting(false);
      return;
    }

    const officialHoursError = validateOfficialHours(form);
    if (officialHoursError) {
      setError(officialHoursError);
      setSubmitting(false);
      return;
    }

    try {
      await createUser({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: "student",
        course: form.course,
        university: form.university || null,
        batch: form.batch || null,
        ojtStatus: form.ojtStatus,
        agencyId: form.agencyId || null,
        controlNumberId: form.controlNumberId || null,
        requiredHours: parseFloat(form.requiredHours),
        amStart: form.amStart,
        amEnd: form.amEnd,
        pmStart: form.pmStart,
        pmEnd: form.pmEnd,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-bg-primary rounded-2xl border border-border p-6 mb-6 space-y-4"
    >
      <h2 className="font-semibold text-text-primary">New Student</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Full Name"
          value={form.fullName}
          onChange={(v) => setForm({ ...form, fullName: v })}
          required
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          required
          type="email"
        />
        <Field
          label="Password"
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          required
          type="password"
        />
        <Field
          label="Course"
          value={form.course}
          onChange={(v) => setForm({ ...form, course: v })}
        />
        <Field
          label="University"
          value={form.university}
          onChange={(v) => setForm({ ...form, university: v })}
        />
        <Field
          label="OJT Batch"
          value={form.batch}
          onChange={(v) => setForm({ ...form, batch: v })}
          type="month"
        />
        <Field
          label="Required Hours"
          value={form.requiredHours}
          onChange={(v) => setForm({ ...form, requiredHours: v })}
          type="number"
          min="1"
        />

        <Select
          label="OJT Status"
          size="sm"
          value={form.ojtStatus}
          onChange={(v) => setForm({ ...form, ojtStatus: v })}
          helperText="Once OJT begins, status switches automatically between Ongoing and Completed based on logged hours vs. required hours."
          options={Object.entries(OJT_STATUS_LABELS)
            .filter(([value]) => value !== "completed")
            .map(([value, label]) => ({ value, label }))}
        />

        <AgencySelect
          id="new-student-agency"
          value={form.agencyId}
          onChange={(v) => setForm({ ...form, agencyId: v })}
          agencies={agencies}
        />

        <ControlNumberSelect
          id="new-student-controlNumber"
          value={form.controlNumberId}
          onChange={(v) => setForm({ ...form, controlNumberId: v })}
          controlNumbers={availableControlNumbers}
        />
      </div>

      <OfficialHoursFields
        value={form}
        onChange={(v) => setForm({ ...form, ...v })}
        disabled={submitting}
        showValidation={attemptedSubmit}
      />

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Create Student"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * Edit form for an existing student. Prefilled from the row data.
 * No password field here — password resets would be a separate,
 * more carefully-guarded feature.
 */
function EditStudentForm({
  student,
  agencies,
  controlNumbers,
  onClose,
  onSaved,
}) {
  const initialOjtStatus = student.ojt_status || "active";
  const [form, setForm] = useState({
    fullName: student.full_name || "",
    email: student.email || "",
    course: student.course || "",
    university: student.university || "",
    batch: student.batch || "",
    ojtStatus: initialOjtStatus,
    agencyId: student.agency_id || "",
    controlNumberId: student.control_number_id || "",
    requiredHours: student.required_hours || 486,
    amStart: (student.am_start || "").slice(0, 5),
    amEnd: (student.am_end || "").slice(0, 5),
    pmStart: (student.pm_start || "").slice(0, 5),
    pmEnd: (student.pm_end || "").slice(0, 5),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Only offer control numbers not already claimed by another student —
  // but keep this student's own current one in the list even though
  // it's technically "claimed", so it doesn't disappear from the
  // dropdown while editing.
  const availableControlNumbers = controlNumbers.filter(
    (cn) => !cn.student_id || cn.student_id === student.student_id,
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setAttemptedSubmit(true);

    if (!(Number(form.requiredHours) > 0)) {
      setError("Required Hours must be a positive number.");
      setSubmitting(false);
      return;
    }

    const officialHoursError = validateOfficialHours(form);
    if (officialHoursError) {
      setError(officialHoursError);
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        course: form.course,
        university: form.university || null,
        batch: form.batch || null,
        agencyId: form.agencyId || null,
        controlNumberId: form.controlNumberId || null,
        requiredHours: parseFloat(form.requiredHours),
        amStart: form.amStart,
        amEnd: form.amEnd,
        pmStart: form.pmStart,
        pmEnd: form.pmEnd,
      };
      if (form.ojtStatus !== initialOjtStatus) {
        payload.ojtStatus = form.ojtStatus;
      }
      await updateStudentProfile(student.student_id, payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-bg-primary rounded-2xl border border-border p-6 mb-6 space-y-4"
    >
      <h2 className="font-semibold text-text-primary">Edit Student</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Full Name"
          value={form.fullName}
          onChange={(v) => setForm({ ...form, fullName: v })}
          required
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          required
          type="email"
        />
        <Field
          label="Course"
          value={form.course}
          onChange={(v) => setForm({ ...form, course: v })}
        />
        <Field
          label="University"
          value={form.university}
          onChange={(v) => setForm({ ...form, university: v })}
        />
        <Field
          label="OJT Batch"
          value={form.batch}
          onChange={(v) => setForm({ ...form, batch: v })}
          type="month"
        />
        <Field
          label="Required Hours"
          value={form.requiredHours}
          onChange={(v) => setForm({ ...form, requiredHours: v })}
          type="number"
          min="1"
        />

        <Select
          label="OJT Status"
          size="sm"
          value={form.ojtStatus}
          onChange={(v) => setForm({ ...form, ojtStatus: v })}
          helperText="Ongoing/Completed are normally set automatically from logged hours vs. required hours. Overriding here is a manual correction and will be re-evaluated the next time this student’s hours change."
          options={Object.entries(OJT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        <AgencySelect
          id="edit-student-agency"
          value={form.agencyId}
          onChange={(v) => setForm({ ...form, agencyId: v })}
          agencies={agencies}
        />

        <ControlNumberSelect
          id="edit-student-controlNumber"
          value={form.controlNumberId}
          onChange={(v) => setForm({ ...form, controlNumberId: v })}
          controlNumbers={availableControlNumbers}
        />

        <div className="sm:col-span-2">
          <OfficialHoursFields
            value={form}
            onChange={(v) => setForm({ ...form, ...v })}
            disabled={submitting}
            showValidation={attemptedSubmit}
          />
        </div>
      </div>

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  min,
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      <TextInput
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
      />
    </div>
  );
}
