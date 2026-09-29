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
import { greetingFor } from "../../utils/greeting";

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
    <div className="min-h-screen bg-bg-secondary px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          {greetingFor(new Date())}, {firstName}
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Here's your admin overview for today.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/students"
            className="group bg-gradient-to-br from-bg-primary to-brand/5 rounded-2xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="relative inline-flex">
                <Users className="w-6 h-6 text-text-primary" />
                <NotificationBadge count={pendingStudents} />
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-secondary/40 transition-all duration-200 group-hover:text-text-secondary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-text-primary">Students</h2>
            <p className="text-sm text-text-secondary mt-1">
              Manage student accounts and agency assignments.
            </p>
          </Link>

          <Link
            to="/admin/agencies"
            className="group bg-gradient-to-br from-bg-primary to-brand/5 rounded-2xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <MapPin className="w-6 h-6 text-text-primary" />
              <ArrowUpRight className="w-3.5 h-3.5 text-text-secondary/40 transition-all duration-200 group-hover:text-text-secondary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-text-primary">Agencies</h2>
            <p className="text-sm text-text-secondary mt-1">
              Manage host agencies and geofence settings.
            </p>
          </Link>

          <Link
            to="/admin/control-numbers"
            className="group bg-gradient-to-br from-bg-primary to-brand/5 rounded-2xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <Hash className="w-6 h-6 text-text-primary" />
              <ArrowUpRight className="w-3.5 h-3.5 text-text-secondary/40 transition-all duration-200 group-hover:text-text-secondary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-text-primary">
              OJT Control Numbers
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Create and manage control numbers for trainees.
            </p>
          </Link>

          <Link
            to="/admin/staff"
            className="group bg-gradient-to-br from-bg-primary to-brand/5 rounded-2xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <UserCog className="w-6 h-6 text-text-primary" />
              <ArrowUpRight className="w-3.5 h-3.5 text-text-secondary/40 transition-all duration-200 group-hover:text-text-secondary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-text-primary">
              In-Charge Accounts
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Manage agency supervisor accounts.
            </p>
          </Link>

          <Link
            to="/admin/holidays"
            className="group bg-gradient-to-br from-bg-primary to-brand/5 rounded-2xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <CalendarDays className="w-6 h-6 text-text-primary" />
              <ArrowUpRight className="w-3.5 h-3.5 text-text-secondary/40 transition-all duration-200 group-hover:text-text-secondary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-text-primary">Holidays</h2>
            <p className="text-sm text-text-secondary mt-1">
              Manage the holiday calendar used in DTR generation.
            </p>
          </Link>

          <Link
            to="/admin/account"
            className="group bg-gradient-to-br from-bg-primary to-brand/5 rounded-2xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <UserCircle className="w-6 h-6 text-text-primary" />
              <ArrowUpRight className="w-3.5 h-3.5 text-text-secondary/40 transition-all duration-200 group-hover:text-text-secondary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="font-semibold text-text-primary">My Account</h2>
            <p className="text-sm text-text-secondary mt-1">
              View your account info and change your password.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
