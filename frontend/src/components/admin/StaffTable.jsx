import { Pencil, Trash2, UserCog } from "lucide-react";
import {
  BODY_CELL,
  QuickActions,
  ResponsiveTable,
  TONES,
  Truncate,
} from "../common/tableParts";

const COLUMNS = [
  { key: "staff", label: "Staff", width: "w-[34%]" },
  { key: "email", label: "Email", width: "w-[28%]" },
  { key: "agency", label: "Assigned Agency", width: "w-[24%]" },
  { key: "actions", label: "Actions", width: "w-[14%]", srOnly: true },
];

function getActions(staffMember, { onEdit, onDelete }) {
  return [
    {
      key: "edit",
      label: "Edit",
      icon: Pencil,
      tone: TONES.neutral,
      run: () => onEdit(staffMember),
    },
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      tone: TONES.error,
      run: () => onDelete(staffMember),
    },
  ];
}

function StaffIdentity({ staffMember }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-text-primary ring-1 ring-border"
      >
        <UserCog className="h-4 w-4" />
      </span>
      <Truncate
        className="font-medium text-text-primary"
        text={staffMember.full_name}
      />
    </div>
  );
}

function AssignedAgency({ staffMember }) {
  if (!staffMember.agency_names) {
    return <span className="text-xs text-text-secondary">Unassigned</span>;
  }

  return (
    <Truncate className="text-text-secondary" text={staffMember.agency_names} />
  );
}

function StaffTableRow({ staffMember, actions }) {
  return (
    <tr className="group">
      <td className={BODY_CELL}>
        <StaffIdentity staffMember={staffMember} />
      </td>
      <td className={BODY_CELL}>
        <Truncate className="text-text-secondary" text={staffMember.email} />
      </td>
      <td className={BODY_CELL}>
        <AssignedAgency staffMember={staffMember} />
      </td>
      <td className={BODY_CELL}>
        <div className="flex justify-end">
          <QuickActions
            items={getActions(staffMember, actions)}
            name={staffMember.full_name}
            compact
          />
        </div>
      </td>
    </tr>
  );
}

function StaffCard({ staffMember, actions }) {
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-2">
        <StaffIdentity staffMember={staffMember} />
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            Email
          </p>
          <Truncate className="text-text-secondary" text={staffMember.email} />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            Assigned Agency
          </p>
          <AssignedAgency staffMember={staffMember} />
        </div>
      </div>

      <QuickActions
        items={getActions(staffMember, actions)}
        name={staffMember.full_name}
      />
    </li>
  );
}

export default function StaffTable({ staff, onEdit, onDelete }) {
  const actions = { onEdit, onDelete };

  return (
    <ResponsiveTable
      columns={COLUMNS}
      caption="In-charge accounts"
      rows={staff.map((staffMember) => (
        <StaffTableRow
          key={staffMember.id}
          staffMember={staffMember}
          actions={actions}
        />
      ))}
      cards={staff.map((staffMember) => (
        <StaffCard
          key={staffMember.id}
          staffMember={staffMember}
          actions={actions}
        />
      ))}
    />
  );
}
