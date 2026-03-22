import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import * as api from "../../lib/api";
import type {
  HeadAdminDepartment,
  HeadAdminDepartmentAdmin,
} from "../../lib/api";
import { INDIAN_STATES } from "../../lib/indianStates";


export default function HeadAdminDashboardPage() {
  const [departments, setDepartments] = useState<HeadAdminDepartment[]>([]);
  const [admins, setAdmins] = useState<HeadAdminDepartmentAdmin[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [selectedState, setSelectedState] = useState(INDIAN_STATES[0]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [metaRes, adminsRes] = await Promise.all([
        api.getHeadAdminMeta(),
        api.getDepartmentAdmins(),
      ]);
      setDepartments(metaRes.departments);
      setAdmins(adminsRes.admins);

      if (!departmentId && metaRes.departments.length > 0) {
        setDepartmentId(metaRes.departments[0]._id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate username & password when state or department changes
  useEffect(() => {
    if (departmentId && selectedState) {
      const dept = departments.find((d) => d._id === departmentId);
      if (dept) {
        const dName = dept.name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        const sName = selectedState.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        setUsername(`${sName}_${dName}`);
        setPassword(`${sName}_${dName}_123`);
        setName(`${selectedState} ${dept.name} Admin`);
      }
    } else {
      setUsername("");
      setPassword("");
      setName("");
    }
  }, [departmentId, selectedState, departments]);

  const adminsByKey = useMemo(() => {
    const map = new Map<string, HeadAdminDepartmentAdmin>();
    admins.forEach((admin) => {
      if (admin.department?._id && admin.district?.name) {
        map.set(`${admin.department._id}_${admin.district.name}`, admin);
      }
    });
    return map;
  }, [admins]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!departmentId || !selectedState || !username.trim() || !password) {
      setError("State, Department, username and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createDepartmentAdmin({
        departmentId,
        stateName: selectedState,
        username: username.trim(),
        password,
        name: name.trim() || undefined,
      });
      setMessage(res.message);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create department admin.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (adminId: string) => {
    setDeletingId(adminId);
    setMessage("");
    setError("");
    try {
      const res = await api.removeDepartmentAdmin(adminId);
      setMessage(res.message);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove admin.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Head Admin Dashboard</h1>

      {message && <p className="mb-4 text-sm text-green-700 bg-green-50 rounded-lg p-3">{message}</p>}
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={(e) => void handleCreate(e)} className="bg-white rounded-2xl p-5 shadow-sm lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Create Department Admin</h2>
          </div>

          <label className="block text-sm text-gray-600 mb-1">State</label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            disabled={loading || submitting}
            className="w-full border rounded-lg px-3 py-2 mb-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-300 outline-none"
          >
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <label className="block text-sm text-gray-600 mb-1">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={loading || submitting}
            className="w-full border rounded-lg px-3 py-2 mb-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-300 outline-none"
          >
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>

          {departmentId && selectedState && adminsByKey.has(`${departmentId}_${selectedState}`) && (
            <p className="mb-3 text-xs text-amber-700 bg-amber-50 rounded p-2">
              This department already has an active admin in this state.
            </p>
          )}

          <label className="block text-sm text-gray-600 mb-1">Admin Name</label>
          <input
            value={name}
            readOnly
            disabled={submitting}
            className="w-full border rounded-lg px-3 py-2 mb-3 bg-gray-100 text-gray-500 font-medium select-none"
            placeholder="Auto-generated"
          />

          <label className="block text-sm text-gray-600 mb-1">Auto-Generated Username</label>
          <input
            value={username}
            readOnly
            disabled={submitting}
            className="w-full border rounded-lg px-3 py-2 mb-3 bg-gray-100 text-gray-500 font-medium select-none"
            placeholder="Auto-generated"
          />

          <label className="block text-sm text-gray-600 mb-1">Auto-Generated Password</label>
          <input
            type="text"
            value={password}
            readOnly
            disabled={submitting}
            className="w-full border rounded-lg px-3 py-2 mb-4 bg-gray-100 text-gray-500 font-medium select-none"
            placeholder="Auto-generated"
          />

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full bg-[#1E3A5F] text-white rounded-lg py-2.5 font-medium hover:bg-[#17304f] disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Admin"}
          </button>
        </form>

        <div className="bg-white rounded-2xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Current Department Admins</h2>
            <p className="text-xs text-gray-500">{admins.length} active</p>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-gray-500 gap-2">
              <Loader2 className="animate-spin" size={18} /> Loading...
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-gray-500">No department admins found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b">
                    <th className="py-2">Department</th>
                    <th className="py-2">State</th>
                    <th className="py-2">Username</th>
                    <th className="py-2">Created</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin._id} className="border-b last:border-b-0">
                      <td className="py-3 font-medium text-gray-800">
                        {admin.department?.name} ({admin.department?.code})
                      </td>
                      <td className="py-3 text-gray-600 font-medium">{admin.district?.name}</td>
                      <td className="py-3 text-gray-600">{admin.username}</td>
                      <td className="py-3 text-gray-600">
                        {new Date(admin.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => void handleRemove(admin._id)}
                          disabled={deletingId === admin._id}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          {deletingId === admin._id ? "Removing..." : "Remove"}
                        </button>
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
