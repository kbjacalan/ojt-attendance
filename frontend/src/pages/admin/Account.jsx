import { UserCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordForm from "../../components/common/ChangePasswordForm";

export default function Account() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <UserCircle className="w-6 h-6 text-caap-blue" />
          <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Manage your account credentials.
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mb-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            Account Info
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {user?.fullName}
          </p>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Change Password</h2>
          <p className="text-xs text-slate-500 mb-4">
            For your security, enter your current password before choosing a new
            one.
          </p>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
