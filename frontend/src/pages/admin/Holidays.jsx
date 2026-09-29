import { useState, useEffect } from "react";
import { Plus, LoaderCircle } from "lucide-react";
import {
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import HolidaysTable from "../../components/admin/HolidaysTable";
import Select from "../../components/common/Select";
import TextInput from "../../components/common/TextInput";

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
    <div className="min-h-screen bg-bg-secondary px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Holidays</h1>
        <p className="text-sm text-text-secondary mb-6">
          Manage holidays automatically applied to all students’ DTRs.
        </p>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">Year:</label>
            <Select
              variant="plain"
              fullWidth={false}
              value={year}
              onChange={(v) => setYear(Number(v))}
              options={yearOptions.map((y) => ({ value: y, label: y }))}
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-subtle border border-error-border text-error text-sm px-4 py-2">
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

        {loading ? (
          <div className="flex items-center justify-center border border-border bg-bg-primary py-12 text-text-secondary shadow-card">
            <LoaderCircle className="w-5 h-5 animate-spin" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="border border-border bg-bg-primary py-12 text-center text-sm text-text-secondary shadow-card">
            No holidays recorded for {year} yet.
          </div>
        ) : (
          <HolidaysTable
            holidays={holidays}
            year={year}
            onEdit={setEditingHoliday}
            onDelete={setDeletingHoliday}
          />
        )}
      </div>
    </div>
  );
}

function HolidayForm({ holiday, onClose, onCreated }) {
  const isEditing = Boolean(holiday);
  const [form, setForm] = useState({
    holidayDate: holiday ? holiday.holiday_date.slice(0, 10) : "",
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
      className="bg-bg-primary rounded-2xl border border-border p-6 mb-6 space-y-4"
    >
      <h2 className="font-semibold text-text-primary">
        {isEditing ? "Edit Holiday" : "New Holiday"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Date
          </label>
          <TextInput
            type="date"
            value={form.holidayDate}
            onChange={(e) => setForm({ ...form, holidayDate: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Name
          </label>
          <TextInput
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="e.g. Independence Day"
          />
        </div>

        <div className="col-span-2">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={form.isNational}
              onChange={(e) =>
                setForm({ ...form, isNational: e.target.checked })
              }
              className="rounded border-border"
            />
            National holiday (uncheck for a local/city-specific special
            non-working day)
          </label>
        </div>
      </div>

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : isEditing ? "Save Changes" : "Save Holiday"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
