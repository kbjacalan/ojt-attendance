import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getHomeRouteForRole } from "../../utils/roleRoutes";
import caapLogo from "../../assets/caap_logo.png";

/**
 * Shared top navigation bar. Shown on every authenticated page.
 * The CAAP logo/name always routes back to that role's main page.
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const homeLink = getHomeRouteForRole(user?.role);

  return (
    <nav className="bg-caap-navy text-white print:hidden">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to={homeLink} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1">
            <img
              src={caapLogo}
              alt="CAAP Philippines"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">CAAP</p>
            <p className="text-[10px] text-caap-sky -mt-0.5">
              Dipolog Airport &middot; OJT Attendance
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <span className="text-xs text-caap-sky hidden sm:inline">
              {user.fullName} &middot;{" "}
              <span className="capitalize">{user.role.replace("_", "-")}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm bg-caap-blue hover:bg-caap-sky/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
