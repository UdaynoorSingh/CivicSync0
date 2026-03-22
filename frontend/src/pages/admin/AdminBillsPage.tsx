import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import * as api from "../../lib/api";
import type { AdminBill, AdminBillDepartment, AdminBillUser } from "../../lib/api";
import { useSessionStore } from "../../store/sessionStore";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
};

export default function AdminBillsPage() {
  const { role, user } = useSessionStore();
  const [users, setUsers] = useState<AdminBillUser[]>([]);
  const [departments, setDepartments] = useState<AdminBillDepartment[]>([]);
  const [bills, setBills] = useState<AdminBill[]>([]);

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [filterUser, setFilterUser] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState<
    "pending" | "paid" | "overdue" | "all"
  >("pending");
  const [search, setSearch] = useState("");

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentAdminDepartmentId = useMemo(() => {
    if (role !== "admin") return null;
    const department = user?.department;
    if (!department) return null;
    if (typeof department === "string") return department;
    if (
      typeof department === "object" &&
      department !== null &&
      "_id" in department
    ) {
      const id = (department as { _id?: unknown })._id;
      return typeof id === "string" ? id : null;
    }
    return null;
  }, [role, user?.department]);
  const isDepartmentLocked = role === "admin" && Boolean(currentAdminDepartmentId);

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const res = await api.getAdminBillMeta();
      setUsers(res.users);
      setDepartments(res.departments);

      if (isDepartmentLocked && currentAdminDepartmentId) {
        const scopedDepartment = res.departments.find(
          (d) => d._id === currentAdminDepartmentId,
        );
        const departmentId = scopedDepartment?._id ?? res.departments[0]?._id ?? "";
        setSelectedDepartment(departmentId);
        setFilterDepartment(departmentId || "all");
      } else if (!selectedDepartment && res.departments.length === 1) {
        setSelectedDepartment(res.departments[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bill metadata.");
    } finally {
      setLoadingMeta(false);
    }
  };

  const loadBills = async () => {
    setLoadingBills(true);
    try {
      const res = await api.getAdminBills({
        status: filterStatus,
        userId: filterUser !== "all" ? filterUser : undefined,
        departmentId: filterDepartment !== "all" ? filterDepartment : undefined,
        search: search || undefined,
      });
      setBills(res.bills);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills.");
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    void loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUser, filterDepartment, filterStatus]);

  const usersById = useMemo(() => new Map(users.map((u) => [u._id, u])), [users]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const effectiveDepartmentId = isDepartmentLocked
      ? currentAdminDepartmentId || selectedDepartment
      : selectedDepartment;

    if (!selectedUser || !effectiveDepartmentId || !amount) {
      setError("Please select user, department and amount.");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createAdminBill({
        userId: selectedUser,
        departmentId: effectiveDepartmentId,
        amount: numericAmount,
        dueDate: dueDate || undefined,
      });

      setMessage("Bill created successfully.");
      setAmount("");
      setDueDate("");
      await loadBills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bill.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 font-display mb-6">Bills</h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className="xl:col-span-1 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Create Bill</h2>

          {loadingMeta ? (
            <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
              <Loader2 size={18} className="animate-spin" /> Loading...
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleCreate}>
              <div>
                <label className="block text-xs text-gray-600 mb-1">User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {`${u.mobile}${u.name ? ` - ${u.name}` : ""}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  disabled={isDepartmentLocked}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                <option key={d._id} value={d._id}>{`${d.name} (${d.code})`}</option>
                  ))}
                </select>
                {isDepartmentLocked && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Department is locked to your admin assignment.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Amount (INR)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Enter payable amount"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Bill"}
              </button>
            </form>
          )}
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-gray-700">Bills</h2>
            <button
              onClick={() => void loadBills()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
            <div className="relative md:col-span-2">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bill no or connection..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
            </div>

            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="all">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.mobile}
                </option>
              ))}
            </select>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              disabled={isDepartmentLocked}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as "pending" | "paid" | "overdue" | "all",
                )
              }
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
              <option value="all">All</option>
            </select>
          </div>

          {loadingBills ? (
            <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
              <Loader2 size={18} className="animate-spin" /> Loading...
            </div>
          ) : bills.length === 0 ? (
            <div className="text-sm text-gray-500 py-10 text-center">
              No bills found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase">
                    {["Bill No", "User", "Department", "Amount", "Due Date", "Status"].map(
                      (h) => (
                        <th key={h} className="text-left px-4 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b._id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">
                        {b.billNumber}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-800">
                        <div className="font-medium">
                          {b.userId?.name ?? usersById.get(b.userId?._id || "")?.name ?? "-"}
                        </div>
                        <div className="text-gray-400">{b.userId?.mobile ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {b.department?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800">
                        Rs {Number(b.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(b.dueDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] px-2 py-1 rounded-full font-semibold capitalize ${
                            STATUS_BADGE[b.status] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
