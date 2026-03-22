import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle, Settings, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as api from "../../lib/api";
import type { AdminStats, AdminComplaint } from "../../lib/api";
import { useNotificationStore } from "../../store/notificationStore";

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  acknowledged: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  escalated: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recent, setRecent] = useState<AdminComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, complaintsRes] = await Promise.all([
          api.getAdminStats(),
          api.getAdminComplaints({ page: 1 }),
        ]);
        setStats(statsRes.stats);
        setRecent(complaintsRes.complaints.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const statCards = stats
    ? [
        {
          label: "Total Complaints",
          val: stats.totalComplaints,
          icon: FileText,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Submitted",
          val: stats.submitted,
          icon: Clock,
          color: "text-yellow-600",
          bg: "bg-yellow-50",
        },
        {
          label: "Resolved",
          val: stats.resolved,
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: "Service Requests",
          val: stats.totalSR,
          icon: Settings,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
      ]
    : [];

  const statusBreakdown = stats
    ? [
        { label: "Submitted", count: stats.submitted, color: "bg-yellow-400" },
        { label: "In Progress", count: stats.inProgress, color: "bg-blue-400" },
        { label: "Resolved", count: stats.resolved, color: "bg-green-400" },
        { label: "Rejected", count: stats.rejected, color: "bg-red-400" },
      ]
    : [];

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 font-display mb-6">
        Admin Dashboard
      </h1>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
          <Loader2 size={20} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {statCards.map(({ label, val, icon: Icon, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl p-5 shadow-sm"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-3`}
                >
                  <Icon size={22} className={color} />
                </div>
                <p className="text-3xl font-black text-gray-800">{val}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Status Breakdown */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-4 text-sm">
                Status Overview
              </h2>
              <div className="space-y-3">
                {statusBreakdown.map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${color} shrink-0`} />
                    <span className="text-xs text-gray-600 flex-1">
                      {label}
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution rate */}
            <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center">
              <h2 className="font-bold text-gray-700 mb-4 text-sm self-start">
                Resolution Rate
              </h2>
              {stats && stats.totalComplaints > 0 ? (
                <>
                  <div className="text-5xl font-black text-green-600">
                    {Math.round((stats.resolved / stats.totalComplaints) * 100)}
                    %
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {stats.resolved} of {stats.totalComplaints} resolved
                  </p>
                </>
              ) : (
                <p className="text-gray-400 text-sm">No data yet</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-4 text-sm">
                Quick Actions
              </h2>
              <div className="space-y-2">
                {[
                  {
                    label: "View All Complaints",
                    to: "/admin/complaints",
                    bg: "bg-blue-600",
                  },
                  { label: "Service Requests", to: "/admin/requests", bg: "bg-purple-600" },
                  { label: "Manage Bills", to: "/admin/bills", bg: "bg-indigo-600" },
                  {
                    label: "Push Notification",
                    to: "/admin/notifications",
                    bg: "bg-orange-500",
                  },
                  {
                    label: `Unread Alerts (${unreadCount})`,
                    to: "/admin/notifications",
                    bg: "bg-red-500",
                  },
                ].map(({ label, to, bg }) => (
                  <button
                    key={label}
                    onClick={() => navigate(to)}
                    className={`w-full ${bg} text-white text-xs font-semibold py-2 px-3 rounded-xl hover:opacity-90 transition-opacity text-left`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Complaints */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-50">
              <h2 className="font-bold text-gray-700">Recent Complaints</h2>
              <button
                onClick={() => navigate("/admin/complaints")}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                View All →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase">
                    {[
                      "Ref No",
                      "Citizen",
                      "Department / Category",
                      "Urgency",
                      "Status",
                      "Date",
                    ].map((h) => (
                      <th key={h} className="text-left px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c, i) => (
                    <tr
                      key={c._id}
                      className={`border-t border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">
                        {c.referenceNumber}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-800 text-xs">
                        {c.userId?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <span className="text-gray-400">
                          {c.department?.name}
                        </span>
                        <span className="text-gray-700"> / {c.category}</span>
                      </td>
                      <td
                        className={`px-5 py-3 text-xs font-bold capitalize ${c.urgency === "high" ? "text-red-500" : c.urgency === "medium" ? "text-yellow-500" : "text-green-500"}`}
                      >
                        {c.urgency}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-[11px] px-2 py-1 rounded-full font-semibold capitalize ${STATUS_BADGE[c.status] ?? ""}`}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(c.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recent.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  No complaints received yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

