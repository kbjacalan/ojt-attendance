import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  LoaderCircle,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Search,
  X,
  GraduationCap,
} from "lucide-react";
import { listMyStudents } from "../../services/inchargeApi";
import DutyStatusBadge from "../../components/common/DutyStatusBadge";
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
      default:
        av = bv = "";
    }
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;
    return 0;
  });

  return sorted;
}

export default function StudentRecords() {
  const today = getTodayValue();
  const [selectedDate, setSelectedDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const isToday = selectedDate === today;

  useEffect(() => {
    loadStudents(selectedDate);
  }, [selectedDate]);

  async function loadStudents(date) {
    setLoading(true);
    try {
      const data = await listMyStudents(date);
      setStudents(data);
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-caap-blue shrink-0" />
              <h1 className="text-2xl font-bold text-slate-900">My Students</h1>
            </div>
            <p className="text-sm text-slate-500">
              OJT students assigned to your agency. Click a student to view and
              certify their DTR.
            </p>
          </div>

          <div className="flex items-center gap-1 min-w-0">
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
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </div>
        )}

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

          {/* Filters — 2-column grid on mobile, single inline row from sm: up */}
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

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <LoaderCircle className="w-5 h-5 animate-spin" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            {students.length === 0
              ? "No students are currently assigned to your agency."
              : "No students match your search/filters."}
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
                selectedDate={selectedDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
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

function BatchGroup({
  batchName,
  students,
  collapsed,
  onToggle,
  isToday,
  selectedDate,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
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
        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
          <Users className="w-3.5 h-3.5" />
          {students.length} student{students.length === 1 ? "" : "s"}
        </span>
      </button>

      {!collapsed && (
        <>
          {/* Table view — tablet and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col style={{ width: "24%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead className="bg-slate-50 text-slate-500 text-left border-t border-slate-100">
                <tr>
                  <th className="px-2 py-2 font-medium truncate">Name</th>
                  <th className="px-2 py-2 font-medium truncate">University</th>
                  <th className="px-2 py-2 font-medium truncate">Course</th>
                  <th className="px-2 py-2 font-medium truncate">
                    {isToday ? "Today" : selectedDate}
                  </th>
                  <th className="px-2 py-2 font-medium truncate">OJT Status</th>
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
                    <td className="px-2 py-1.5 text-right">
                      <Link
                        to={`/incharge/students/${s.student_id}/dtr`}
                        className="inline-flex items-center gap-1 text-caap-blue hover:text-caap-navy text-xs font-medium truncate max-w-full"
                        title="View DTR"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">DTR</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view — mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {students.map((s) => (
              <StudentRecordCard
                key={s.student_id}
                student={s}
                isToday={isToday}
                selectedDate={selectedDate}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Mobile counterpart to the students table row — same data, laid out
 * as a stacked card so it stays readable and tappable on small screens
 * instead of forcing a 6-column table to scroll horizontally.
 */
function StudentRecordCard({ student: s, isToday, selectedDate }) {
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
          to={`/incharge/students/${s.student_id}/dtr`}
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
      </div>
    </div>
  );
}
