import { useState } from "react";
import { Check, UserPen, LoaderCircle } from "lucide-react";
import { updateProfileRequest } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";

const MIN_NAME_LENGTH = 2;

/**
 * Self-service "rename myself" form. Shared across roles the same way
 * as ChangePasswordForm — currently used on the admin side (see
 * pages/admin/Account.jsx).
 */
export default function EditNameForm() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const trimmedName = fullName.trim();
  const isUnchanged = trimmedName === (user?.fullName || "");

  function handleChange(value) {
    setFullName(value);
    if (success) setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (trimmedName.length < MIN_NAME_LENGTH) {
      setError(`Name must be at least ${MIN_NAME_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const { user: updatedUser } = await updateProfileRequest(trimmedName);
      updateUser(updatedUser);
      setFullName(updatedUser.fullName);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="en-full-name"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Full Name
        </label>
        <input
          id="en-full-name"
          type="text"
          value={fullName}
          onChange={(e) => handleChange(e.target.value)}
          required
          minLength={MIN_NAME_LENGTH}
          autoComplete="name"
          placeholder="Enter your full name"
          disabled={submitting}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:opacity-50"
        />
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          Name updated successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || isUnchanged || trimmedName.length === 0}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-caap-navy text-white font-medium py-2.5 hover:bg-caap-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <>
            <LoaderCircle className="w-4 h-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <UserPen className="w-4 h-4" />
            Save Name
          </>
        )}
      </button>
    </form>
  );
}
