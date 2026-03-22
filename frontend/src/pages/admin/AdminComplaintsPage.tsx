import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import * as api from "../../lib/api";
import type { AdminComplaint } from "../../lib/api";

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  acknowledged: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  escalated: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const URGENCY_BADGE: Record<string, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-red-600",
};

const TRANSITION_ACTIONS: { label: string; status: string; color: string }[] = [
  { label: "Acknowledge", status: "acknowledged", color: "bg-blue-600" },
  { label: "In Progress", status: "in_progress", color: "bg-indigo-600" },
  { label: "Resolve", status: "resolved", color: "bg-green-600" },
  { label: "Reject", status: "rejected", color: "bg-red-600" },
];

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalPages = Math.ceil(total / 20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminComplaints({
        status: filterStatus !== "all" ? filterStatus : undefined,
        urgency: filterUrgency !== "all" ? filterUrgency : undefined,
        search: search || undefined,
        page,
      });
      setComplaints(res.complaints);
      setTotal(res.pagination.total);
    } catch {
      /* handled silently — table stays empty */
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterUrgency, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (id: string, status: string) => {
    setActionLoading(id + status);
    try {
      await api.updateComplaintStatus(id, status);
      void load(); // refresh
    } catch {
      /* noop */
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async (id: string) => {
    setActionLoading(id + "critical");
    try {
      await api.escalateComplaintPriority(id, "critical");
      void load();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800 font-display">
          All Complaints
          {total > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({total} total)
            </span>
          )}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search ref, category, description…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none"
          >
            <option value="all">All Status</option>
            {[
              "submitted",
              "acknowledged",
              "in_progress",
              "escalated",
              "resolved",
              "rejected",
            ].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <select
          value={filterUrgency}
          onChange={(e) => {
            setFilterUrgency(e.target.value);
            setPage(1);
          }}
          className="border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none"
        >
          <option value="all">All Urgency</option>
          {["low", "medium", "high"].map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase">
                  {[
                    "Ref No",
                    "Citizen",
                    "Dept / Category",
                    "Urgency",
                    "Date",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map((c, i) => (
                  <>
                    <motion.tr
                      key={c._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() =>
                        setExpanded(expanded === c._id ? null : c._id)
                      }
                      className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {c.referenceNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs">
                          {c.userId?.name ?? "—"}
                        </p>
                        <p className="text-gray-400 text-[11px]">
                          {c.userId?.mobile ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-500">
                          {c.department?.name}
                        </p>
                        <p className="text-xs text-gray-700">{c.category}</p>
                      </td>
                      <td
                        className={`px-4 py-3 text-xs font-bold capitalize ${URGENCY_BADGE[c.urgency] ?? ""}`}
                      >
                        {c.urgency}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] px-2 py-1 rounded-full font-semibold capitalize ${STATUS_BADGE[c.status] ?? ""}`}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap gap-1">
                          {TRANSITION_ACTIONS.filter(
                            (a) => a.status !== c.status,
                          ).map(({ label, status, color }) => (
                            <button
                              key={status}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(c._id, status)}
                              className={`${color} text-white text-[10px] font-semibold px-2 py-1 rounded-lg hover:opacity-80 disabled:opacity-50`}
                            >
                              {actionLoading === c._id + status ? "…" : label}
                            </button>
                          ))}
                          {c.priority !== "critical" && (
                            <button
                              disabled={!!actionLoading}
                              onClick={() => handleEscalate(c._id)}
                              className="bg-orange-500 text-white text-[10px] font-semibold px-2 py-1 rounded-lg hover:opacity-80 flex items-center gap-0.5 disabled:opacity-50"
                            >
                              <AlertTriangle size={10} /> Escalate
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                    {expanded === c._id && (
                      <tr key={`${c._id}-exp`} className="bg-blue-50/40">
                        <td colSpan={7} className="px-6 py-4">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Description:</strong> {c.description}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            <strong>Address:</strong> {c.address?.street},{" "}
                            {c.address?.city}, {c.address?.state} —{" "}
                            {c.address?.pincode}
                          </p>
                          {c.statusHistory?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-gray-500 mb-1">
                                Status History
                              </p>
                              <div className="flex flex-col gap-1">
                                {c.statusHistory.map((h, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-gray-500 flex gap-2"
                                  >
                                    <span className="font-mono">
                                      {new Date(h.timestamp).toLocaleString(
                                        "en-IN",
                                      )}
                                    </span>
                                    <span
                                      className={`font-semibold ${STATUS_BADGE[h.status]?.split(" ")[1] ?? ""}`}
                                    >
                                      {h.status}
                                    </span>
                                    {h.note && <span>— {h.note}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && complaints.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No complaints match your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-40"
          >
            <ChevronDown size={14} />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-40"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
