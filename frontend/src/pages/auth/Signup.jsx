import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoaderCircle, UserPlus, CheckCircle2, Check, X } from "lucide-react";
import { signupRequest } from "../../services/authApi";
import { formatBatchLabel, getCurrentBatchValue } from "../../utils/batch";
import PasswordInput from "../../components/common/PasswordInput";
import caapLogo from "../../assets/caap_logo.png";

const MIN_PASSWORD_LENGTH = 8;

/** Converts "HH:MM" 24-hour string to "h:mm AM/PM" for the Official Hours preview. */
function to12Hour(time24) {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

/**
 * Builds the free-text "Official Hours" string shown on the DTR from
 * the four granular time-in/time-out picks (morning + afternoon).
 * Any block left blank is simply omitted from the summary.
 */
function buildOfficialHoursText({
  morningIn,
  morningOut,
  afternoonIn,
  afternoonOut,
}) {
  const parts = [];
  if (morningIn && morningOut) {
    parts.push(`Morning: ${to12Hour(morningIn)} - ${to12Hour(morningOut)}`);
  }
  if (afternoonIn && afternoonOut) {
    parts.push(
      `Afternoon: ${to12Hour(afternoonIn)} - ${to12Hour(afternoonOut)}`,
    );
  }
  return parts.join("  |  ");
}

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    course: "",
    university: "",
    batch: getCurrentBatchValue(),
    requiredHours: "",
    morningIn: "08:00",
    morningOut: "12:00",
    afternoonIn: "13:00",
    afternoonOut: "17:00",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const officialHoursPreview = buildOfficialHoursText(form);

  // Live feedback so a mistyped/mismatched password is caught while
  // filling the form, not only after scrolling back down from a
  // rejected submit at the very bottom of a long page.
  const passwordLongEnough = form.password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (
      form.requiredHours &&
      (isNaN(Number(form.requiredHours)) || Number(form.requiredHours) <= 0)
    ) {
      setError("Required hours must be a positive number.");
      return;
    }
    if (!form.batch) {
      setError("Please select your OJT batch (month and year).");
      return;
    }

    setSubmitting(true);
    try {
      await signupRequest({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        course: form.course,
        university: form.university || null,
        batch: form.batch,
        requiredHours: form.requiredHours || null,
        officialHoursText: officialHoursPreview || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-caap-navy to-caap-blue flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">
            Registration Submitted
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Your account has been created and is awaiting admin approval. You
            can log in once approved.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full rounded-lg bg-caap-navy text-white font-medium py-2.5 hover:bg-caap-blue transition-colors"
          >
            Back to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl p-8">
        <div className="text-center mb-6">
          <img
            src={caapLogo}
            alt="CAAP Philippines"
            className="w-20 h-auto mx-auto mb-3"
          />
          <h1 className="text-xl font-bold text-caap-navy">Student Sign Up</h1>
          <p className="text-sm text-slate-500">
            CAAP OJT Attendance, Dipolog Airport
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <FormSection title="Your Details">
            <div>
              <label
                htmlFor="signup-fullName"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="signup-fullName"
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                autoComplete="name"
                placeholder="e.g. Juan Dela Cruz"
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="signup-course"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Course
              </label>
              <input
                id="signup-course"
                type="text"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                placeholder="e.g. BSIT"
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="signup-university"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                University
              </label>
              <input
                id="signup-university"
                type="text"
                value={form.university}
                onChange={(e) =>
                  setForm({ ...form, university: e.target.value })
                }
                placeholder="e.g. JRMSU"
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </FormSection>

          <FormSection title="OJT Details">
            <div>
              <label
                htmlFor="signup-batch"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                OJT Batch
              </label>
              <input
                id="signup-batch"
                type="month"
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="text-xs text-slate-400 mt-1">
                The month and year your OJT starts, this is your batch.
                {form.batch && (
                  <>
                    {" "}
                    You'll be grouped under{" "}
                    <span className="font-medium text-slate-500">
                      {formatBatchLabel(form.batch)}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            <div>
              <label
                htmlFor="signup-requiredHours"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Required Hours{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="signup-requiredHours"
                type="number"
                min="1"
                step="1"
                value={form.requiredHours}
                onChange={(e) =>
                  setForm({ ...form, requiredHours: e.target.value })
                }
                placeholder="e.g. 486"
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="text-xs text-slate-400 mt-1">
                Total OJT hours you're required to render. Defaults to 486 if
                left blank.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Official Hours{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Your regular time in/out, this will automatically show up in the
                Official Hours section of your DTR. Adjust if your OJT hours are
                different.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <TimeField
                  label="Morning Time In"
                  value={form.morningIn}
                  onChange={(v) => setForm({ ...form, morningIn: v })}
                  disabled={submitting}
                />
                <TimeField
                  label="Morning Time Out"
                  value={form.morningOut}
                  onChange={(v) => setForm({ ...form, morningOut: v })}
                  disabled={submitting}
                />
                <TimeField
                  label="Afternoon Time In"
                  value={form.afternoonIn}
                  onChange={(v) => setForm({ ...form, afternoonIn: v })}
                  disabled={submitting}
                />
                <TimeField
                  label="Afternoon Time Out"
                  value={form.afternoonOut}
                  onChange={(v) => setForm({ ...form, afternoonOut: v })}
                  disabled={submitting}
                />
              </div>
              {officialHoursPreview && (
                <p className="text-xs text-slate-500 mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  Preview: {officialHoursPreview}
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Account">
            <div>
              <label
                htmlFor="signup-email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                placeholder="you@example.com"
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <PasswordInput
                id="signup-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                disabled={submitting}
              />
              {form.password.length > 0 && (
                <p
                  className={`flex items-center gap-1 text-xs mt-1 ${
                    passwordLongEnough ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {passwordLongEnough ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  At least {MIN_PASSWORD_LENGTH} characters
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="signup-confirmPassword"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Confirm Password
              </label>
              <PasswordInput
                id="signup-confirmPassword"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                required
                autoComplete="new-password"
                placeholder="Re-enter your password"
                disabled={submitting}
              />
              {form.confirmPassword.length > 0 && (
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
          </FormSection>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || passwordsMismatch}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-caap-navy text-white font-medium py-2.5 hover:bg-caap-blue disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Sign Up
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-caap-blue hover:text-caap-navy font-medium"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Groups related fields under a small uppercase heading so an
 * eleven-field form reads as three short sections instead of one
 * long, undifferentiated wall of inputs.
 */
function FormSection({ title, children }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function TimeField({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}
