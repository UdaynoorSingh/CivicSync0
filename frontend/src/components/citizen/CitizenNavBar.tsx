import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Bell, Lightbulb } from "lucide-react";
import { useSessionStore } from "../../store/sessionStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useTranslation } from "../../lib/i18n";
import QuickQueryPopup from "../shared/QuickQueryPopup";

export default function CitizenNavBar() {
  const { user } = useSessionStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [queryOpen, setQueryOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <>
      <header className="bg-[#1E3A5F] text-white px-4 pt-5 pb-6 mb-1 shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg text-blue-200 font-medium">{t("welcome")}</p>
            <h1 className="text-xl font-bold font-display leading-tight">
              {user?.name ?? "Citizen"}
            </h1>
          </div>
          <div className="flex gap-2 items-center mt-1">
            <button
              onClick={() => setQueryOpen(true)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Quick Help"
            >
              <Lightbulb size={18} className="text-amber-300" />
            </button>
            <button
              onClick={() => navigate("/citizen/profile")}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => navigate("/citizen/notifications")}
              className="relative w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <QuickQueryPopup open={queryOpen} onClose={() => setQueryOpen(false)} />
    </>
  );
}
