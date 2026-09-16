import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Hash,
  CalendarDays,
  UserCog,
  UserCircle,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/agencies", label: "Agencies", icon: MapPin },
  { to: "/admin/control-numbers", label: "OJT Control Numbers", icon: Hash },
  { to: "/admin/holidays", label: "Holidays", icon: CalendarDays },
  { to: "/admin/staff", label: "In-Charge Accounts", icon: UserCog },
  { to: "/admin/account", label: "My Account", icon: UserCircle },
];

function isActivePath(pathname, to) {
  if (to === "/admin/students") {
    return pathname.startsWith("/admin/students");
  }
  return pathname === to;
}

export default function AdminSubNav() {
  const { pathname } = useLocation();

  return (
    <div className="bg-white border-b border-slate-200 print:hidden overflow-x-auto">
      <div className="max-w-5xl mx-auto flex items-stretch text-xs text-white">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.to);
          const color = active ? "bg-caap-blue" : "bg-white text-black";

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex items-center gap-1.5 whitespace-nowrap py-1.5 pl-4 pr-5 transition-colors ${color} ${
                index > 0 ? "-ml-2" : ""
              }`}
              style={{
                clipPath:
                  index === 0
                    ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                    : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
                zIndex: NAV_ITEMS.length - index,
              }}
            >
              <Icon className="w-3 h-3" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
