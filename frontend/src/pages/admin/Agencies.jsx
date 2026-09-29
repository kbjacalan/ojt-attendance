import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, LoaderCircle } from "lucide-react";
import {
  listAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
  listStaff,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import LocationPicker from "../../components/admin/LocationPicker";
import AgenciesTable from "../../components/admin/AgenciesTable";
import Select from "../../components/common/Select";
import { scrollBelowStickyHeader } from "../../utils/scroll";
import TextInput from "../../components/common/TextInput";

export default function Agencies() {
  const [agencies, setAgencies] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
  const [deletingAgency, setDeletingAgency] = useState(null);

  const formSectionRef = useRef(null);
  useEffect(() => {
    if ((showForm || editingAgency) && formSectionRef.current) {
      scrollBelowStickyHeader(formSectionRef.current);
    }
  }, [showForm, editingAgency]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [agenciesData, staffData] = await Promise.all([
        listAgencies(),
        listStaff(),
      ]);
      setAgencies(agenciesData);
      // Only in_charge role accounts should be assignable, not admins
      setStaff(staffData.filter((s) => s.role === "in_charge"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inChargeOptions = [
    { value: "", label: "Unassigned" },
    ...staff.map((s) => ({ value: s.id, label: s.full_name })),
  ];

  async function handleDelete(id) {
    try {
      await deleteAgency(id);
      setDeletingAgency(null);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleInChargeChange(agencyId, inChargeId) {
    try {
      await updateAgency(agencyId, { inChargeId: inChargeId || null });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-bg-secondary px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Agencies</h1>
            <p className="text-sm text-text-secondary">
              Manage OJT host agencies, geofence settings, and in-charge
              assignments.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand"
          >
            <Plus className="w-4 h-4" /> Add Agency
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-subtle border border-error-border text-error text-sm px-4 py-2">
            {error}
          </div>
        )}

        <div ref={formSectionRef}>
          {showForm && (
            <AgencyForm
              staff={staff}
              onClose={() => setShowForm(false)}
              onCreated={() => {
                setShowForm(false);
                loadData();
              }}
            />
          )}

          {editingAgency && (
            <AgencyForm
              staff={staff}
              agency={editingAgency}
              onClose={() => setEditingAgency(null)}
              onCreated={() => {
                setEditingAgency(null);
                loadData();
              }}
            />
          )}
        </div>

        {deletingAgency && (
          <ConfirmModal
            title={`Delete "${deletingAgency.name}"?`}
            message="This cannot be undone. Students currently assigned to this agency will need to be reassigned first."
            confirmLabel="Delete"
            onConfirm={() => handleDelete(deletingAgency.id)}
            onCancel={() => setDeletingAgency(null)}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center border border-border bg-bg-primary py-12 text-text-secondary shadow-card">
            <LoaderCircle className="w-5 h-5 animate-spin" />
          </div>
        ) : agencies.length === 0 ? (
          <div className="border border-border bg-bg-primary py-12 text-center text-sm text-text-secondary shadow-card">
            No agencies yet. Add one to get started.
          </div>
        ) : (
          <AgenciesTable
            agencies={agencies}
            inChargeOptions={inChargeOptions}
            onInChargeChange={handleInChargeChange}
            onEdit={setEditingAgency}
            onDelete={setDeletingAgency}
          />
        )}

        {staff.length === 0 && !loading && (
          <p className="text-xs text-text-secondary mt-3">
            No in-charge accounts exist yet.{" "}
            <Link
              to="/admin/staff"
              className="text-text-primary hover:underline underline-offset-2"
            >
              Create one on the In-Charge Accounts page
            </Link>
            .
          </p>
        )}

        <div className="mt-3">
          <Link
            to="/admin/staff"
            className="text-sm text-text-primary hover:underline underline-offset-2"
          >
            Manage in-charge accounts →
          </Link>
        </div>
      </div>
    </div>
  );
}

function AgencyForm({ staff, agency, onClose, onCreated }) {
  const isEditing = Boolean(agency);
  const [form, setForm] = useState({
    name: agency?.name || "",
    address: agency?.address || "",
    latitude: agency?.latitude ?? "",
    longitude: agency?.longitude ?? "",
    radiusMeters: agency?.radius_meters ?? 100,
    inChargeId: agency?.in_charge_id || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleLocationChange(lat, lng) {
    setForm((prev) => ({
      ...prev,
      latitude: Math.round(lat * 1e6) / 1e6,
      longitude: Math.round(lng * 1e6) / 1e6,
    }));
  }

  // Auto-fills Name/Address from the map's reverse-geocoding lookup —
  // but only into fields that are still empty, so nudging the marker
  // again after the admin has already typed a custom name/address
  // won't silently overwrite it.
  function handlePlaceFound({ name, address }) {
    setForm((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : name || prev.name,
      address: prev.address.trim() ? prev.address : address || prev.address,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      address: form.address,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      radiusMeters: Math.min(
        1000,
        Math.max(10, parseInt(form.radiusMeters, 10) || 10),
      ),
      inChargeId: form.inChargeId || null,
    };

    try {
      if (isEditing) {
        await updateAgency(agency.id, payload);
      } else {
        await createAgency(payload);
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
        {isEditing ? "Edit Agency" : "New Agency"}
      </h2>

      <LocationPicker
        latitude={parseFloat(form.latitude)}
        longitude={parseFloat(form.longitude)}
        radiusMeters={Number(form.radiusMeters) || 0}
        onLocationChange={handleLocationChange}
        onPlaceFound={handlePlaceFound}
      />

      <RadiusSlider
        value={Number(form.radiusMeters) || 10}
        onChange={(v) => setForm({ ...form, radiusMeters: v })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          required
        />
        <Field
          label="Address"
          value={form.address}
          onChange={(v) => setForm({ ...form, address: v })}
        />
        <Field
          label="Latitude"
          value={form.latitude}
          onChange={(v) => setForm({ ...form, latitude: v })}
          required
          type="number"
          step="any"
        />
        <Field
          label="Longitude"
          value={form.longitude}
          onChange={(v) => setForm({ ...form, longitude: v })}
          required
          type="number"
          step="any"
        />

        <Select
          label="In-Charge (optional)"
          size="sm"
          value={form.inChargeId}
          onChange={(v) => setForm({ ...form, inChargeId: v })}
          options={[
            { value: "", label: "Unassigned" },
            ...staff.map((s) => ({ value: s.id, label: s.full_name })),
          ]}
        />
      </div>

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : isEditing ? "Save Changes" : "Save Agency"}
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

function RadiusSlider({ value, onChange }) {
  const MIN = 10;
  const MAX = 1000;
  const clamped = Math.min(MAX, Math.max(MIN, value));
  // Position the live value bubble above the slider thumb
  const percent = ((clamped - MIN) / (MAX - MIN)) * 100;

  function handleNumberChange(e) {
    const raw = e.target.value;
    if (raw === "") {
      onChange("");
      return;
    }
    const num = parseInt(raw, 10);
    if (!Number.isNaN(num)) onChange(num);
  }

  function handleNumberBlur() {
    onChange(Math.min(MAX, Math.max(MIN, Number(value) || MIN)));
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-text-secondary">
          Geofence Radius
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={MIN}
            max={MAX}
            value={value}
            onChange={handleNumberChange}
            onBlur={handleNumberBlur}
            className="w-16 rounded-md border border-border px-1.5 py-2 text-sm text-right font-semibold text-text-primary transition-colors hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus"
          />
          <span className="text-xs text-text-secondary">m</span>
        </div>
      </div>

      <div className="relative pt-1">
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={10}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-brand cursor-pointer"
          style={{
            background: `linear-gradient(to right, #0b2447 0%, #0b2447 ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`,
          }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-text-secondary mt-1">
        <span>{MIN}m</span>
        <span>{MAX}m</span>
      </div>

      <p className="text-xs text-text-secondary mt-2">
        Students must be within this distance of the pin to time in/out.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", step }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      <TextInput
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}
