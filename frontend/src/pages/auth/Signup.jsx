import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoaderCircle, UserPlus, CheckCircle2, Check, X } from "lucide-react";
import {
  signupRequest,
  listPublicAgencies,
  listPublicControlNumbers,
} from "../../services/authApi";
import { formatBatchLabel, getCurrentBatchValue } from "../../utils/batch";
import { validateOfficialHours } from "../../utils/officialHours";
import PasswordInput from "../../components/common/PasswordInput";
import AgencySelect from "../../components/common/AgencySelect";
import ControlNumberSelect from "../../components/common/ControlNumberSelect";
import OfficialHoursFields from "../../components/common/OfficialHoursFields";
import caapLogo from "../../assets/caap_logo.png";
import TextInput from "../../components/common/TextInput";

const MIN_PASSWORD_LENGTH = 8;

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
    agencyId: "",
    controlNumberId: "",
    requiredHours: "",
    amStart: "08:00",
    amEnd: "12:00",
    pmStart: "13:00",
    pmEnd: "17:00",
  });
  const [agencies, setAgencies] = useState([]);
  const [controlNumbers, setControlNumbers] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    listPublicAgencies()
      .then(setAgencies)
      .catch(() => setAgencies([]));
    listPublicControlNumbers()
      .then(setControlNumbers)
      .catch(() => setControlNumbers([]));
  }, []);

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
    setAttemptedSubmit(true);

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
    if (!form.agencyId) {
      setError("Please select your OJT agency.");
      return;
    }
    if (!form.controlNumberId) {
      setError("Please select your OJT control number.");
      return;
    }
    const officialHoursError = validateOfficialHours(form);
    if (officialHoursError) {
      setError(officialHoursError);
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
        agencyId: form.agencyId,
        controlNumberId: form.controlNumberId,
        requiredHours: form.requiredHours || null,
        amStart: form.amStart,
        amEnd: form.amEnd,
        pmStart: form.pmStart,
        pmEnd: form.pmEnd,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-bg-primary rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-success-subtle flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h1 className="text-lg font-bold text-text-primary mb-2">
            Registration Submitted
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            Your account has been created and is awaiting admin approval. You
            can log in once approved.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full rounded-lg bg-brand text-text-inverse font-medium py-2.5 hover:bg-brand-hover disabled:hover:bg-brand transition-colors"
          >
            Back to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl p-8">
        <div className="text-center mb-6">
          <img
            src={caapLogo}
            alt="CAAP Philippines"
            className="w-20 h-auto mx-auto mb-3"
          />
          <h1 className="text-xl font-bold text-text-primary">Student Sign Up</h1>
          <p className="text-sm text-text-secondary">
            CAAP OJT Attendance, Dipolog Airport
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <FormSection title="Your Details">
            <div>
              <label
                htmlFor="signup-fullName"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Full Name
              </label>
              <TextInput
                id="signup-fullName"
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                autoComplete="name"
                placeholder="e.g. Juan Dela Cruz"
                disabled={submitting}
              />
            </div>

            <div>
              <label
                htmlFor="signup-course"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Course
              </label>
              <TextInput
                id="signup-course"
                type="text"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                placeholder="e.g. BSIT"
                disabled={submitting}
              />
            </div>

            <div>
              <label
                htmlFor="signup-university"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                University
              </label>
              <TextInput
                id="signup-university"
                type="text"
                value={form.university}
                onChange={(e) =>
                  setForm({ ...form, university: e.target.value })
                }
                placeholder="e.g. JRMSU"
                disabled={submitting}
              />
            </div>
          </FormSection>

          <FormSection title="OJT Details">
            <div>
              <label
                htmlFor="signup-batch"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                OJT Batch
              </label>
              <TextInput
                id="signup-batch"
                type="month"
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                required
                disabled={submitting}
              />
              <p className="text-xs text-text-secondary mt-1">
                The month and year your OJT starts, this is your batch.
                {form.batch && (
                  <>
                    {" "}
                    You'll be grouped under{" "}
                    <span className="font-medium text-text-secondary">
                      {formatBatchLabel(form.batch)}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            <AgencySelect
              id="signup-agency"
              variant="spacious"
              value={form.agencyId}
              onChange={(v) => setForm({ ...form, agencyId: v })}
              agencies={agencies}
              required
              disabled={submitting}
              helperText="The host agency where you'll render your OJT hours."
            />

            <ControlNumberSelect
              id="signup-controlNumber"
              variant="spacious"
              value={form.controlNumberId}
              onChange={(v) => setForm({ ...form, controlNumberId: v })}
              controlNumbers={controlNumbers}
              required
              disabled={submitting}
              helperText="Given by the admin, used to gain entry at CAAP."
            />

            <div>
              <label
                htmlFor="signup-requiredHours"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Required Hours{" "}
                <span className="text-text-secondary font-normal">(optional)</span>
              </label>
              <TextInput
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
              />
              <p className="text-xs text-text-secondary mt-1">
                Total OJT hours you're required to render. Defaults to 486 if
                left blank.
              </p>
            </div>

            <OfficialHoursFields
              variant="spacious"
              value={form}
              onChange={(v) => setForm({ ...form, ...v })}
              disabled={submitting}
              showValidation={attemptedSubmit}
              description="Your regular time in/out will automatically appear in your DTR's Official Hours section. Adjust it if your OJT schedule is different."
            />
          </FormSection>

          <FormSection title="Account">
            <div>
              <label
                htmlFor="signup-email"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                Email
              </label>
              <TextInput
                id="signup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                placeholder="you@example.com"
                disabled={submitting}
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="block text-sm font-medium text-text-primary mb-1"
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
                    passwordLongEnough ? "text-success" : "text-text-secondary"
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
                className="block text-sm font-medium text-text-primary mb-1"
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
                    passwordsMatch ? "text-success" : "text-error"
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
              className="rounded-lg bg-error-subtle border border-error-border text-error text-sm px-3 py-2"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || passwordsMismatch}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand text-text-inverse font-medium py-2.5 hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        <p className="text-center text-sm text-text-secondary mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-text-primary font-medium hover:underline underline-offset-2 transition-colors"
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
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide border-b border-border pb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}
