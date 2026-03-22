import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Bell,
  Map,
  LogOut,
  Receipt,
} from "lucide-react";
import { useSessionStore } from "../store/sessionStore";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/complaints", icon: FileText, label: "Complaints", end: false },
  { to: "/admin/requests", icon: Settings, label: "Requests", end: false },
  { to: "/admin/bills", icon: Receipt, label: "Bills", end: false },
  { to: "/admin/notifications", icon: Bell, label: "Notifications", end: false },
  { to: "/admin/map", icon: Map, label: "Map View", end: false },
];

export default function AdminLayout() {
  const { user, logout } = useSessionStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 min-h-screen bg-[#1E3A5F] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-lg">
              {user?.name?.[0] ?? "A"}
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.name ?? "Admin"}</p>
              <p className="text-xs text-blue-200">{String(user?.department ?? "Municipal")}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white border-r-4 border-blue-300"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
