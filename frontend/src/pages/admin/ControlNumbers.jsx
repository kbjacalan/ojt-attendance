import { useState, useEffect } from "react";
import { Plus, Trash2, LoaderCircle, Hash, User } from "lucide-react";
import {
  listControlNumbers,
  createControlNumber,
  deleteControlNumber,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";

export default function ControlNumbers() {
  const [controlNumbers, setControlNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingControlNumber, setDeletingControlNumber] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await listControlNumbers();
      setControlNumbers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteControlNumber(id);
      setDeletingControlNumber(null);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              OJT Control Numbers
            </h1>
            <p className="text-sm text-slate-500">
              Numbers trainees pick during sign up and use to gain entry at
              CAAP.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Control Number
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </div>
        )}

        {showForm && (
          <ControlNumberForm
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              loadData();
            }}
          />
        )}

        {deletingControlNumber && (
          <ConfirmModal
            title={`Delete "${deletingControlNumber.control_number}"?`}
            message="This cannot be undone."
            confirmLabel="Delete"
            onConfirm={() => handleDelete(deletingControlNumber.id)}
            onCancel={() => setDeletingControlNumber(null)}
          />
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <LoaderCircle className="w-5 h-5 animate-spin" />
            </div>
          ) : controlNumbers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No control numbers yet. Add one to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {controlNumbers.map((cn) => (
                <div
                  key={cn.id}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {cn.control_number}
                      </p>
                      {cn.student_name ? (
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          {cn.student_name}
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-600">Available</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeletingControlNumber(cn)}
                    disabled={Boolean(cn.student_name)}
                    title={
                      cn.student_name
                        ? "Assigned to a student — unassign before deleting"
                        : "Delete control number"
                    }
                    className="text-red-500 hover:text-red-700 disabled:text-slate-300 disabled:hover:text-slate-300 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlNumberForm({ onClose, onCreated }) {
  const [controlNumber, setControlNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createControlNumber({ controlNumber });
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
      <h2 className="font-semibold text-slate-800">New Control Number</h2>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Control Number
        </label>
        <input
          type="text"
          value={controlNumber}
          onChange={(e) => setControlNumber(e.target.value)}
          required
          placeholder="e.g. CAAP-2026-0001"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Control Number"}
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
