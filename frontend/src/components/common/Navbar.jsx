import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, UserCircle } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  const homeLink = getHomeRouteForRole(user?.role);
  const accountLink = user?.role === "admin" ? "/admin/account" : null;
  const initial = (user?.fullName?.trim()?.[0] || "?").toUpperCase();

  return (
    <nav className="bg-brand text-text-inverse print:hidden">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to={homeLink} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-bg-primary flex items-center justify-center p-1">
            <img
              src={caapLogo}
              alt="CAAP Philippines"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">CAAP</p>
            <p className="text-[10px] text-text-inverse-secondary -mt-0.5">
              Dipolog Airport &middot; OJT Attendance
            </p>
          </div>
        </Link>

        {user && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open profile menu"
              className="flex items-center gap-2 rounded-lg"
            >
              <span className="hidden min-w-0 text-right leading-tight sm:block">
                <span className="block max-w-40 truncate text-xs font-medium">
                  {user.fullName}
                </span>
                <span className="block text-[10px] capitalize text-text-inverse-secondary">
                  {user.role.replace("_", "-")}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-sm font-semibold text-text-inverse ring-1 ring-text-inverse-secondary/40"
              >
                {initial}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="menu-in absolute right-0 z-50 mt-3 w-64 origin-top-right rounded-2xl border border-border bg-bg-primary p-2 text-text-primary shadow-modal"
              >
                <div className="flex items-center gap-3 rounded-xl bg-bg-secondary px-3 py-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-text-inverse"
                  >
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-tight">
                      {user.fullName}
                    </p>
                    {user.email && (
                      <p className="truncate text-xs text-text-secondary">
                        {user.email}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] font-medium capitalize tracking-wide text-text-secondary">
                      {user.role.replace("_", "-")}
                    </p>
                  </div>
                </div>

                <div className="mt-1.5 flex flex-col gap-0.5">
                  {accountLink && (
                    <>
                      <Link
                        to={accountLink}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors hover:bg-bg-secondary"
                      >
                        <UserCircle className="h-4 w-4 text-text-secondary transition-colors group-hover:text-text-primary" />
                        My Account
                      </Link>
                      <div
                        aria-hidden="true"
                        className="mx-2 my-1 h-px bg-border"
                      />
                    </>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-error transition-colors hover:bg-error-subtle"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
