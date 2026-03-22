import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Users, MessageSquareText, LogOut } from "lucide-react";
import { useSessionStore } from "../store/sessionStore";

const navItems = [
  { to: "/head-admin", icon: Users, label: "Department Admins", end: true },
  { to: "/head-admin/feedbacks", icon: MessageSquareText, label: "Feedbacks", end: false },
];

export default function HeadAdminLayout() {
  const { user, logout } = useSessionStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-72 min-h-screen bg-[#1E3A5F] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <p className="text-xs text-blue-200 uppercase tracking-wide">CivicSync</p>
          <h2 className="text-xl font-bold mt-1">Head Admin Panel</h2>
          <p className="text-sm text-blue-200 mt-2">{user?.mobile ?? "Head Admin"}</p>
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
            onClick={() => void handleLogout()}
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
