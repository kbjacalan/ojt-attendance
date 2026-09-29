import { MapPin, Pencil, Trash2, Users } from "lucide-react";
import Select from "../common/Select";
import {
  BODY_CELL,
  PILL,
  QuickActions,
  ResponsiveTable,
  TONES,
  Truncate,
} from "../common/tableParts";

const COLUMNS = [
  { key: "agency", label: "Agency", width: "w-[28%]" },
  { key: "coordinates", label: "Coordinates", width: "w-[15%]" },
  { key: "radius", label: "Radius", width: "w-[9%]" },
  { key: "students", label: "Students", width: "w-[10%]" },
  { key: "inCharge", label: "In-Charge", width: "w-[26%]" },
  { key: "actions", label: "Actions", width: "w-[12%]", srOnly: true },
];

function getActions(agency, { onEdit, onDelete }) {
  return [
    {
      key: "edit",
      label: "Edit",
      icon: Pencil,
      tone: TONES.neutral,
      run: () => onEdit(agency),
    },
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      tone: TONES.error,
      run: () => onDelete(agency),
    },
  ];
}

function AgencyIdentity({ agency }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-text-primary ring-1 ring-border"
      >
        <MapPin className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <Truncate
          className="font-medium text-text-primary"
          text={agency.name}
        />
        <Truncate
          className="text-xs text-text-secondary"
          text={agency.address || "No address"}
        />
      </div>
    </div>
  );
}

function Coordinates({ agency }) {
  return (
    <div className="font-mono text-xs text-text-secondary">
      <p className="truncate">{agency.latitude}</p>
      <p className="truncate">{agency.longitude}</p>
    </div>
  );
}

function RadiusBadge({ agency }) {
  return (
    <span
      className={`${PILL} border-border bg-bg-secondary tabular-nums text-text-secondary`}
    >
      {agency.radius_meters}m
    </span>
  );
}

function StudentCount({ agency, showLabel = false }) {
  const count = agency.student_count ?? 0;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-text-secondary">
      <Users className="h-3.5 w-3.5 shrink-0" />
      {count}
      {showLabel && ` student${count === 1 ? "" : "s"}`}
    </span>
  );
}

function AgencyTableRow({ agency, actions, renderInCharge }) {
  return (
    <tr className="group">
      <td className={BODY_CELL}>
        <AgencyIdentity agency={agency} />
      </td>
      <td className={BODY_CELL}>
        <Coordinates agency={agency} />
      </td>
      <td className={BODY_CELL}>
        <RadiusBadge agency={agency} />
      </td>
      <td className={BODY_CELL}>
        <StudentCount agency={agency} />
      </td>
      <td className={BODY_CELL}>{renderInCharge(agency)}</td>
      <td className={BODY_CELL}>
        <div className="flex justify-end">
          <QuickActions
            items={getActions(agency, actions)}
            name={agency.name}
            compact
          />
        </div>
      </td>
    </tr>
  );
}

function AgencyCard({ agency, actions, renderInCharge }) {
  return (
    <li className="p-4">
      <AgencyIdentity agency={agency} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RadiusBadge agency={agency} />
        <StudentCount agency={agency} showLabel />
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            Coordinates
          </p>
          <Coordinates agency={agency} />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            In-Charge
          </p>
          {renderInCharge(agency)}
        </div>
      </div>

      <QuickActions items={getActions(agency, actions)} name={agency.name} />
    </li>
  );
}

export default function AgenciesTable({
  agencies,
  inChargeOptions,
  onInChargeChange,
  onEdit,
  onDelete,
}) {
  const actions = { onEdit, onDelete };

  function renderInCharge(agency) {
    return (
      <Select
        variant="plain"
        size="sm"
        value={agency.in_charge_id || ""}
        onChange={(value) => onInChargeChange(agency.id, value)}
        options={inChargeOptions}
      />
    );
  }

  return (
    <ResponsiveTable
      columns={COLUMNS}
      caption="Agencies"
      rows={agencies.map((agency) => (
        <AgencyTableRow
          key={agency.id}
          agency={agency}
          actions={actions}
          renderInCharge={renderInCharge}
        />
      ))}
      cards={agencies.map((agency) => (
        <AgencyCard
          key={agency.id}
          agency={agency}
          actions={actions}
          renderInCharge={renderInCharge}
        />
      ))}
    />
  );
}
