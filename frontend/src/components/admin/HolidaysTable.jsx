import { Pencil, Trash2 } from "lucide-react";
import {
  BODY_CELL,
  PILL,
  QuickActions,
  ResponsiveTable,
  TONES,
  Truncate,
} from "../common/tableParts";

const COLUMNS = [
  { key: "date", label: "Date", width: "w-[33%]" },
  { key: "name", label: "Holiday", width: "w-[36%]" },
  { key: "scope", label: "Scope", width: "w-[16%]" },
  { key: "actions", label: "Actions", width: "w-[15%]", srOnly: true },
];

function getDateParts(value) {
  const date = new Date(value);
  const format = (options) =>
    date.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

  return {
    month: format({ month: "short" }),
    day: format({ day: "numeric" }),
    weekday: format({ weekday: "long" }),
    full: format({ month: "long", day: "numeric", year: "numeric" }),
  };
}

function getActions(holiday, { onEdit, onDelete }) {
  return [
    {
      key: "edit",
      label: "Edit",
      icon: Pencil,
      tone: TONES.neutral,
      run: () => onEdit(holiday),
    },
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      tone: TONES.error,
      run: () => onDelete(holiday),
    },
  ];
}

function DateIdentity({ holiday }) {
  const { month, day, weekday, full } = getDateParts(holiday.holiday_date);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full bg-brand/10 text-text-primary ring-1 ring-border"
      >
        <span className="text-[9px] font-semibold uppercase leading-none tracking-wide text-text-secondary">
          {month}
        </span>
        <span className="text-sm font-semibold leading-tight">{day}</span>
      </span>
      <div className="min-w-0">
        <Truncate className="font-medium text-text-primary" text={full} />
        <Truncate className="text-xs text-text-secondary" text={weekday} />
      </div>
    </div>
  );
}

function ScopeBadge({ holiday }) {
  return (
    <span
      className={`${PILL} ${
        holiday.is_national
          ? "border-info-border bg-info-subtle text-info"
          : "border-warning-border bg-warning-subtle text-warning"
      }`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      {holiday.is_national ? "National" : "Local"}
    </span>
  );
}

function HolidayTableRow({ holiday, actions }) {
  return (
    <tr className="group">
      <td className={BODY_CELL}>
        <DateIdentity holiday={holiday} />
      </td>
      <td className={BODY_CELL}>
        <Truncate
          className="font-medium text-text-primary"
          text={holiday.name}
        />
      </td>
      <td className={BODY_CELL}>
        <ScopeBadge holiday={holiday} />
      </td>
      <td className={BODY_CELL}>
        <div className="flex justify-end">
          <QuickActions
            items={getActions(holiday, actions)}
            name={holiday.name}
            compact
          />
        </div>
      </td>
    </tr>
  );
}

function HolidayCard({ holiday, actions }) {
  return (
    <li className="p-4">
      <DateIdentity holiday={holiday} />

      <div className="mt-3 flex items-center justify-between gap-3">
        <Truncate
          className="min-w-0 flex-1 font-medium text-text-primary"
          text={holiday.name}
        />
        <ScopeBadge holiday={holiday} />
      </div>

      <QuickActions items={getActions(holiday, actions)} name={holiday.name} />
    </li>
  );
}

export default function HolidaysTable({ holidays, year, onEdit, onDelete }) {
  const actions = { onEdit, onDelete };

  return (
    <ResponsiveTable
      columns={COLUMNS}
      caption={`Holidays in ${year}`}
      rows={holidays.map((holiday) => (
        <HolidayTableRow key={holiday.id} holiday={holiday} actions={actions} />
      ))}
      cards={holidays.map((holiday) => (
        <HolidayCard key={holiday.id} holiday={holiday} actions={actions} />
      ))}
    />
  );
}
