export default function DTRRemarksModal({ day, month, onClose }) {
  const dateStr = `${month}-${String(day.day).padStart(2, "0")}`;
  const entries = (day.remarks || "").split("\n").filter(Boolean);

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center px-4 z-50 print:hidden">
      <div className="bg-bg-primary rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-semibold text-text-primary mb-1">
          Remarks — Day {day.day}
        </h2>
        <p className="text-xs text-text-secondary mb-4">{dateStr}</p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {entries.length > 0 ? (
            entries.map((line, i) => (
              <div
                key={i}
                className="text-sm text-text-primary bg-bg-secondary border border-border rounded-lg px-3 py-2"
              >
                {line}
              </div>
            ))
          ) : (
            <p className="text-sm text-text-secondary">
              No remarks recorded for this day.
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary border border-border"
        >
          Close
        </button>
      </div>
    </div>
  );
}
