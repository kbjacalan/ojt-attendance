import { Link } from "react-router-dom";
import {
  Users,
  MapPin,
  CalendarDays,
  UserCog,
  UserCircle,
  Hash,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function greetingFor(now) {
  const phHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false,
    }).format(now),
    10,
  );
  if (phHour < 12) return "Good morning";
  if (phHour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] || "Admin";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {greetingFor(new Date())}, {firstName}
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Here's your admin overview for today.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/students"
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <Users className="w-6 h-6 text-caap-blue mb-3" />
            <h2 className="font-semibold text-slate-800">Students</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage student accounts and agency assignments.
            </p>
          </Link>

          <Link
            to="/admin/agencies"
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <MapPin className="w-6 h-6 text-caap-blue mb-3" />
            <h2 className="font-semibold text-slate-800">Agencies</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage host agencies and geofence settings.
            </p>
          </Link>

          <Link
            to="/admin/control-numbers"
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <Hash className="w-6 h-6 text-caap-blue mb-3" />
            <h2 className="font-semibold text-slate-800">
              OJT Control Numbers
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Create and manage control numbers for trainees.
            </p>
          </Link>

          <Link
            to="/admin/staff"
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <UserCog className="w-6 h-6 text-caap-blue mb-3" />
            <h2 className="font-semibold text-slate-800">In-Charge Accounts</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage agency supervisor accounts.
            </p>
          </Link>

          <Link
            to="/admin/holidays"
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <CalendarDays className="w-6 h-6 text-caap-blue mb-3" />
            <h2 className="font-semibold text-slate-800">Holidays</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage the holiday calendar used in DTR generation.
            </p>
          </Link>

          <Link
            to="/admin/account"
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <UserCircle className="w-6 h-6 text-caap-blue mb-3" />
            <h2 className="font-semibold text-slate-800">My Account</h2>
            <p className="text-sm text-slate-500 mt-1">
              View your account info and change your password.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
