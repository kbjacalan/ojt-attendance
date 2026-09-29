import { useState } from "react";
import { Check, UserPen, LoaderCircle } from "lucide-react";
import { updateProfileRequest } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";
import TextInput from "./TextInput";

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
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Full Name
        </label>
        <TextInput
          id="en-full-name"
          type="text"
          value={fullName}
          onChange={(e) => handleChange(e.target.value)}
          required
          minLength={MIN_NAME_LENGTH}
          autoComplete="name"
          placeholder="Enter your full name"
          disabled={submitting}
        />
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-error-subtle border border-error-border text-error text-sm px-3 py-2"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg bg-success-subtle border border-success-border text-success text-sm px-3 py-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          Name updated successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || isUnchanged || trimmedName.length === 0}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand text-text-inverse font-medium py-2.5 hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
