import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  LoaderCircle,
  UserX,
  UserCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  X,
  GraduationCap,
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
} from "../../services/adminApi";
import DutyStatusBadge from "../../components/common/DutyStatusBadge";
import ConfirmModal from "../../components/common/ConfirmModal";
import { formatBatchLabel } from "../../utils/batch";

const OJT_STATUS_LABELS = {
  pending: "Pending",
  active: "Ongoing",
  completed: "Completed",
  dropped: "Dropped",
};

const OJT_STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  completed: "bg-blue-50 text-blue-700 border border-blue-200",
  dropped: "bg-slate-100 text-slate-500 border border-slate-200",
};

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "university_asc", label: "University (A–Z)" },
  { value: "university_desc", label: "University (Z–A)" },
  { value: "batch_asc", label: "Batch (Earliest–Latest)" },
  { value: "batch_desc", label: "Batch (Latest–Earliest)" },
  { value: "date_desc", label: "Date Registered (Newest)" },
  { value: "date_asc", label: "Date Registered (Oldest)" },
];

function getTodayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function sortStudents(list, sortBy) {
  const sorted = [...list];
  const [field, dir] = sortBy.split("_");
  const mult = dir === "desc" ? -1 : 1;

  sorted.sort((a, b) => {
    let av, bv;
    switch (field) {
      case "name":
        av = (a.full_name || "").toLowerCase();
        bv = (b.full_name || "").toLowerCase();
        break;
      case "university":
        av = (a.university || "").toLowerCase();
        bv = (b.university || "").toLowerCase();
        break;
      case "batch":
        av = (a.batch || "").toLowerCase();
        bv = (b.batch || "").toLowerCase();
        break;
      case "date":
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
        break;
      default:
        av = bv = "";
    }
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;
    return 0;
  });

  return sorted;
}

