import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import ReportBugButton from "./ReportBugButton";
import AdminSubNav from "./AdminSubNav";
import { useAuth } from "../../context/AuthContext";

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const showAdminSubNav =
    user?.role === "admin" && location.pathname !== "/admin/dashboard";

  return (
    <>
      <div className="sticky top-0 z-40 shadow-sm print:static print:shadow-none">
        <Navbar />
        {showAdminSubNav && <AdminSubNav />}
      </div>
      <Outlet />
      <ReportBugButton />
    </>
  );
}
