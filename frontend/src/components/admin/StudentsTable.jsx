import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import DutyStatusBadge from "../common/DutyStatusBadge";
import StudentRowMenu from "./StudentRowMenu";
import {
  BODY_CELL,
  PILL,
  QuickActions,
  ResponsiveTable,
  TONES,
  Truncate,
} from "../common/tableParts";
import { OJT_STATUS_LABELS, OJT_STATUS_STYLES } from "../../utils/studentList";

const COLUMNS = [
  { key: "student", label: "Student", width: "w-[23%]" },
  { key: "placement", label: "Placement", width: "w-[17%]" },
  { key: "attendance", label: "Attendance", width: "w-[16%]" },
  { key: "progress", label: "OJT Progress", width: "w-[16%]" },
  { key: "account", label: "Account", width: "w-[12%]" },
  { key: "actions", label: "Actions", width: "w-[16%]", srOnly: true },
];

function formatHours(value) {
  const hours = Number(value) || 0;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function buildActionDefs(student, actions) {
  const isActive = student.is_active;
  return {
    approve: {
      key: "approve",
      label: "Approve",
      icon: CheckCircle2,
      tone: TONES.success,
      run: () => actions.onApprove(student.student_id),
    },
    reject: {
      key: "reject",
      label: "Reject",
      icon: XCircle,
      tone: TONES.error,
      run: () => actions.onReject(student.student_id),
    },
    dtr: {
      key: "dtr",
      label: "View DTR",
      icon: FileText,
      tone: TONES.info,
      run: () => actions.onViewDTR(student.student_id),
    },
    edit: {
      key: "edit",
      label: "Edit",
      icon: Pencil,
      tone: TONES.neutral,
      run: () => actions.onEdit(student),
    },
    toggle: {
      key: "active",
      label: isActive ? "Deactivate" : "Activate",
      icon: isActive ? UserX : UserCheck,
      run: () => actions.onToggleActive(student.user_id, isActive),
    },
    remove: {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      danger: true,
      run: () => actions.onDelete(student),
    },
  };
}

function getRowActions(student, actions) {
  const defs = buildActionDefs(student, actions);
  if (student.approval_status === "pending") {
    return {
      quick: [defs.approve, defs.reject],
      menu: [defs.dtr, defs.edit, defs.remove],
    };
  }
  return {
    quick: [defs.dtr, defs.edit],
    menu: [
      ...(student.approval_status === "approved" ? [defs.toggle] : []),
      defs.remove,
    ],
  };
}

function toMenuItems(defs) {
  return defs.map(({ key, label, icon: Icon, danger, run }) => ({
    key,
    label,
    danger,
    icon: <Icon className="w-4 h-4" />,
    onSelect: run,
  }));
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
        <Building2 className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        <Truncate
          className={
            student.agency_name
              ? "font-medium text-text-primary"
              : "text-text-secondary"
          }
          text={student.agency_name || "Unassigned"}
        />
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        <Truncate
          className="text-xs text-text-secondary"
          text={student.university || "No university"}
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

function AccountBadge({ student }) {
  if (student.approval_status === "pending") {
    return (
      <span
        className={`${PILL} border-warning-border bg-warning-subtle text-warning`}
      >
        <Clock className="h-3 w-3 shrink-0" />
        Pending
      </span>
    );
  }
  if (student.approval_status === "rejected") {
    return (
      <span
        className={`${PILL} border-error-border bg-error-subtle text-error`}
      >
        <XCircle className="h-3 w-3 shrink-0" />
        Rejected
      </span>
    );
  }
  if (student.approval_status !== "approved") return null;

  return (
    <span
      className={`${PILL} ${
        student.is_active
          ? "border-success-border bg-success-subtle text-success"
          : "border-border bg-bg-secondary text-text-secondary"
      }`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      {student.is_active ? "Active" : "Deactivated"}
    </span>
  );
}

function StudentTableRow({ student, isToday, actions }) {
  const { quick, menu } = getRowActions(student, actions);

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
        <AccountBadge student={student} />
      </td>
      <td className={BODY_CELL}>
        <div className="flex items-center justify-end gap-1">
          <QuickActions items={quick} name={student.full_name} compact />
          <StudentRowMenu
            items={toMenuItems(menu)}
            label={`Actions for ${student.full_name}`}
          />
        </div>
      </td>
    </tr>
  );
}

function StudentCard({ student, isToday, actions }) {
  const { quick, menu } = getRowActions(student, actions);

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <StudentIdentity student={student} />
        </div>
        <StudentRowMenu
          items={toMenuItems(menu)}
          label={`Actions for ${student.full_name}`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <DutyStatusBadge
          status={student.status}
          lastPunchLabel={student.lastPunchLabel}
          lastPunchTime={student.lastPunchTime}
          isToday={isToday}
        />
        <AccountBadge student={student} />
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <Placement student={student} />
        <OjtProgress student={student} />
      </div>

      <QuickActions items={quick} name={student.full_name} />
    </li>
  );
}

export default function StudentsTable({
  students,
  caption,
  isToday,
  ...actions
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
          actions={actions}
        />
      ))}
      cards={students.map((student) => (
        <StudentCard
          key={student.student_id}
          student={student}
          isToday={isToday}
          actions={actions}
        />
      ))}
    />
  );
}
