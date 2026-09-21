import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  MapPin,
  CalendarDays,
  UserCog,
  UserCircle,
  Hash,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NotificationBadge from "../../components/common/NotificationBadge";
import { listStudents } from "../../services/adminApi";

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
  const [pendingStudents, setPendingStudents] = useState(0);

  useEffect(() => {
    let isMounted = true;
    listStudents()
      .then((students) => {
        if (!isMounted) return;
        const count = students.filter(
          (s) => s.approval_status === "pending",
        ).length;
        setPendingStudents(count);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

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
            className="group bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="relative inline-flex">
                <Users className="w-6 h-6 text-caap-blue" />
                <NotificationBadge count={pendingStudents} />
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 transition-all duration-200 group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-slate-800">Students</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage student accounts and agency assignments.
            </p>
          </Link>

          <Link
            to="/admin/agencies"
            className="group bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <MapPin className="w-6 h-6 text-caap-blue" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 transition-all duration-200 group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-slate-800">Agencies</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage host agencies and geofence settings.
            </p>
          </Link>

          <Link
            to="/admin/control-numbers"
            className="group bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <Hash className="w-6 h-6 text-caap-blue" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 transition-all duration-200 group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-slate-800">
              OJT Control Numbers
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Create and manage control numbers for trainees.
            </p>
          </Link>

          <Link
            to="/admin/staff"
            className="group bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <UserCog className="w-6 h-6 text-caap-blue" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 transition-all duration-200 group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-slate-800">In-Charge Accounts</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage agency supervisor accounts.
            </p>
          </Link>

          <Link
            to="/admin/holidays"
            className="group bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <CalendarDays className="w-6 h-6 text-caap-blue" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 transition-all duration-200 group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-slate-800">Holidays</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage the holiday calendar used in DTR generation.
            </p>
          </Link>

          <Link
            to="/admin/account"
            className="group bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <UserCircle className="w-6 h-6 text-caap-blue" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 transition-all duration-200 group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
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
