import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, Megaphone, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { useNotificationStore } from "../../store/notificationStore";
import { useTranslation } from "../../lib/i18n";
import type { NotifType } from "../../data/dummyData";

const notifConfig: Record<
  NotifType,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    bg: string;
    text: string;
  }
> = {
  announcement: { icon: Megaphone, bg: "bg-blue-50", text: "text-blue-600" },
  outage: { icon: AlertTriangle, bg: "bg-red-50", text: "text-red-600" },
  reminder: { icon: Clock, bg: "bg-orange-50", text: "text-orange-600" },
  emergency: { icon: Bell, bg: "bg-red-100", text: "text-red-700" },
};

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead, fetchNotifications, deleteNotification, deleteAllNotifications } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-600">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            {t("notifications")}
          </h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={markAllRead}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            {t("markAllRead")}
          </button>
          <button
            onClick={deleteAllNotifications}
            className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
          >
            <Trash2 size={12} /> Clear All
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p>{t("noNotifications")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
          {notifications.map((n, i) => {
            const typeKey = (n.type as NotifType) in notifConfig ? (n.type as NotifType) : "announcement";
            const { icon: Icon, bg, text } = notifConfig[typeKey];
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => markRead(n.id)}
                className={`w-full rounded-2xl p-4 shadow-sm text-left flex gap-3 cursor-pointer group transition-colors ${!n.read ? "bg-blue-50/50 ring-1 ring-blue-200" : "bg-white hover:bg-gray-50"}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                >
                  <Icon size={18} className={text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${n.read ? "text-gray-700" : "text-gray-900"}`}
                    >
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.read && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block flex-shrink-0 shadow-sm mt-0.5" title="Unread"></span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all sm:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                    {n.body}
                  </p>
                  <p className="text-[10px] text-gray-300 mt-1.5">{n.date}</p>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
