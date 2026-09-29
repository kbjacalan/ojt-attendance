import { Hash, Trash2, User } from "lucide-react";
import {
  BODY_CELL,
  PILL,
  QuickActions,
  ResponsiveTable,
  TONES,
  Truncate,
} from "../common/tableParts";

const COLUMNS = [
  { key: "controlNumber", label: "Control Number", width: "w-[38%]" },
  { key: "status", label: "Status", width: "w-[20%]" },
  { key: "assignedTo", label: "Assigned To", width: "w-[32%]" },
  { key: "actions", label: "Actions", width: "w-[10%]", srOnly: true },
];

function getActions(controlNumber, onDelete) {
  const isAssigned = Boolean(controlNumber.student_name);

  return [
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      tone: TONES.error,
      disabled: isAssigned,
      title: isAssigned
        ? "Assigned to a student. Unassign before deleting."
        : "Delete control number",
      run: () => onDelete(controlNumber),
    },
  ];
}

function ControlNumberIdentity({ controlNumber }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-text-primary ring-1 ring-border"
      >
        <Hash className="h-4 w-4" />
      </span>
      <Truncate
        className="font-mono font-medium text-text-primary"
        text={controlNumber.control_number}
      />
    </div>
  );
}

function StatusBadge({ controlNumber }) {
  const isAssigned = Boolean(controlNumber.student_name);

  return (
    <span
      className={`${PILL} ${
        isAssigned
          ? "border-info-border bg-info-subtle text-info"
          : "border-success-border bg-success-subtle text-success"
      }`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      {isAssigned ? "Assigned" : "Available"}
    </span>
  );
}

function AssignedTo({ controlNumber }) {
  if (!controlNumber.student_name) {
    return <span className="text-xs text-text-secondary">Not assigned</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <User className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
      <Truncate
        className="text-text-primary"
        text={controlNumber.student_name}
      />
    </div>
  );
}

function ControlNumberTableRow({ controlNumber, onDelete }) {
  return (
    <tr className="group">
      <td className={BODY_CELL}>
        <ControlNumberIdentity controlNumber={controlNumber} />
      </td>
      <td className={BODY_CELL}>
        <StatusBadge controlNumber={controlNumber} />
      </td>
      <td className={BODY_CELL}>
        <AssignedTo controlNumber={controlNumber} />
      </td>
      <td className={BODY_CELL}>
        <div className="flex justify-end">
          <QuickActions
            items={getActions(controlNumber, onDelete)}
            name={controlNumber.control_number}
            compact
          />
        </div>
      </td>
    </tr>
  );
}

function ControlNumberCard({ controlNumber, onDelete }) {
  return (
    <li className="p-4">
      <ControlNumberIdentity controlNumber={controlNumber} />

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge controlNumber={controlNumber} />
        <AssignedTo controlNumber={controlNumber} />
      </div>

      <QuickActions
        items={getActions(controlNumber, onDelete)}
        name={controlNumber.control_number}
      />
    </li>
  );
}

export default function ControlNumbersTable({ controlNumbers, onDelete }) {
  return (
    <ResponsiveTable
      columns={COLUMNS}
      caption="OJT control numbers"
      rows={controlNumbers.map((controlNumber) => (
        <ControlNumberTableRow
          key={controlNumber.id}
          controlNumber={controlNumber}
          onDelete={onDelete}
        />
      ))}
      cards={controlNumbers.map((controlNumber) => (
        <ControlNumberCard
          key={controlNumber.id}
          controlNumber={controlNumber}
          onDelete={onDelete}
        />
      ))}
    />
  );
}
