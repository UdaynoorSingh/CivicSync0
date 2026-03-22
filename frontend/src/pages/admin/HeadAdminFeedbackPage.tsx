import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import * as api from "../../lib/api";
import type { HeadAdminFeedback } from "../../lib/api";

export default function HeadAdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<HeadAdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getHeadAdminFeedbacks(1);
        setFeedbacks(res.feedbacks);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load feedbacks.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Feedback Dashboard</h1>

      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        {loading ? (
          <div className="py-12 flex items-center justify-center text-gray-500 gap-2">
            <Loader2 className="animate-spin" size={18} /> Loading feedbacks...
          </div>
        ) : feedbacks.length === 0 ? (
          <p className="text-sm text-gray-500">No feedbacks found yet.</p>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div key={fb._id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {fb.userId?.name ?? "Citizen"} ({fb.userId?.mobile ?? "N/A"})
                  </p>
                  <div className="inline-flex items-center gap-1 text-amber-600 text-sm font-semibold">
                    <Star size={14} fill="currentColor" /> {fb.overallRating}/5
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-1">
                  {fb.department?.name ?? "Department"} | {fb.district?.name ?? "District"} | {fb.trigger}
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  {new Date(fb.createdAt).toLocaleString("en-IN")}
                </p>

                {fb.comment && <p className="text-sm text-gray-700">{fb.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
