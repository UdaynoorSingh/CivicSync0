import { useEffect, useState } from "react";
import { AlertCircle, Bell, ChevronDown, Loader } from "lucide-react";
import * as api from "../../lib/api";

interface District {
  _id: string;
  name: string;
  state: string;
}

interface Notification {
  _id: string;
  title: string;
  body: string;
  type:
    | "outage"
    | "announcement"
    | "emergency"
    | "service_update"
    | "maintenance"
    | "reminder";
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  expiresAt?: string;
}

const GuestNotifications = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setLoadingDistricts(true);
        setError(null);
        const data = await api.getDistricts();

        if (data.success && data.districts) {
          setDistricts(
            data.districts.map((d) => ({
              _id: d.id || "",
              name: d.name,
              state: d.state,
            })),
          );
          // Auto-select first district
          if (data.districts.length > 0) {
            setSelectedDistrictId(data.districts[0].id || "");
          }
        } else {
          setError(data.message || "Failed to load districts");
        }
      } catch (err) {
        setError("Unable to load districts. Please try again.");
        console.error("Error fetching districts:", err);
      } finally {
        setLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, []);

  // Fetch notifications when district changes
  useEffect(() => {
    if (!selectedDistrictId) return;

    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);
        setError(null);
        const data =
          await api.getPublicNotificationsByDistrict(selectedDistrictId);

        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(
            data.notifications.map((notif) => ({
              _id: notif._id,
              title: notif.title,
              body: notif.body,
              type: notif.type as Notification["type"],
              priority: notif.priority as Notification["priority"],
              createdAt: notif.createdAt,
              expiresAt: notif.updatedAt,
            })),
          );
        } else {
          setError(data.message || "Failed to load notifications");
          setNotifications([]);
        }
      } catch (err) {
        setError("Unable to load notifications. Please try again.");
        console.error("Error fetching notifications:", err);
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [selectedDistrictId]);

  // Type to badge color mapping
  const getNotificationBadgeColor = (
    type: Notification["type"],
    priority: Notification["priority"],
  ): string => {
    if (
      priority === "critical" ||
      priority === "high" ||
      type === "emergency"
    ) {
      return "bg-red-100 text-red-800";
    }
    switch (type) {
      case "outage":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-orange-100 text-orange-800";
      case "announcement":
        return "bg-blue-100 text-blue-800";
      case "service_update":
        return "bg-green-100 text-green-800";
      case "reminder":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format type for display
  const formatType = (type: string): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Format timestamp to relative time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#EEF0FB] pb-20">
      {/* Header */}
      <header className="bg-[#1E3A5F] text-white px-4 py-5 shadow-md rounded-2xl">
        <div className="flex items-center gap-3">
          <Bell size={24} />
          <div>
            <h1 className="text-xl font-bold font-display">District Alerts</h1>
            <p className="text-sm text-blue-200">
              Stay informed about local updates
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* District Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
            Select District
          </label>
          {loadingDistricts ? (
            <div className="h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-300">
              <Loader size={20} className="text-[#1E3A5F] animate-spin" />
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-2xl px-4 py-3 text-[#1E3A5F] font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] cursor-pointer"
              >
                <option value="">Choose a district...</option>
                {districts.map((district) => (
                  <option key={district._id} value={district._id}>
                    {district.name}, {district.state}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={20}
                className="absolute right-4 top-3.5 text-[#1E3A5F] pointer-events-none"
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
            <AlertCircle
              size={20}
              className="text-red-600 flex-shrink-0 mt-0.5"
            />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Notifications List */}
        <div>
          {loadingNotifications ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader size={32} className="text-[#1E3A5F] animate-spin mb-3" />
              <p className="text-gray-600 text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <Bell size={40} className="text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                No active notifications
              </p>
              <p className="text-gray-500 text-sm mt-1">
                All is well in{" "}
                {selectedDistrictId
                  ? districts.find((d) => d._id === selectedDistrictId)?.name
                  : "your district"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-3">
                    {/* Type Badge */}
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getNotificationBadgeColor(
                          notification.type,
                          notification.priority,
                        )}`}
                      >
                        {formatType(notification.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-[#1E3A5F] line-clamp-2">
                          {notification.title}
                        </h3>
                        {(notification.priority === "critical" ||
                          notification.priority === "high") && (
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded flex-shrink-0">
                            {notification.priority.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {notification.body && (
                        <p className="text-gray-700 text-sm line-clamp-2 mb-2">
                          {notification.body}
                        </p>
                      )}

                      <p className="text-[#2563EB] text-xs font-medium">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestNotifications;
