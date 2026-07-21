import { useState } from "react";
import { Check, X, KeyRound, LoaderCircle } from "lucide-react";
import { changePasswordRequest } from "../../services/authApi";
import PasswordInput from "./PasswordInput";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Self-service "change my password" form. Requires the current password
 * for verification (checked server-side) before a new one can be set.
 * Shared across roles so every account-settings page behaves and looks
 * the same — currently used on the admin side (see pages/admin/Account.jsx).
 */
export default function ChangePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const newPasswordLongEnough = form.newPassword.length >= MIN_PASSWORD_LENGTH;
  const newPasswordIsDifferent =
    form.newPassword.length > 0 && form.newPassword !== form.currentPassword;
  const passwordsMatch =
    form.confirmNewPassword.length > 0 &&
    form.newPassword === form.confirmNewPassword;
  const passwordsMismatch =
    form.confirmNewPassword.length > 0 &&
    form.newPassword !== form.confirmNewPassword;

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (success) setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setSubmitting(true);
    try {
      await changePasswordRequest(form.currentPassword, form.newPassword);
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
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
          htmlFor="cp-current-password"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Current Password
        </label>
        <PasswordInput
          id="cp-current-password"
          value={form.currentPassword}
          onChange={(e) => updateField("currentPassword", e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Enter your current password"
          disabled={submitting}
        />
      </div>

      <div>
        <label
          htmlFor="cp-new-password"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          New Password
        </label>
        <PasswordInput
          id="cp-new-password"
          value={form.newPassword}
          onChange={(e) => updateField("newPassword", e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          disabled={submitting}
        />
        {form.newPassword.length > 0 && (
          <div className="mt-1 space-y-0.5">
            <p
              className={`flex items-center gap-1 text-xs ${
                newPasswordLongEnough ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {newPasswordLongEnough ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              At least {MIN_PASSWORD_LENGTH} characters
            </p>
            <p
              className={`flex items-center gap-1 text-xs ${
                newPasswordIsDifferent ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {newPasswordIsDifferent ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Different from current password
            </p>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="cp-confirm-new-password"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Confirm New Password
        </label>
        <PasswordInput
          id="cp-confirm-new-password"
          value={form.confirmNewPassword}
          onChange={(e) => updateField("confirmNewPassword", e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          disabled={submitting}
        />
        {form.confirmNewPassword.length > 0 && (
          <p
            className={`flex items-center gap-1 text-xs mt-1 ${
              passwordsMatch ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {passwordsMatch ? (
              <>
                <Check className="w-3.5 h-3.5" /> Passwords match
              </>
            ) : (
              <>
                <X className="w-3.5 h-3.5" /> Passwords don't match
              </>
            )}
          </p>
        )}
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
          Password changed successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || passwordsMismatch}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-caap-navy text-white font-medium py-2.5 hover:bg-caap-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <>
            <LoaderCircle className="w-4 h-4 animate-spin" />
            Changing Password…
          </>
        ) : (
          <>
            <KeyRound className="w-4 h-4" />
            Change Password
          </>
        )}
      </button>
    </form>
  );
}
