import { useState, useEffect } from "react";
import { Plus, LoaderCircle, UserCog, Pencil, Trash2 } from "lucide-react";
import {
  listStaff,
  createUser,
  updateStaffAccount,
  deleteStaffAccount,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deletingStaff, setDeletingStaff] = useState(null);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    try {
      const data = await listStaff();
      // Only in-charge accounts are managed here — admin accounts are
      // not editable/deletable through this page to avoid lockout risk.
      setStaff(data.filter((s) => s.role === "in_charge"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId) {
    try {
      await deleteStaffAccount(userId);
      setDeletingStaff(null);
      loadStaff();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCog className="w-6 h-6 text-caap-blue" />
              <h1 className="text-2xl font-bold text-slate-900">
                In-Charge Accounts
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Agency supervisors who review and certify their assigned students'
              DTRs. Assign them to an agency from the Agencies page.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add In-Charge
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </div>
        )}

        {showForm && (
          <StaffForm
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              loadStaff();
            }}
          />
        )}

        {editingStaff && (
          <StaffForm
            staffMember={editingStaff}
            onClose={() => setEditingStaff(null)}
            onCreated={() => {
              setEditingStaff(null);
              loadStaff();
            }}
          />
        )}

        {deletingStaff && (
          <ConfirmModal
            title={`Delete ${deletingStaff.full_name}'s account?`}
            message="This removes their login access. Any agency they supervised becomes unassigned (agency and student data is not affected), and old certified DTRs keep their certification timestamp but lose the reference to who certified them."
            confirmLabel="Delete"
            onConfirm={() => handleDelete(deletingStaff.id)}
            onCancel={() => setDeletingStaff(null)}
          />
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <LoaderCircle className="w-5 h-5 animate-spin" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No in-charge accounts yet. Add one to get started.
            </div>
          ) : (
            <>
              {/* Table view — tablet and up */}
              <table className="hidden md:table w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Assigned Agency</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {s.full_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.agency_names || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setEditingStaff(s)}
                            className="text-slate-500 hover:text-slate-800"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStaff(s)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
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
                {staff.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {s.full_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {s.email}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Agency: {s.agency_names || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => setEditingStaff(s)}
                        className="text-slate-500 hover:text-slate-800"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingStaff(s)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
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

/**
 * Handles both creating a new in-charge account and editing an
 * existing one. Pass `staffMember` to switch into edit mode.
 */
function StaffForm({ staffMember, onClose, onCreated }) {
  const isEditing = Boolean(staffMember);
  const [form, setForm] = useState({
    fullName: staffMember?.full_name || "",
    email: staffMember?.email || "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        await updateStaffAccount(staffMember.id, {
          fullName: form.fullName,
          email: form.email,
        });
      } else {
        await createUser({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: "in_charge",
        });
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
        {isEditing ? "Edit In-Charge Account" : "New In-Charge Account"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Full Name"
          value={form.fullName}
          onChange={(v) => setForm({ ...form, fullName: v })}
          required
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          required
          type="email"
        />
        {!isEditing && (
          <Field
            label="Password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            required
            type="password"
          />
        )}
      </div>

      {isEditing && (
        <p className="text-xs text-slate-400">
          Password changes aren't supported here yet — the account holder would
          need a separate reset flow.
        </p>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50"
        >
          {submitting
            ? "Saving…"
            : isEditing
              ? "Save Changes"
              : "Create Account"}
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

function Field({ label, value, onChange, required, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
      />
    </div>
  );
}
