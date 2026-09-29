import { ChevronLeft, ChevronRight } from "lucide-react";
import Select from "../common/Select";
import {
  formatPunchedMonthLabel,
  shiftPunchedMonth,
} from "../../utils/dtrMonths";

const NAV_BUTTON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border-hover hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent";

/**
 * Month picker bounded to months with punch records (newest first).
 * Dropdown lists punched months only; arrows step within the list.
 */
export default function DTRMonthPicker({ months, value, onChange }) {
  const idx = months.indexOf(value);
  const atOldest = idx === -1 || idx >= months.length - 1;
  const atNewest = idx <= 0;

  function step(delta) {
    onChange(shiftPunchedMonth(months, value, delta));
  }

  return (
    <div className="flex items-center gap-1">
      <label htmlFor="dtr-month" className="sr-only">
        Select month
      </label>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={atOldest}
        aria-label="Previous month"
        title="Previous month"
        className={NAV_BUTTON}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <Select
        id="dtr-month"
        size="sm"
        value={value ?? ""}
        onChange={onChange}
        className="w-44"
        options={months.map((m) => ({
          value: m,
          label: formatPunchedMonthLabel(m),
        }))}
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={atNewest}
        aria-label="Next month"
        title="Next month"
        className={NAV_BUTTON}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
