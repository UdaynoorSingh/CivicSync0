import { NavLink } from "react-router-dom";
import { Home, HeadphonesIcon } from "lucide-react";
import { useTranslation } from "../../lib/i18n";

const navItems = [
  { to: "/guest", icon: Home, labelKey: "navHome", end: true },
  {
    to: "/guest/help",
    icon: HeadphonesIcon,
    labelKey: "navHelp",
    end: false,
  },
];

export default function GuestBottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex">
      {navItems.map(({ to, icon: Icon, labelKey, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-[3px] py-2 text-[10px] font-medium transition-colors ${
              isActive ? "text-[#1E3A5F]" : "text-gray-400 hover:text-gray-600"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="truncate max-w-[56px] text-center leading-tight">
                {t(labelKey)}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
