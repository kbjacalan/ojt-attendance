import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Pencil, MapPin, LoaderCircle } from "lucide-react";
import {
  listAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
  listStaff,
} from "../../services/adminApi";
import ConfirmModal from "../../components/common/ConfirmModal";
import LocationPicker from "../../components/admin/LocationPicker";

export default function Agencies() {
  const [agencies, setAgencies] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
  const [deletingAgency, setDeletingAgency] = useState(null);

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
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agencies</h1>
            <p className="text-sm text-slate-500">
              Manage OJT host agencies, geofence settings, and in-charge
              assignments.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue"
          >
            <Plus className="w-4 h-4" /> Add Agency
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            {error}
          </div>
        )}

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

        {deletingAgency && (
          <ConfirmModal
            title={`Delete "${deletingAgency.name}"?`}
            message="This cannot be undone. Students currently assigned to this agency will need to be reassigned first."
            confirmLabel="Delete"
            onConfirm={() => handleDelete(deletingAgency.id)}
            onCancel={() => setDeletingAgency(null)}
          />
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <LoaderCircle className="w-5 h-5 animate-spin" />
            </div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No agencies yet. Add one to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Coordinates</th>
                  <th className="px-4 py-3 font-medium">Radius</th>
                  <th className="px-4 py-3 font-medium">Students</th>
                  <th className="px-4 py-3 font-medium">In-Charge</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agencies.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {a.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {a.address}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.latitude}, {a.longitude}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.radius_meters}m
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.student_count}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.in_charge_id || ""}
                        onChange={(e) =>
                          handleInChargeChange(a.id, e.target.value)
                        }
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setEditingAgency(a)}
                          className="text-slate-500 hover:text-slate-800"
                          title="Edit agency"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingAgency(a)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete agency"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {staff.length === 0 && !loading && (
          <p className="text-xs text-slate-400 mt-3">
            No in-charge accounts exist yet.{" "}
            <Link
              to="/admin/staff"
              className="text-caap-blue hover:text-caap-navy underline"
            >
              Create one on the In-Charge Accounts page
            </Link>
            .
          </p>
        )}

        <div className="mt-3">
          <Link
            to="/admin/staff"
            className="text-sm text-caap-blue hover:text-caap-navy underline"
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
        Math.max(50, parseInt(form.radiusMeters, 10) || 50),
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
      className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 space-y-4"
    >
      <h2 className="font-semibold text-slate-800">
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
        value={Number(form.radiusMeters) || 50}
        onChange={(v) => setForm({ ...form, radiusMeters: v })}
      />

      <div className="grid grid-cols-2 gap-4">
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

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            In-Charge (optional)
          </label>
          <select
            value={form.inChargeId}
            onChange={(e) => setForm({ ...form, inChargeId: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-caap-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-caap-blue disabled:opacity-50"
        >
          {submitting ? "Saving…" : isEditing ? "Save Changes" : "Save Agency"}
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

function RadiusSlider({ value, onChange }) {
  const MIN = 50;
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
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate-600">
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
            className="w-16 rounded-md border border-slate-300 px-1.5 py-0.5 text-sm text-right font-semibold text-caap-navy focus:outline-none focus:ring-2 focus:ring-caap-blue"
          />
          <span className="text-xs text-slate-400">m</span>
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
          className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-caap-navy cursor-pointer"
          style={{
            background: `linear-gradient(to right, #0b2447 0%, #0b2447 ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`,
          }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
        <span>{MIN}m</span>
        <span>{MAX}m</span>
      </div>

      <p className="text-xs text-slate-400 mt-2">
        Students must be within this distance of the pin to time in/out.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", step }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
      />
    </div>
  );
}
