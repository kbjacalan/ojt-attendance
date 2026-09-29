import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LoaderCircle, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getHomeRouteForRole } from "../../utils/roleRoutes";
import PasswordInput from "../../components/common/PasswordInput";
import caapLogo from "../../assets/caap_logo.png";
import TextInput from "../../components/common/TextInput";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await login(email, password);
      // `replace: true` swaps Login out of history so the Back button
      // can't land the user on it again after signing in.
      navigate(getHomeRouteForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
    // Deliberately not resetting `submitting` in a `finally` on the
    // success path: navigate() unmounts this page, and leaving the
    // button in its loading state until then avoids a flash of the
    // enabled button right before the page changes.
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl p-8">
        <div className="text-center mb-6">
          <img
            src={caapLogo}
            alt="CAAP Philippines"
            className="w-20 h-auto mx-auto mb-3"
          />
          <h1 className="text-xl font-bold text-text-primary">
            CAAP OJT Attendance
          </h1>
          <p className="text-sm text-text-secondary">
            Dipolog Airport, Zamboanga del Norte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Email
            </label>
            <TextInput
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              disabled={submitting}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Password
            </label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={submitting}
              placeholder="Enter your password"
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand text-text-inverse font-medium py-2.5 hover:bg-brand-hover disabled:hover:bg-brand disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Logging in…
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Log In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Don't have an account yet?{" "}
          <Link
            to="/signup"
            className="text-text-primary font-medium hover:underline underline-offset-2 transition-colors"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
