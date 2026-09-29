import { useState, useEffect } from "react";
import { Plus, LoaderCircle } from "lucide-react";
import {
  listStaff,
  createUser,
  updateStaffAccount,
  deleteStaffAccount,
  listAgencies,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import StaffTable from "../../components/admin/StaffTable";
import AgencySelect from "../../components/common/AgencySelect";
import TextInput from "../../components/common/TextInput";
import PasswordInput from "../../components/common/PasswordInput";

const MIN_PASSWORD_LENGTH = 8;

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [agencies, setAgencies] = useState([]);
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
      const [data, agenciesData] = await Promise.all([
        listStaff(),
        listAgencies(),
      ]);
      // Only in-charge accounts are managed here — admin accounts are
      // not editable/deletable through this page to avoid lockout risk.
      setStaff(data.filter((s) => s.role === "in_charge"));
      setAgencies(agenciesData);
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
    <div className="min-h-screen bg-bg-secondary px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              In-Charge Accounts
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Supervisors who review and certify their students' DTRs.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add In-Charge
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-subtle border border-error-border text-error text-sm px-4 py-2">
            {error}
          </div>
        )}

        {showForm && (
          <StaffForm
            agencies={agencies}
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
            agencies={agencies}
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

        {loading ? (
          <div className="flex items-center justify-center border border-border bg-bg-primary py-12 text-text-secondary shadow-card">
            <LoaderCircle className="w-5 h-5 animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="border border-border bg-bg-primary py-12 text-center text-sm text-text-secondary shadow-card">
            No in-charge accounts yet. Add one to get started.
          </div>
        ) : (
          <StaffTable
            staff={staff}
            onEdit={setEditingStaff}
            onDelete={setDeletingStaff}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Handles both creating a new in-charge account and editing an
 * existing one. Pass `staffMember` to switch into edit mode.
 */
function StaffForm({ staffMember, agencies, onClose, onCreated }) {
  const isEditing = Boolean(staffMember);
  const initialAgencyId = staffMember?.agency_id || "";
  const [form, setForm] = useState({
    fullName: staffMember?.full_name || "",
    email: staffMember?.email || "",
    password: "",
    agencyId: initialAgencyId,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const payload = {
          fullName: form.fullName,
          email: form.email,
        };
        if (form.password) {
          payload.password = form.password;
        }
        if (form.agencyId !== initialAgencyId) {
          payload.agencyId = form.agencyId || null;
        }
        await updateStaffAccount(staffMember.id, payload);
      } else {
        await createUser({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: "in_charge",
          agencyId: form.agencyId || null,
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
      className="bg-bg-primary rounded-2xl border border-border p-6 mb-6 space-y-4"
    >
      <h2 className="font-semibold text-text-primary">
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
        <Field
          label={isEditing ? "New Password" : "Password"}
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          required={!isEditing}
          type="password"
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder={isEditing ? "Leave blank to keep current" : undefined}
        />
        <AgencySelect
          id="staff-agency"
          value={form.agencyId}
          onChange={(v) => setForm({ ...form, agencyId: v })}
          agencies={agencies}
        />
      </div>

      {isEditing && (
        <p className="text-xs text-text-secondary">
          Leave the password blank to keep the current one. If this in-charge
          supervises more than one agency, only their first assignment is shown
          above; changing it here only applies if you actually pick a different
          agency.
        </p>
      )}

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", ...props }) {
  const Input = type === "password" ? PasswordInput : TextInput;
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </div>
  );
}
