import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, LoaderCircle, CalendarDays } from "lucide-react";
import {
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";

function getCurrentYear() {
  return new Date().getFullYear();
}

export default function Holidays() {
  const [year, setYear] = useState(getCurrentYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [deletingHoliday, setDeletingHoliday] = useState(null);

  useEffect(() => {
    loadHolidays(year);
  }, [year]);

  async function loadHolidays(y) {
    setLoading(true);
    try {
      const data = await listHolidays(y);
      setHolidays(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteHoliday(id);
      setDeletingHoliday(null);
      loadHolidays(year);
    } catch (err) {
      alert(err.message);
    }
  }

  const yearOptions = [year - 1, year, year + 1, year + 2];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-6 h-6 text-caap-blue" />
          <h1 className="text-2xl font-bold text-slate-900">Holidays</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Non-working days applied automatically across all students' DTRs. New
          proclamations are typically released around September for the
          following year, add them here once announced.
        </p>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Year:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </div>
        )}

        {showForm && (
          <HolidayForm
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              loadHolidays(year);
            }}
          />
        )}

        {editingHoliday && (
          <HolidayForm
            holiday={editingHoliday}
            onClose={() => setEditingHoliday(null)}
            onCreated={() => {
              setEditingHoliday(null);
              loadHolidays(year);
            }}
          />
        )}

        {deletingHoliday && (
          <ConfirmModal
            title={`Delete "${deletingHoliday.name}"?`}
            message="This affects DTR generation for that date — any attendance already logged on it won't be flagged as a holiday anymore."
            confirmLabel="Delete"
            onConfirm={() => handleDelete(deletingHoliday.id)}
            onCancel={() => setDeletingHoliday(null)}
          />
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <LoaderCircle className="w-5 h-5 animate-spin" />
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No holidays recorded for {year} yet.
            </div>
          ) : (
            <>
              {/* Table view — tablet and up */}
              <table className="hidden md:table w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Scope</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {holidays.map((h) => (
                    <tr key={h.id}>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {new Date(h.holiday_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{h.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            h.is_national
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {h.is_national ? "National" : "Local"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setEditingHoliday(h)}
                            className="text-slate-500 hover:text-slate-800"
                            title="Edit holiday"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingHoliday(h)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete holiday"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Card view — mobile */}
              <div className="md:hidden divide-y divide-slate-100">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {h.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {new Date(h.holiday_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </p>
                      <span
                        className={`inline-block mt-1 text-xs px-2 py-1 rounded-full font-medium ${
                          h.is_national
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {h.is_national ? "National" : "Local"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => setEditingHoliday(h)}
                        className="text-slate-500 hover:text-slate-800"
                        title="Edit holiday"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingHoliday(h)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HolidayForm({ holiday, onClose, onCreated }) {
  const isEditing = Boolean(holiday);
  const [form, setForm] = useState({
    holidayDate: holiday
      ? new Date(holiday.holiday_date).toISOString().slice(0, 10)
      : "",
    name: holiday?.name || "",
    isNational: holiday ? holiday.is_national : true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        await updateHoliday(holiday.id, form);
      } else {
        await createHoliday(form);
      }
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
      <h2 className="font-semibold text-slate-800">
        {isEditing ? "Edit Holiday" : "New Holiday"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Date
          </label>
          <input
            type="date"
            value={form.holidayDate}
            onChange={(e) => setForm({ ...form, holidayDate: e.target.value })}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="e.g. Independence Day"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
          />
        </div>

        <div className="col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isNational}
              onChange={(e) =>
                setForm({ ...form, isNational: e.target.checked })
              }
              className="rounded border-slate-300"
            />
            National holiday (uncheck for a local/city-specific special
            non-working day)
          </label>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50"
        >
          {submitting ? "Saving…" : isEditing ? "Save Changes" : "Save Holiday"}
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
