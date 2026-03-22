import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import * as api from "../../lib/api";
import type { AdminServiceRequest } from "../../lib/api";

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  under_review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  processing: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const TRANSITION_ACTIONS: { label: string; status: string; color: string }[] = [
  { label: "Review", status: "under_review", color: "bg-blue-600" },
  { label: "Approve", status: "approved", color: "bg-green-600" },
  { label: "Processing", status: "processing", color: "bg-indigo-600" },
  { label: "Complete", status: "completed", color: "bg-emerald-600" },
  { label: "Reject", status: "rejected", color: "bg-red-600" },
];

export default function AdminServiceRequestsPage() {
  const [requests, setRequests] = useState<AdminServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminServiceRequests({
        status: filterStatus !== "all" ? filterStatus : undefined,
        search: search || undefined,
        page,
      });
      setRequests(res.serviceRequests);
      setTotal(res.pagination.total);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (id: string, status: string) => {
    setActionLoading(id + status);
    try {
      await api.updateServiceRequestStatus(id, status);
      void load();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800 font-display">
          Service Requests
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
            placeholder="Search ref no, applicant, service type…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
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
            "under_review",
            "approved",
            "processing",
            "completed",
            "rejected",
          ].map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
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
                    "Applicant",
                    "Service",
                    "Address",
                    "Applied",
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
                {requests.map((sr, i) => (
                  <motion.tr
                    key={sr._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-t border-gray-50 hover:bg-blue-50/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {sr.referenceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs">
                        {sr.applicantName}
                      </p>
                      <p className="text-gray-400 text-[11px]">
                        {sr.contactPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3 capitalize font-medium text-gray-700 text-xs">
                      <span>{sr.department?.name ?? sr.serviceType}</span>
                      <p className="text-[11px] text-gray-400">
                        {sr.requestType?.replace("_", " ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">
                      {sr.address?.city}, {sr.address?.state}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(sr.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-1 rounded-full font-semibold capitalize ${STATUS_BADGE[sr.status] ?? ""}`}
                      >
                        {sr.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {TRANSITION_ACTIONS.filter(
                          (a) => a.status !== sr.status,
                        ).map(({ label, status, color }) => (
                          <button
                            key={status}
                            disabled={!!actionLoading}
                            onClick={() => handleAction(sr._id, status)}
                            className={`${color} text-white text-[10px] font-semibold px-2 py-1 rounded-lg hover:opacity-80 disabled:opacity-50`}
                          >
                            {actionLoading === sr._id + status ? "…" : label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && requests.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No service requests found.
          </div>
        )}
      </div>
    </div>
  );
}
