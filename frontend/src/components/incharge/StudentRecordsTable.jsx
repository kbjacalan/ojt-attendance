import { FileText, GraduationCap, BookOpen } from "lucide-react";
import DutyStatusBadge from "../common/DutyStatusBadge";
import {
  BODY_CELL,
  QuickActions,
  ResponsiveTable,
  TONES,
  Truncate,
  formatHours,
} from "../common/tableParts";
import { OJT_STATUS_LABELS, OJT_STATUS_STYLES } from "../../utils/studentList";

const COLUMNS = [
  { key: "student", label: "Student", width: "w-[28%]" },
  { key: "placement", label: "University", width: "w-[24%]" },
  { key: "attendance", label: "Attendance", width: "w-[20%]" },
  { key: "progress", label: "OJT Progress", width: "w-[20%]" },
  { key: "actions", label: "Actions", width: "w-[8%]", srOnly: true },
];

function getQuickActions(student, onViewDTR) {
  return [
    {
      key: "dtr",
      label: "View DTR",
      icon: FileText,
      tone: TONES.info,
      run: () => onViewDTR(student.student_id),
    },
  ];
}

function StudentIdentity({ student }) {
  const initial = (student.full_name?.trim()?.[0] || "?").toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-text-primary ring-1 ring-border"
      >
        {initial}
      </span>
      <div className="min-w-0">
        <Truncate
          className="font-medium text-text-primary"
          text={student.full_name}
        />
        <Truncate
          className="text-xs text-text-secondary"
          text={student.email}
        />
        <p className="mt-0.5 truncate font-mono text-[11px] text-text-secondary">
          {student.control_number || "No control no."}
        </p>
      </div>
    </div>
  );
}

function Placement({ student }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        <Truncate
          className={
            student.university
              ? "font-medium text-text-primary"
              : "text-text-secondary"
          }
          text={student.university || "No university"}
        />
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        <Truncate
          className="text-xs text-text-secondary"
          text={student.course || "No course"}
        />
      </div>
    </div>
  );
}

function OjtProgress({ student }) {
  const status = student.ojt_status || "active";

  return (
    <div className="min-w-0">
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${OJT_STATUS_STYLES[status]}`}
      >
        {OJT_STATUS_LABELS[status]}
      </span>
      <p className="mt-1.5 text-[11px] tabular-nums text-text-secondary">
        {formatHours(student.cumulative_hours)} /{" "}
        {formatHours(student.required_hours)} hrs
      </p>
    </div>
  );
}

function StudentTableRow({ student, isToday, onViewDTR }) {
  return (
    <tr className="group">
      <td className={BODY_CELL}>
        <StudentIdentity student={student} />
      </td>
      <td className={BODY_CELL}>
        <Placement student={student} />
      </td>
      <td className={BODY_CELL}>
        <DutyStatusBadge
          status={student.status}
          lastPunchLabel={student.lastPunchLabel}
          lastPunchTime={student.lastPunchTime}
          isToday={isToday}
        />
      </td>
      <td className={BODY_CELL}>
        <OjtProgress student={student} />
      </td>
      <td className={BODY_CELL}>
        <div className="flex items-center justify-end gap-1">
          <QuickActions
            items={getQuickActions(student, onViewDTR)}
            name={student.full_name}
            compact
          />
        </div>
      </td>
    </tr>
  );
}

function StudentCard({ student, isToday, onViewDTR }) {
  return (
    <li className="p-4">
      <div className="min-w-0">
        <StudentIdentity student={student} />
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <DutyStatusBadge
          status={student.status}
          lastPunchLabel={student.lastPunchLabel}
          lastPunchTime={student.lastPunchTime}
          isToday={isToday}
        />
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <Placement student={student} />
        <OjtProgress student={student} />
      </div>

      <QuickActions
        items={getQuickActions(student, onViewDTR)}
        name={student.full_name}
      />
    </li>
  );
}

export default function StudentRecordsTable({
  students,
  isToday,
  caption,
  onViewDTR,
}) {
  return (
    <ResponsiveTable
      className="mt-2"
      columns={COLUMNS}
      caption={caption}
      rows={students.map((student) => (
        <StudentTableRow
          key={student.student_id}
          student={student}
          isToday={isToday}
          onViewDTR={onViewDTR}
        />
      ))}
      cards={students.map((student) => (
        <StudentCard
          key={student.student_id}
          student={student}
          isToday={isToday}
          onViewDTR={onViewDTR}
        />
      ))}
    />
  );
}
