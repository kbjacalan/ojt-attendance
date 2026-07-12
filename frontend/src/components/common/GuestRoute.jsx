import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getHomeRouteForRole } from "../../utils/roleRoutes";

/**
 * Wraps a page that should only be reachable while signed out (Login, Sign
 * Up). If a session is already active — including right after a refresh,
 * once the stored session finishes loading — the user is redirected to
 * their role's home page instead of seeing the auth form.
 *
 * `replace` is used so the auth page is swapped out of history rather than
 * pushed on top of it, so pressing Back afterward can't land the user back
 * on Login/Signup either.
 *
 * Usage:
 *   <GuestRoute><Login /></GuestRoute>
 */
export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  if (user) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }

  return children;
}
