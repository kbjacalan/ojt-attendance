import { useState, useEffect } from "react";
import { Plus, LoaderCircle } from "lucide-react";
import {
  listControlNumbers,
  createControlNumber,
  deleteControlNumber,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import ControlNumbersTable from "../../components/admin/ControlNumbersTable";
import TextInput from "../../components/common/TextInput";

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
    <div className="min-h-screen bg-bg-secondary px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              OJT Control Numbers
            </h1>
            <p className="text-sm text-text-secondary">
              Numbers trainees pick during sign up and use to gain entry at
              CAAP.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Control Number
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-subtle border border-error-border text-error text-sm px-4 py-2">
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

        {loading ? (
          <div className="flex items-center justify-center border border-border bg-bg-primary py-12 text-text-secondary shadow-card">
            <LoaderCircle className="w-5 h-5 animate-spin" />
          </div>
        ) : controlNumbers.length === 0 ? (
          <div className="border border-border bg-bg-primary py-12 text-center text-sm text-text-secondary shadow-card">
            No control numbers yet. Add one to get started.
          </div>
        ) : (
          <ControlNumbersTable
            controlNumbers={controlNumbers}
            onDelete={setDeletingControlNumber}
          />
        )}
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
      className="bg-bg-primary rounded-2xl border border-border p-6 mb-6 space-y-4"
    >
      <h2 className="font-semibold text-text-primary">New Control Number</h2>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Control Number
        </label>
        <TextInput
          type="text"
          value={controlNumber}
          onChange={(e) => setControlNumber(e.target.value)}
          required
          placeholder="e.g. CAAP-2026-0001"
        />
      </div>

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Save Control Number"}
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