export default function Students() {
  const today = getTodayValue();
  const [selectedDate, setSelectedDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [approvalFilter, setApprovalFilter] = useState("all");

  // Search, filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [universityFilter, setUniversityFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [ojtStatusFilter, setOjtStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Which batch groups are collapsed (collapsed = hidden). Empty by
  // default so every batch starts expanded.
  const [collapsedBatches, setCollapsedBatches] = useState(() => new Set());

  // Scrolls the add/edit form into view whenever it opens — most useful
  // for Edit, since the student card that triggered it can be far down
  // a long, scrolled list.
  const formSectionRef = useRef(null);
  useEffect(() => {
    if ((showForm || editingStudent) && formSectionRef.current) {
      formSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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

  async function loadData(date) {
    setLoading(true);
    try {
      const [studentsData, agenciesData] = await Promise.all([
        listStudents(date),
        listAgencies(),
      ]);
      setStudents(studentsData);
      setAgencies(agenciesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function shiftDate(deltaDays) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const newDate = new Date(y, m - 1, d + deltaDays);
    setSelectedDate(
      `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`,
    );
  }

  async function handleAgencyChange(studentId, agencyId) {
    try {
      await updateStudentProfile(studentId, { agencyId: agencyId || null });
      loadData(selectedDate);
    } catch (err) {
      alert(err.message);
    }
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

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    universityFilter !== "all" ||
    batchFilter !== "all" ||
    ojtStatusFilter !== "all" ||
    courseFilter !== "all";

  function clearFilters() {
    setSearchQuery("");
    setUniversityFilter("all");
    setBatchFilter("all");
    setOjtStatusFilter("all");
    setCourseFilter("all");
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
    entries.sort(([a], [b]) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [filteredStudents, sortBy]);

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
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Students</h1>
            <p className="text-sm text-slate-500">
              Manage OJT student accounts and agency assignments.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 rounded hover:bg-slate-200 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
                <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-1 text-sm w-full min-w-[100px]"
                />
              </div>
              <button
                onClick={() => shiftDate(1)}
                disabled={isToday}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(today)}
                  className="text-xs text-caap-blue hover:text-caap-navy underline shrink-0 whitespace-nowrap"
                >
                  Today
                </button>
              )}
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 bg-caap-navy text-white px-3 min-[376px]:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-caap-blue shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden min-[376px]:inline">Add Student</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
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
                  ? "bg-caap-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] px-1 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${
                    f.key === "pending"
                      ? "bg-amber-400 text-amber-900"
                      : approvalFilter === f.key
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search, filters & sorting */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, university, course, or email…"
              className="w-full rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <FilterSelect
              label="University"
              value={universityFilter}
              onChange={setUniversityFilter}
              options={universityOptions}
            />
            <FilterSelect
              label="Batch"
              value={batchFilter}
              onChange={setBatchFilter}
              options={batchOptions}
              optionLabels={batchOptionLabels}
            />
            <FilterSelect
              label="Status"
              value={ojtStatusFilter}
              onChange={setOjtStatusFilter}
              options={Object.keys(OJT_STATUS_LABELS)}
              optionLabels={OJT_STATUS_LABELS}
            />
            {courseOptions.length > 0 && (
              <FilterSelect
                label="Course/Program"
                value={courseFilter}
                onChange={setCourseFilter}
                options={courseOptions}
              />
            )}

            <div className="col-span-2 flex items-center justify-between gap-2 sm:contents">
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-500 hover:text-slate-700 underline shrink-0"
                >
                  Clear filters
                </button>
              ) : (
                <span className="sm:hidden" />
              )}

              <div className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0 sm:ml-auto">
                <span className="text-slate-500 hidden sm:inline shrink-0">
                  Sort by:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-300 pl-2 pr-1 py-1.5 text-xs sm:text-sm min-w-0 max-w-[160px] sm:max-w-none"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div ref={formSectionRef}>
          {showForm && (
            <StudentForm
              agencies={agencies}
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

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <LoaderCircle className="w-5 h-5 animate-spin" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-400 text-sm">
              {students.length === 0
                ? "No students yet. Add one to get started."
                : "No students match your search/filters."}
            </p>
            {hasActiveFilters && students.length > 0 && (
              <button
                onClick={clearFilters}
                className="mt-2 text-xs text-caap-blue hover:text-caap-navy underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {batchGroups.length > 1 && (
              <div className="flex justify-end">
                <button
                  onClick={toggleAllBatches}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  {allBatchesCollapsed ? "Expand all" : "Collapse all"}
                </button>
              </div>
            )}
            {batchGroups.map(([batchName, batchStudents]) => (
              <BatchGroup
                key={batchName}
                batchName={batchName}
                students={batchStudents}
                collapsed={collapsedBatches.has(batchName)}
                onToggle={() => toggleBatch(batchName)}
                isToday={isToday}
                selectedDate={selectedDate}
                agencies={agencies}
                onAgencyChange={handleAgencyChange}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={setEditingStudent}
                onToggleActive={handleToggleActive}
                onDelete={setDeletingStudent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, optionLabels }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full sm:w-auto rounded-lg border px-2 sm:px-3 py-1.5 text-xs sm:text-sm truncate ${
        value === "all"
          ? "border-slate-300 text-slate-600"
          : "border-caap-blue text-caap-navy bg-caap-blue/5 font-medium"
      }`}
    >
      <option value="all">{label}: All</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {optionLabels ? optionLabels[opt] : opt}
        </option>
      ))}
    </select>
  );
}

/**
 * Renders text with a `truncate` (ellipsis) style, and only attaches a
 * `title` tooltip when the text is actually cut off — i.e. its content
 * is wider than the space it's rendered in. Re-checks on resize since
 * column widths can change (e.g. narrower viewports).
 */
function Truncate({ text, className = "", as: Tag = "span", title }) {
  const ref = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    function checkTruncation() {
      const el = ref.current;
      if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
    }
    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [text]);

  return (
    <Tag
      ref={ref}
      className={`truncate ${className}`}
      title={isTruncated ? (title ?? text) : undefined}
    >
      {text}
    </Tag>
  );
}

function BatchGroup({
  batchName,
  students,
  collapsed,
  onToggle,
  isToday,
  selectedDate,
  agencies,
  onAgencyChange,
  onApprove,
  onReject,
  onEdit,
  onToggleActive,
  onDelete,
}) {
  const pendingInBatch = students.filter(
    (s) => s.approval_status === "pending",
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <Truncate
            as="span"
            className="font-semibold text-slate-800"
            text={
              batchName === "Unassigned"
                ? "Unassigned Batch"
                : `Batch ${formatBatchLabel(batchName)}`
            }
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pendingInBatch > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {pendingInBatch} pending
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
            <Users className="w-3.5 h-3.5" />
            {students.length} student{students.length === 1 ? "" : "s"}
          </span>
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Table view — tablet and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col style={{ width: "17%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead className="bg-slate-50 text-slate-500 text-left border-t border-slate-100">
                <tr>
                  <th className="px-2 py-2 font-medium truncate">Name</th>
                  <th className="px-2 py-2 font-medium truncate">University</th>
                  <th className="px-2 py-2 font-medium truncate">Course</th>
                  <th className="px-2 py-2 font-medium truncate">Agency</th>
                  <th className="px-2 py-2 font-medium truncate">
                    {isToday ? "Today" : selectedDate}
                  </th>
                  <th className="px-2 py-2 font-medium truncate">OJT Status</th>
                  <th className="px-2 py-2 font-medium truncate">Account</th>
                  <th className="px-2 py-2 font-medium"></th>
                  <th className="px-2 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.student_id}>
                    <td className="px-2 py-1.5 truncate">
                      <Truncate
                        as="div"
                        className="font-medium text-slate-800"
                        text={s.full_name}
                      />
                      <Truncate
                        as="div"
                        className="text-[11px] text-slate-400"
                        text={s.email}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-slate-600">
                      <div className="flex items-center gap-1 min-w-0">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <Truncate text={s.university || "—"} />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 truncate">
                      <Truncate text={s.course || "—"} />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="relative">
                        <select
                          value={s.agency_id || ""}
                          onChange={(e) =>
                            onAgencyChange(s.student_id, e.target.value)
                          }
                          className="w-full appearance-none rounded-lg border border-slate-300 pl-1.5 pr-5 py-1 text-xs truncate"
                        >
                          <option value="">Unassigned</option>
                          {agencies.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 truncate">
                      <DutyStatusBadge
                        status={s.status}
                        lastPunchLabel={s.lastPunchLabel}
                        lastPunchTime={s.lastPunchTime}
                        isToday={isToday}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Truncate
                        className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium inline-block max-w-full ${
                          OJT_STATUS_STYLES[s.ojt_status || "active"]
                        }`}
                        text={OJT_STATUS_LABELS[s.ojt_status || "active"]}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {s.approval_status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 max-w-full">
                          <Clock className="w-3 h-3 shrink-0" />
                          <Truncate text="Pending" />
                        </span>
                      )}
                      {s.approval_status === "rejected" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-red-50 text-red-700 border border-red-200 max-w-full">
                          <XCircle className="w-3 h-3 shrink-0" />
                          <Truncate text="Rejected" />
                        </span>
                      )}
                      {s.approval_status === "approved" && (
                        <Truncate
                          className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium inline-block max-w-full ${
                            s.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                          text={s.is_active ? "Active" : "Deactivated"}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Link
                        to={`/admin/students/${s.student_id}/dtr`}
                        className="inline-flex items-center gap-1 text-caap-blue hover:text-caap-navy text-xs font-medium truncate max-w-full"
                        title="View DTR"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">DTR</span>
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.approval_status !== "approved" && (
                          <button
                            onClick={() => onApprove(s.student_id)}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {s.approval_status === "pending" && (
                          <button
                            onClick={() => onReject(s.student_id)}
                            className="text-amber-600 hover:text-amber-800"
                            title="Reject"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {s.approval_status === "approved" && (
                          <>
                            <button
                              onClick={() => onEdit(s)}
                              className="text-slate-500 hover:text-slate-800"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                onToggleActive(s.user_id, s.is_active)
                              }
                              className="text-slate-500 hover:text-slate-800"
                              title={s.is_active ? "Deactivate" : "Activate"}
                            >
                              {s.is_active ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onDelete(s)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view — mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {students.map((s) => (
              <StudentCard
                key={s.student_id}
                student={s}
                isToday={isToday}
                selectedDate={selectedDate}
                agencies={agencies}
                onAgencyChange={onAgencyChange}
                onApprove={onApprove}
                onReject={onReject}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Mobile counterpart to the students table row — same data and actions,
 * laid out as a stacked card so it stays readable and tappable on small
 * screens instead of forcing a 9-column table to scroll horizontally.
 */
function StudentCard({
  student: s,
  isToday,
  selectedDate,
  agencies,
  onAgencyChange,
  onApprove,
  onReject,
  onEdit,
  onToggleActive,
  onDelete,
}) {
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Truncate
            as="p"
            className="font-medium text-slate-800"
            text={s.full_name}
          />
          <Truncate
            as="p"
            className="text-[11px] text-slate-400"
            text={s.email}
          />
        </div>
        <Link
          to={`/admin/students/${s.student_id}/dtr`}
          className="shrink-0 inline-flex items-center gap-1 text-caap-blue hover:text-caap-navy text-xs font-medium"
          title="View DTR"
        >
          <FileText className="w-3.5 h-3.5" /> DTR
        </Link>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
        <div className="min-w-0">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5">
            University
          </p>
          <div className="flex items-center gap-1 min-w-0 text-slate-600">
            <GraduationCap className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <Truncate text={s.university || "—"} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5">
            Course
          </p>
          <Truncate className="text-slate-600" text={s.course || "—"} />
        </div>
        <div className="min-w-0">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5">
            {isToday ? "Today" : selectedDate}
          </p>
          <DutyStatusBadge
            status={s.status}
            lastPunchLabel={s.lastPunchLabel}
            lastPunchTime={s.lastPunchTime}
            isToday={isToday}
          />
        </div>
        <div className="min-w-0">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5">
            OJT Status
          </p>
          <Truncate
            className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium inline-block max-w-full ${
              OJT_STATUS_STYLES[s.ojt_status || "active"]
            }`}
            text={OJT_STATUS_LABELS[s.ojt_status || "active"]}
          />
        </div>
        <div className="col-span-2 min-w-0">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-1">
            Agency
          </p>
          <div className="relative">
            <select
              value={s.agency_id || ""}
              onChange={(e) => onAgencyChange(s.student_id, e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-300 pl-2 pr-6 py-1.5 text-xs"
            >
              <option value="">Unassigned</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          </div>
        </div>
        <div className="col-span-2 min-w-0">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-1">
            Account
          </p>
          {s.approval_status === "pending" && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3 shrink-0" /> Pending
            </span>
          )}
          {s.approval_status === "rejected" && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-red-50 text-red-700 border border-red-200">
              <XCircle className="w-3 h-3 shrink-0" /> Rejected
            </span>
          )}
          {s.approval_status === "approved" && (
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium inline-block ${
                s.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {s.is_active ? "Active" : "Deactivated"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-2.5">
        {s.approval_status !== "approved" && (
          <button
            onClick={() => onApprove(s.student_id)}
            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4" /> Approve
          </button>
        )}
        {s.approval_status === "pending" && (
          <button
            onClick={() => onReject(s.student_id)}
            className="flex items-center gap-1 text-amber-600 hover:text-amber-800 text-xs font-medium"
          >
            <XCircle className="w-4 h-4" /> Reject
          </button>
        )}
        {s.approval_status === "approved" && (
          <>
            <button
              onClick={() => onEdit(s)}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-medium"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => onToggleActive(s.user_id, s.is_active)}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-medium"
            >
              {s.is_active ? (
                <UserX className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              {s.is_active ? "Deactivate" : "Activate"}
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(s)}
          className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
}

function StudentForm({ agencies, onClose, onCreated }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    course: "",
    university: "",
    batch: "",
    ojtStatus: "active",
    agencyId: "",
    requiredHours: 486,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

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
        requiredHours: parseFloat(form.requiredHours),
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
      className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 space-y-4"
    >
      <h2 className="font-semibold text-slate-800">New Student</h2>

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
        />

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            OJT Status
          </label>
          <select
            value={form.ojtStatus}
            onChange={(e) => setForm({ ...form, ojtStatus: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(OJT_STATUS_LABELS)
              .filter(([value]) => value !== "completed")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Once OJT begins, status switches automatically between Ongoing and
            Completed based on logged hours vs. required hours.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Agency
          </label>
          <select
            value={form.agencyId}
            onChange={(e) => setForm({ ...form, agencyId: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create Student"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
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
function EditStudentForm({ student, agencies, onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: student.full_name || "",
    email: student.email || "",
    course: student.course || "",
    university: student.university || "",
    batch: student.batch || "",
    ojtStatus: student.ojt_status || "active",
    agencyId: student.agency_id || "",
    requiredHours: student.required_hours || 486,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await updateStudentProfile(student.student_id, {
        fullName: form.fullName,
        email: form.email,
        course: form.course,
        university: form.university || null,
        batch: form.batch || null,
        ojtStatus: form.ojtStatus,
        agencyId: form.agencyId || null,
        requiredHours: parseFloat(form.requiredHours),
      });
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
      className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 space-y-4"
    >
      <h2 className="font-semibold text-slate-800">Edit Student</h2>

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
        />

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            OJT Status
          </label>
          <select
            value={form.ojtStatus}
            onChange={(e) => setForm({ ...form, ojtStatus: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(OJT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Ongoing/Completed are normally set automatically from logged hours
            vs. required hours. Overriding here is a manual correction and will
            be re-evaluated the next time this student’s hours change.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Agency
          </label>
          <select
            value={form.agencyId}
            onChange={(e) => setForm({ ...form, agencyId: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
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
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
      />
    </div>
  );
}
