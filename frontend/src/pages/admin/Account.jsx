import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut, UserPen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AccountCard from "../../components/admin/AccountCard";
import ChangePasswordForm from "../../components/common/ChangePasswordForm";
import EditNameForm from "../../components/common/EditNameForm";

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-text-primary ring-1 ring-border"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold text-text-primary">{title}</h2>
        <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg-secondary px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">My Account</h1>
          <p className="text-sm text-text-secondary">
            Manage your profile and account security.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
          <div className="space-y-6 lg:col-span-2">
            <AccountCard fullName={user?.fullName} email={user?.email} />

            <section
              aria-label="Profile"
              className="space-y-4 rounded-2xl border border-border bg-bg-primary p-5 shadow-card sm:p-6"
            >
              <SectionHeader
                icon={UserPen}
                title="Profile Details"
                description="This name is shown across the system."
              />
              <EditNameForm />
            </section>
          </div>

          <div className="space-y-6 lg:col-span-3">
            <section
              aria-label="Security"
              className="space-y-4 rounded-2xl border border-border bg-bg-primary p-5 shadow-card sm:p-6"
            >
              <SectionHeader
                icon={KeyRound}
                title="Change Password"
                description="For your security, enter your current password before choosing a new one."
              />
              <ChangePasswordForm />
            </section>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-error-border bg-error-subtle text-error font-medium py-2.5 hover:border-error transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
