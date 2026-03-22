import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Megaphone, AlertTriangle, Clock, Bell } from "lucide-react";
import { useNotificationStore } from "../../store/notificationStore";
import type { NotifType } from "../../data/dummyData";

const typeConfig: Record<
  NotifType,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bg: string;
  }
> = {
  announcement: { icon: Megaphone, color: "text-blue-600", bg: "bg-blue-50" },
  outage: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  reminder: { icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
  emergency: { icon: Bell, color: "text-red-700", bg: "bg-red-100" },
};

export default function AdminNotificationsPage() {
  const { notifications, addNotification, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotifType>("announcement");
  const [pushed, setPushed] = useState(false);

  const handlePush = () => {
    if (!title.trim() || !body.trim()) return;
    addNotification({
      type,
      title,
      body,
    });
    setPushed(true);
    setTitle("");
    setBody("");
    setTimeout(() => setPushed(false), 3000);
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 font-display mb-5">
        Push Notifications
      </h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Compose Form */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Megaphone size={18} className="text-orange-500" /> Compose
            Notification
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">
                Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "announcement",
                    "outage",
                    "reminder",
                    "emergency",
                  ] as NotifType[]
                ).map((t) => {
                  const { icon: Icon, color } = typeConfig[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium capitalize transition-all ${type === t ? "border-[#1E3A5F] text-[#1E3A5F] bg-blue-50" : "border-gray-200 text-gray-500"}`}
                    >
                      <Icon size={14} className={type === t ? color : ""} />
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>

            {pushed && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 font-medium"
              >
                ✓ Notification pushed to all citizens!
              </motion.div>
            )}

            <button
              onClick={handlePush}
              disabled={!title.trim() || !body.trim()}
              className="w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#163050] transition-colors disabled:opacity-50"
            >
              <Send size={16} /> Push to All Citizens
            </button>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-700 mb-4">Notification History</h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {[...notifications].reverse().map((n) => {
              const typeKey = (n.type as NotifType) in typeConfig ? (n.type as NotifType) : "announcement";
              const { icon: Icon, color, bg } = typeConfig[typeKey];
              return (
                <div
                  key={n.id}
                  className="flex gap-3 py-3 border-b border-gray-50 last:border-0"
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon size={14} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-1">{n.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
