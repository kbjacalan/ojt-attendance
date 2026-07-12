import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getHomeRouteForRole } from "../../utils/roleRoutes";

/**
 * Used for "/" and unmatched paths. Sends signed-in users straight to
 * their role's home page instead of bouncing them through /login first
 * (GuestRoute would redirect them again anyway, this just skips the hop).
 * Signed-out users go to /login as before.
 */
export default function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <Navigate to={user ? getHomeRouteForRole(user.role) : "/login"} replace />
  );
}
